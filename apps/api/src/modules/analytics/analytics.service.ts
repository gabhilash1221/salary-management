import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Employee, SalaryRecord } from '@prisma/client';
import { analyticsDefinition } from '../../common/reference-data';
import { utcToday } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveCurrentSalary } from '../salary/salary.domain';
import {
  buildDistribution,
  type Dimension,
  includedStatuses,
  rankByAverage,
  type SalaryFact,
  type SummaryRow,
  summarize,
} from './stats';

export type AnalyticsFilters = {
  department?: string;
  country?: string;
  status?: string;
  currency?: string;
  groupBy?: Dimension[];
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  minGroupSize() {
    const parsed = Number(
      this.config.get<string>('ANALYTICS_MIN_GROUP_SIZE') ?? 5,
    );
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 5;
  }

  async summary(filters: AnalyticsFilters) {
    const groupBy = filters.groupBy ?? [];
    const facts = await this.loadFacts(filters, groupBy);
    return {
      groupBy,
      minGroupSize: this.minGroupSize(),
      definition: analyticsDefinition(this.minGroupSize()),
      results: summarize(facts, groupBy, this.minGroupSize()),
    };
  }

  async distribution(filters: AnalyticsFilters) {
    const facts = await this.loadFacts(filters, []);
    return {
      definition: `${analyticsDefinition(this.minGroupSize())} Distribution buckets are ${5_000_000} minor units wide and half-open.`,
      results: buildDistribution(facts),
    };
  }

  async rank(filters: AnalyticsFilters, direction: 'highest' | 'lowest') {
    const summary = await this.summary({ ...filters, groupBy: ['department'] });
    return {
      ...summary,
      results: rankByAverage(summary.results, direction),
    };
  }

  async currentSalary(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId },
      include: { salaryRecords: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    const current = resolveCurrentSalary(employee.salaryRecords, utcToday());
    return {
      employeeId,
      currency: current?.currency ?? null,
      currentSalary: current ? toPublicSalary(current) : null,
      definition:
        'Current annual base salary for one employee. This lookup is exempt from group suppression.',
    };
  }

  private async loadFacts(
    filters: AnalyticsFilters,
    groupBy: Dimension[],
  ): Promise<SalaryFact[]> {
    const statuses = includedStatuses(filters.status, groupBy);
    const employees = await this.prisma.employee.findMany({
      where: {
        department: filters.department,
        country: filters.country,
        status: statuses ? { in: statuses } : undefined,
      },
      include: { salaryRecords: true },
    });
    const today = utcToday();
    const facts: SalaryFact[] = [];
    for (const employee of employees) {
      const current = resolveCurrentSalary(employee.salaryRecords, today);
      if (!current) continue;
      if (filters.currency && current.currency !== filters.currency) continue;
      facts.push(toFact(employee, current));
    }
    return facts;
  }
}

function toFact(employee: Employee, salary: SalaryRecord): SalaryFact {
  return {
    employeeId: employee.employeeId,
    department: employee.department,
    country: employee.country,
    status: employee.status,
    currency: salary.currency,
    amountMinor: salary.amountMinor,
  };
}

function toPublicSalary(record: SalaryRecord) {
  return {
    amountMinor: record.amountMinor,
    currency: record.currency,
    effectiveDate: record.effectiveDate.toISOString().slice(0, 10),
    reason: record.reason,
  };
}

export type { SummaryRow };
