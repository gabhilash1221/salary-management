import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { type RoleName, SALARY_FIELD_ROLES } from '../../common/reference-data';
import { utcToday } from '../../common/utils/dates';
import { resolvePagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveCurrentSalary } from '../salary/salary.domain';
import { toSalary } from '../salary/salary.service';

export type EmployeeQuery = {
  search?: string;
  department?: string;
  country?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'employeeId' | 'department' | 'hireDate';
  order?: 'asc' | 'desc';
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EmployeeQuery, role: RoleName) {
    const pagination = resolvePagination(query.page ?? 1, query.pageSize ?? 25);
    const where = this.where(query);
    const order = query.order ?? 'asc';
    const [total, employees] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        orderBy: orderBy(query.sort ?? 'name', order),
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
  if (sort === 'hireDate') return [{ hireDate: order }, { employeeId: 'asc' }];
  return [{ lastName: order }, { firstName: order }, { employeeId: 'asc' }];
}
