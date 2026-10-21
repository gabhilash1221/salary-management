import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { type RoleName, SALARY_FIELD_ROLES } from '../../common/reference-data';
import { formatIsoDate, utcToday } from '../../common/utils/dates';
import { resolvePagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';
import { resolveCurrentSalary } from '../salary/salary.domain';
import { toSalary } from '../salary/salary.service';
import { allocateEmployeeId } from './employee-import.validate';
import {
  type EmployeeProfile,
  type EmployeeProfileInput,
  parseEmployeeProfile,
} from './employee-profile';

export type EmployeeQuery = {
  search?: string;
  department?: string;
  country?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?:
    | 'name'
    | 'employeeId'
    | 'department'
    | 'country'
    | 'status'
    | 'hireDate'
    | 'salary';
  order?: 'asc' | 'desc';
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EmployeeQuery, role: RoleName) {
    const pagination = resolvePagination(query.page ?? 1, query.pageSize ?? 25);
    const where = this.where(query);
    const order = query.order ?? 'asc';
    const sort =
      query.sort === 'salary' && !SALARY_FIELD_ROLES.includes(role)
        ? 'name'
        : (query.sort ?? 'name');
    if (sort === 'salary') {
      return this.listByCurrentSalary(where, order, pagination, role);
    }
    const [total, employees] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        orderBy: orderBy(sort, order),
        skip: pagination.skip,
        take: pagination.pageSize,
        include: { salaryRecords: true },
      }),
    ]);

    return {
      items: employees.map((employee) => this.toListItem(employee, role)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async get(employeeId: string, role: RoleName) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId },
      include: { salaryRecords: true },
    });
    if (!employee) {
      return null;
    }
    return this.toListItem(employee, role);
  }

  async create(
    input: EmployeeProfileInput,
    actor: AuthUser,
    requestId?: string,
  ) {
    const parsed = parseEmployeeProfile(input, 'create');
    if (!parsed.ok) {
      throw new BadRequestException(parsed.messages.join(' '));
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const employeeId = await this.resolveEmployeeId(tx, parsed.profile);
        const now = new Date();
        const employee = await tx.employee.create({
          data: {
            id: `emp_${randomUUID()}`,
            employeeId,
            ...this.profileData(parsed.profile),
            version: 1,
            createdAt: now,
            updatedAt: now,
          },
          include: { salaryRecords: true },
        });
        await tx.auditLog.create({
          data: this.audit(actor, requestId, {
            action: 'EMPLOYEE_CREATE',
            entityId: employeeId,
            oldValue: null,
            newValue: this.snapshot(parsed.profile, employeeId),
          }),
        });
        return this.toListItem(employee, actor.role);
      });
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(
    employeeId: string,
    input: EmployeeProfileInput & { version: number },
    actor: AuthUser,
    requestId?: string,
  ) {
    const parsed = parseEmployeeProfile(input, 'update');
    if (!parsed.ok) {
      throw new BadRequestException(parsed.messages.join(' '));
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.employee.findUnique({
          where: { employeeId },
          include: { salaryRecords: true },
        });
        if (!existing) {
          throw new NotFoundException('Employee not found');
        }
        if (existing.version !== input.version) {
          throw new ConflictException(
            'This employee was updated by someone else. Refresh and try again.',
          );
        }
        const earliest = existing.salaryRecords.reduce<Date | null>(
          (lowest, record) =>
            !lowest || record.effectiveDate.getTime() < lowest.getTime()
              ? record.effectiveDate
              : lowest,
          null,
        );
        if (
          earliest &&
          parsed.profile.hireDate.getTime() > earliest.getTime()
        ) {
          throw new BadRequestException(
            'Hire date cannot be later than an existing salary effective date',
          );
        }
        const claimed = await tx.employee.updateMany({
          where: { employeeId, version: input.version },
          data: {
            ...this.profileData(parsed.profile),
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          throw new ConflictException(
            'This employee was updated by someone else. Refresh and try again.',
          );
        }
        await tx.auditLog.create({
          data: this.audit(actor, requestId, {
            action: 'EMPLOYEE_UPDATE',
            entityId: employeeId,
            oldValue: JSON.stringify({
              email: existing.email,
              department: existing.department,
              country: existing.country,
              jobTitle: existing.jobTitle,
              status: existing.status,
              hireDate: formatIsoDate(existing.hireDate),
              terminationDate: existing.terminationDate
                ? formatIsoDate(existing.terminationDate)
                : null,
            }),
            newValue: this.snapshot(parsed.profile, employeeId),
          }),
        });
        const employee = await tx.employee.findUniqueOrThrow({
          where: { employeeId },
          include: { salaryRecords: true },
        });
        return this.toListItem(employee, actor.role);
      });
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async remove(
    employeeId: string,
    version: number,
    actor: AuthUser,
    requestId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.employee.findUnique({
        where: { employeeId },
      });
      if (!existing) {
        throw new NotFoundException('Employee not found');
      }
      await tx.salaryRecord.deleteMany({ where: { employeeId } });
      const removed = await tx.employee.deleteMany({
        where: { employeeId, version },
      });
      if (removed.count !== 1) {
        throw new ConflictException(
          'This employee was updated by someone else. Refresh and try again.',
        );
      }
      await tx.auditLog.create({
        data: this.audit(actor, requestId, {
          action: 'EMPLOYEE_DELETE',
          entityId: employeeId,
          oldValue: JSON.stringify({
            email: existing.email,
            department: existing.department,
            country: existing.country,
            status: existing.status,
            hireDate: formatIsoDate(existing.hireDate),
          }),
          newValue: null,
        }),
      });
      return { employeeId };
    });
  }

  private async listByCurrentSalary(
    where: Prisma.EmployeeWhereInput,
    order: 'asc' | 'desc',
    pagination: { page: number; pageSize: number; skip: number },
    role: RoleName,
  ) {
    const today = utcToday();
    const [total, people, records] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        select: { employeeId: true },
      }),
      this.prisma.salaryRecord.findMany({
        where: { employee: where, effectiveDate: { lte: today } },
        select: { employeeId: true, amountMinor: true, effectiveDate: true },
      }),
    ]);
    const current = new Map<string, { amountMinor: number; at: number }>();
    for (const record of records) {
      const at = record.effectiveDate.getTime();
      const existing = current.get(record.employeeId);
      if (!existing || at > existing.at) {
        current.set(record.employeeId, { amountMinor: record.amountMinor, at });
      }
    }
    const direction = order === 'desc' ? -1 : 1;
    const pageIds = people
      .map((person) => ({
        employeeId: person.employeeId,
        amount: current.get(person.employeeId)?.amountMinor ?? null,
      }))
      .sort((left, right) => {
        if (left.amount === null && right.amount === null) {
          return left.employeeId.localeCompare(right.employeeId);
        }
        if (left.amount === null) return 1;
        if (right.amount === null) return -1;
        if (left.amount !== right.amount) {
          return (left.amount - right.amount) * direction;
        }
        return left.employeeId.localeCompare(right.employeeId);
      })
      .slice(pagination.skip, pagination.skip + pagination.pageSize)
      .map((person) => person.employeeId);
    if (pageIds.length === 0) {
      return {
        items: [],
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
    }
    const employees = await this.prisma.employee.findMany({
      where: { employeeId: { in: pageIds } },
      include: { salaryRecords: true },
    });
    const byId = new Map(
      employees.map((employee) => [employee.employeeId, employee]),
    );
    return {
      items: pageIds.flatMap((id) => {
        const employee = byId.get(id);
        return employee ? [this.toListItem(employee, role)] : [];
      }),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  private async resolveEmployeeId(
    tx: Prisma.TransactionClient,
    profile: EmployeeProfile,
  ): Promise<string> {
    if (profile.employeeId) return profile.employeeId;
    const existing = await tx.employee.findMany({
      select: { employeeId: true },
    });
    const employeeId = allocateEmployeeId(
      existing.map((employee) => employee.employeeId),
    );
    if (!employeeId) {
      throw new BadRequestException('No employee IDs remain');
    }
    return employeeId;
  }

  private profileData(profile: EmployeeProfile) {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      firstNameKey: profile.firstNameKey,
      lastNameKey: profile.lastNameKey,
      email: profile.email,
      department: profile.department,
      country: profile.country,
      jobTitle: profile.jobTitle,
      status: profile.status,
      hireDate: profile.hireDate,
      terminationDate: profile.terminationDate,
    };
  }

  private snapshot(profile: EmployeeProfile, employeeId: string): string {
    return JSON.stringify({
      employeeId,
      email: profile.email,
      department: profile.department,
      country: profile.country,
      jobTitle: profile.jobTitle,
      status: profile.status,
      hireDate: formatIsoDate(profile.hireDate),
      terminationDate: profile.terminationDate
        ? formatIsoDate(profile.terminationDate)
        : null,
    });
  }

  private audit(
    actor: AuthUser,
    requestId: string | undefined,
    entry: {
      action: string;
      entityId: string;
      oldValue: string | null;
      newValue: string | null;
    },
  ) {
    return {
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: entry.action,
      entityType: 'Employee',
      entityId: entry.entityId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      requestId: requestId ?? null,
    };
  }

  private rethrowUnique(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictException(
        'An employee with this ID or email already exists.',
      );
    }
    throw error;
  }

  private where(query: EmployeeQuery): Prisma.EmployeeWhereInput {
    const where: Prisma.EmployeeWhereInput = {};
    if (query.department) where.department = query.department;
    if (query.country) where.country = query.country;
    if (query.status) where.status = query.status;
    const search = query.search?.trim();
    if (search) {
      if (/^EMP-\d+$/.test(search)) {
        where.employeeId = search;
      } else {
        const key = search.toLocaleLowerCase('en-US');
        where.OR = [
          { firstNameKey: { contains: key } },
          { lastNameKey: { contains: key } },
        ];
      }
    }
    return where;
  }

  private toListItem(
    employee: Prisma.EmployeeGetPayload<{ include: { salaryRecords: true } }>,
    role: RoleName,
  ) {
    const base = {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department,
      country: employee.country,
      jobTitle: employee.jobTitle,
      status: employee.status,
      hireDate: employee.hireDate.toISOString().slice(0, 10),
      terminationDate: employee.terminationDate
        ? employee.terminationDate.toISOString().slice(0, 10)
        : null,
      version: employee.version,
    };
    if (!SALARY_FIELD_ROLES.includes(role)) {
      return base;
    }
    const current = resolveCurrentSalary(employee.salaryRecords, utcToday());
    return { ...base, currentSalary: current ? toSalary(current) : null };
  }
}

function orderBy(
  sort: NonNullable<EmployeeQuery['sort']>,
  order: 'asc' | 'desc',
): Prisma.EmployeeOrderByWithRelationInput[] {
  if (sort === 'employeeId') return [{ employeeId: order }];
  if (sort === 'department')
    return [{ department: order }, { employeeId: 'asc' }];
  if (sort === 'country') return [{ country: order }, { employeeId: 'asc' }];
  if (sort === 'status') return [{ status: order }, { employeeId: 'asc' }];
  if (sort === 'hireDate') return [{ hireDate: order }, { employeeId: 'asc' }];
  return [{ lastName: order }, { firstName: order }, { employeeId: 'asc' }];
}
