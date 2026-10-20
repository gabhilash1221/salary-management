import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SalaryRecord } from '@prisma/client';
import { formatIsoDate, utcToday } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';
import {
  assertAmount,
  assertCurrency,
  assertNextEffectiveDate,
  DomainError,
  resolveCurrentSalary,
} from './salary.domain';

@Injectable()
export class SalaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async current(employeeId: string) {
    const employee = await this.findEmployee(employeeId);
    const current = resolveCurrentSalary(employee.salaryRecords, utcToday());
    return {
      employeeId,
      version: employee.version,
      currentSalary: current ? toSalary(current) : null,
    };
  }

  async history(employeeId: string) {
    const employee = await this.findEmployee(employeeId);
    const records = [...employee.salaryRecords].sort(
      (left, right) =>
        right.effectiveDate.getTime() - left.effectiveDate.getTime(),
    );
    return { employeeId, records: records.map(toSalary) };
  }

  async update(
    employeeId: string,
    input: {
      amountMinor: number;
      currency: string;
      effectiveDate: string;
      version: number;
      reason?: string;
    },
    actor: AuthUser,
    requestId?: string,
  ) {
    try {
      assertCurrency(input.currency);
      assertAmount(input.amountMinor, this.maxAmount());
    } catch (error) {
      throw this.toHttp(error);
    }

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { employeeId },
        include: { salaryRecords: true },
      });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
      if (employee.version !== input.version) {
        throw new ConflictException(
          'This salary record was updated by someone else. Refresh and try again.',
        );
      }

      const latest =
        [...employee.salaryRecords].sort(
          (left, right) =>
            right.effectiveDate.getTime() - left.effectiveDate.getTime(),
        )[0] ?? null;
      let effectiveDate: Date;
      try {
        effectiveDate = assertNextEffectiveDate({
          effectiveDate: input.effectiveDate,
          hireDate: employee.hireDate,
          latestEffectiveDate: latest?.effectiveDate ?? null,
        });
      } catch (error) {
        throw this.toHttp(error);
      }

      const created = await tx.salaryRecord.create({
        data: {
          id: `sal_${randomUUID()}`,
          employeeId: employee.employeeId,
          amountMinor: input.amountMinor,
          currency: input.currency,
          effectiveDate,
          reason: input.reason ?? null,
          createdByUserId: actor.userId,
          createdAt: new Date(),
        },
      });
      const claimed = await tx.employee.updateMany({
        where: { employeeId, version: input.version },
        data: { version: { increment: 1 }, updatedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'This salary record was updated by someone else. Refresh and try again.',
        );
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: 'SALARY_UPDATE',
          entityType: 'Employee',
          entityId: employee.employeeId,
          oldValue: latest ? JSON.stringify(toSalary(latest)) : null,
          newValue: JSON.stringify(toSalary(created)),
          reason: input.reason ?? null,
          requestId: requestId ?? null,
        },
      });
      return { salary: toSalary(created), version: input.version + 1 };
    });
  }

  private maxAmount() {
    const parsed = Number(
      this.config.get<string>('MAX_AMOUNT_MINOR') ?? 10_000_000_000,
    );
    return Number.isFinite(parsed) ? parsed : 10_000_000_000;
  }

  private async findEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId },
      include: { salaryRecords: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  private toHttp(error: unknown) {
    if (error instanceof DomainError) {
      return new BadRequestException(error.message);
    }
    return error;
  }
}

export function toSalary(record: SalaryRecord) {
  return {
    id: record.id,
    amountMinor: record.amountMinor,
    currency: record.currency,
    effectiveDate: formatIsoDate(record.effectiveDate),
    reason: record.reason,
    createdAt: record.createdAt.toISOString(),
  };
}
