import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatIsoDate } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';
import {
  type ClassifiedRow,
  type EmployeeDraft,
  ImportFileError,
  type ImportReport,
  SQLITE_INT_MAX,
} from './employee-import.columns';
import { type ImportUpload, parseImportFile } from './employee-import.parse';
import { classifyRows } from './employee-import.validate';

const WRITE_BATCH = 200;

@Injectable()
export class EmployeeImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async preview(file: ImportUpload): Promise<ImportReport> {
    const classified = await this.classify(file);
    return toReport(classified, false);
  }

  async commit(
    file: ImportUpload,
    actor: AuthUser,
    requestId?: string,
  ): Promise<ImportReport> {
    const classified = await this.classify(file);
    const drafts = classified.flatMap((row) =>
      row.view.status === 'ready' && row.draft ? [row.draft] : [],
    );
    if (drafts.length > 0) {
      try {
        await this.insert(drafts, actor, requestId);
      } catch (error) {
        if (isUniqueConflict(error)) {
          throw new ConflictException(
            'Another import changed these employees. Preview the file again.',
          );
        }
        throw error;
      }
    }
    return toReport(classified, true);
  }

  private async classify(file: ImportUpload): Promise<ClassifiedRow[]> {
    let rows: Awaited<ReturnType<typeof parseImportFile>>;
    try {
      rows = await parseImportFile(file);
    } catch (error) {
      if (error instanceof ImportFileError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    const existing = await this.loadExisting();
    return classifyRows(rows, existing, this.amountCap());
  }

  private async loadExisting(): Promise<{
    ids: Set<string>;
    emails: Set<string>;
  }> {
    const ids = new Set<string>();
    const emails = new Set<string>();
    const pageSize = 1000;
    let cursor: string | undefined;
    for (;;) {
      const batch = await this.prisma.employee.findMany({
        select: { id: true, employeeId: true, email: true },
        orderBy: { id: 'asc' },
        take: pageSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const employee of batch) {
        ids.add(employee.employeeId);
        emails.add(employee.email.toLowerCase());
      }
      const last = batch[batch.length - 1];
      if (batch.length < pageSize || !last) break;
      cursor = last.id;
    }
    return { ids, emails };
  }

  private async insert(
    drafts: EmployeeDraft[],
    actor: AuthUser,
    requestId?: string,
  ) {
    const now = new Date();
    const employees = drafts.map((draft) => ({
      id: `emp_${randomUUID()}`,
      employeeId: draft.employeeId,
      firstName: draft.firstName,
      lastName: draft.lastName,
      firstNameKey: draft.firstNameKey,
      lastNameKey: draft.lastNameKey,
      email: draft.email,
      department: draft.department,
      country: draft.country,
      jobTitle: draft.jobTitle,
      status: draft.status,
      hireDate: draft.hireDate,
      terminationDate: draft.terminationDate,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }));
    const salaries = drafts.flatMap((draft) =>
      draft.salary
        ? [
            {
              id: `sal_${randomUUID()}`,
              employeeId: draft.employeeId,
              amountMinor: draft.salary.amountMinor,
              currency: draft.salary.currency,
              effectiveDate: draft.salary.effectiveDate,
              reason: draft.salary.reason,
              createdByUserId: actor.userId,
              createdAt: now,
            },
          ]
        : [],
    );
    const audits = drafts.flatMap((draft) => {
      const imported = {
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: 'EMPLOYEE_IMPORT',
        entityType: 'Employee',
        entityId: draft.employeeId,
        oldValue: null,
        newValue: JSON.stringify({
          email: draft.email,
          department: draft.department,
          country: draft.country,
          status: draft.status,
          hireDate: formatIsoDate(draft.hireDate),
        }),
        reason: 'Bulk import',
        requestId: requestId ?? null,
      };
      if (!draft.salary) return [imported];
      return [
        imported,
        {
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: 'SALARY_UPDATE',
          entityType: 'Employee',
          entityId: draft.employeeId,
          oldValue: null,
          newValue: JSON.stringify({
            amountMinor: draft.salary.amountMinor,
            currency: draft.salary.currency,
            effectiveDate: formatIsoDate(draft.salary.effectiveDate),
            reason: draft.salary.reason,
          }),
          reason: draft.salary.reason,
          requestId: requestId ?? null,
        },
      ];
    });

    await this.prisma.$transaction(
      async (tx) => {
        for (const batch of chunks(employees, WRITE_BATCH)) {
          await tx.employee.createMany({ data: batch });
        }
        for (const batch of chunks(salaries, WRITE_BATCH)) {
          await tx.salaryRecord.createMany({ data: batch });
        }
        for (const batch of chunks(audits, WRITE_BATCH)) {
          await tx.auditLog.createMany({ data: batch });
        }
      },
      { maxWait: 5_000, timeout: 30_000 },
    );
  }

  private amountCap(): number {
    const parsed = Number(
      this.config.get<string>('MAX_AMOUNT_MINOR') ?? 10_000_000_000,
    );
    const configured =
      Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000_000_000;
    return Math.min(configured, SQLITE_INT_MAX);
  }
}

function toReport(rows: ClassifiedRow[], imported: boolean): ImportReport {
  const valid = rows.filter((row) => row.view.status === 'ready').length;
  const views = rows.map((row) =>
    imported && row.view.status === 'ready'
      ? { ...row.view, status: 'imported' as const }
      : row.view,
  );
  return {
    total: views.length,
    valid,
    failed: views.filter((row) => row.status === 'failed').length,
    skipped: views.filter((row) => row.status === 'skipped').length,
    imported: imported ? valid : 0,
    rows: views,
  };
}

function chunks<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
