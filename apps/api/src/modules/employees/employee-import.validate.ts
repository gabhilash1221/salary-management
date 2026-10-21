import {
  COUNTRY_LOOKUP,
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
  foldName,
} from '../../common/reference-data';
import { formatIsoDate, parseIsoDate } from '../../common/utils/dates';
import {
  assertAmount,
  assertCurrency,
  assertNextEffectiveDate,
  DomainError,
} from '../salary/salary.domain';
import {
  type ClassifiedRow,
  type EmployeeDraft,
  IMPORT_HEADERS,
  IMPORT_LABELS,
  type ImportHeader,
  type ParsedRow,
  SQLITE_INT_MAX,
} from './employee-import.columns';

const FORMULA = /^[=+\-@]/;
const EMPLOYEE_ID = /^EMP-\d{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAJOR_AMOUNT = /^\d+(\.\d{1,2})?$/;

const DEPARTMENT_BY_KEY = new Map(
  DEPARTMENTS.map((department) => [department.toLowerCase(), department]),
);
const STATUS_BY_KEY = new Map(
  EMPLOYMENT_STATUSES.map((status) => [status.toLowerCase(), status]),
);

const SALARY_HEADERS: ImportHeader[] = [
  'annualAmount',
  'currency',
  'salaryEffectiveDate',
  'reason',
];

export function formatEmployeeId(sequence: number): string {
  return `EMP-${String(sequence).padStart(6, '0')}`;
}

export function nextEmployeeNumber(existingIds: Iterable<string>): number {
  let max = 0;
  for (const id of existingIds) {
    const match = EMPLOYEE_ID.exec(id);
    if (!match) continue;
    max = Math.max(max, Number(id.slice(4)));
  }
  return max + 1;
}

export function classifyRows(
  rows: ParsedRow[],
  existing: { ids: Set<string>; emails: Set<string> },
  maxAmountMinor: number,
): ClassifiedRow[] {
  const reservedIds = new Set(existing.ids);
  const reservedEmails = new Set(existing.emails);
  const sequence = { value: nextEmployeeNumber(existing.ids) };
  return rows.map((row) =>
    classifyOne(
      row,
      existing,
      reservedIds,
      reservedEmails,
      sequence,
      maxAmountMinor,
    ),
  );
}

function classifyOne(
  row: ParsedRow,
  existing: { ids: Set<string>; emails: Set<string> },
  reservedIds: Set<string>,
  reservedEmails: Set<string>,
  sequence: { value: number },
  maxAmountMinor: number,
): ClassifiedRow {
  const messages = fieldMessages(row.values, maxAmountMinor);
  const employeeId = row.values.employeeId;
  const email = row.values.email.toLowerCase();
  const base = {
    row: row.row,
    employeeId,
    firstName: row.values.firstName,
    lastName: row.values.lastName,
    email,
    department: row.values.department,
    messages,
  };

  if (messages.length > 0) {
    return { view: { ...base, status: 'failed' }, draft: null };
  }

  const duplicateMessages: string[] = [];
  if (employeeId !== '') {
    if (existing.ids.has(employeeId)) {
      duplicateMessages.push(`Employee ID ${employeeId} already exists`);
    } else if (reservedIds.has(employeeId)) {
      duplicateMessages.push(
        `Employee ID ${employeeId} is duplicated in this file`,
      );
    }
  }
  if (existing.emails.has(email)) {
    duplicateMessages.push(`Email ${email} already exists`);
  } else if (reservedEmails.has(email)) {
    duplicateMessages.push(`Email ${email} is duplicated in this file`);
  }
  if (duplicateMessages.length > 0) {
    return {
      view: { ...base, status: 'skipped', messages: duplicateMessages },
      draft: null,
    };
  }

  let resolvedId = employeeId;
  if (resolvedId === '') {
    const allocated = allocateId(reservedIds, sequence);
    if (!allocated) {
      return {
        view: {
          ...base,
          status: 'failed',
          messages: ['No employee IDs remain'],
        },
        draft: null,
      };
    }
    resolvedId = allocated;
  }

  const draft = toDraft(row.values, resolvedId, maxAmountMinor);
  if (!draft) {
    return {
      view: {
        ...base,
        status: 'failed',
        messages: ['Amount exceeds the configured maximum'],
      },
      draft: null,
    };
  }

  reservedIds.add(resolvedId);
  reservedEmails.add(email);
  return {
    view: {
      ...base,
      status: 'ready',
      employeeId: resolvedId,
      department: draft.department,
      messages: [],
    },
    draft,
  };
}

function fieldMessages(
  values: Record<ImportHeader, string>,
  maxAmountMinor: number,
): string[] {
  const messages: string[] = [];
  for (const name of IMPORT_HEADERS) {
    if (values[name] !== '' && FORMULA.test(values[name])) {
      messages.push(`${IMPORT_LABELS[name]} cannot start with =, +, -, or @`);
    }
  }
  if (messages.length > 0) return messages;

  if (values.employeeId !== '' && !EMPLOYEE_ID.test(values.employeeId)) {
    messages.push('Employee ID must look like EMP-000001');
  }
  if (values.firstName === '' || values.firstName.length > 100) {
    messages.push('First name is required and must be 100 characters or fewer');
  }
  if (values.lastName === '' || values.lastName.length > 100) {
    messages.push('Last name is required and must be 100 characters or fewer');
  }
  if (
    values.email === '' ||
    values.email.length > 254 ||
    !EMAIL.test(values.email)
  ) {
    messages.push('Email must be a valid address');
  }

  const department = DEPARTMENT_BY_KEY.get(values.department.toLowerCase());
  if (!department) {
    messages.push(`Department must be one of ${DEPARTMENTS.join(', ')}`);
  }
  const country = COUNTRY_LOOKUP[values.country.trim().toLowerCase()];
  if (!country) {
    messages.push('Country must be a supported country code or name');
  }
  if (values.jobTitle === '' || values.jobTitle.length > 80) {
    messages.push('Job title is required and must be 80 characters or fewer');
  }
  const status = STATUS_BY_KEY.get(values.status.toLowerCase());
  if (!status) {
    messages.push('Status must be Active, On Leave, or Terminated');
  }

  const hireDate = readDate(values.hireDate);
  if (!hireDate) messages.push('Hire date must be YYYY-MM-DD');
  const terminationDate =
    values.terminationDate === '' ? null : readDate(values.terminationDate);
  if (values.terminationDate !== '' && !terminationDate) {
    messages.push('Termination date must be YYYY-MM-DD');
  }
  if (status === 'Terminated' && !terminationDate) {
    messages.push('Terminated employees require a termination date');
  }
  if (status && status !== 'Terminated' && values.terminationDate !== '') {
    messages.push('Termination date is only allowed when status is Terminated');
  }
  if (
    hireDate &&
    terminationDate &&
    terminationDate.getTime() < hireDate.getTime()
  ) {
    messages.push('Termination date cannot be earlier than the hire date');
  }

  messages.push(...salaryMessages(values, hireDate, maxAmountMinor));
  return messages;
}

function salaryMessages(
  values: Record<ImportHeader, string>,
  hireDate: Date | null,
  maxAmountMinor: number,
): string[] {
  const provided = SALARY_HEADERS.some((name) => values[name] !== '');
  if (!provided) return [];
  const messages: string[] = [];
  if (values.annualAmount === '') {
    messages.push('Annual amount is required when salary details are provided');
  }
  if (values.currency === '') {
    messages.push('Currency is required when salary details are provided');
  }
  if (values.reason.length > 500) {
    messages.push('Reason must be 500 characters or fewer');
  }

  const amountMinor =
    values.annualAmount === '' ? null : parseMajorAmount(values.annualAmount);
  if (values.annualAmount !== '' && amountMinor === null) {
    messages.push(
      'Annual amount must be a positive number with up to 2 decimals',
    );
  }

  let currency = values.currency.toUpperCase();
  if (values.currency !== '') {
    try {
      assertCurrency(currency);
    } catch (error) {
      currency = '';
      messages.push(messageOf(error, 'Currency is invalid'));
    }
  }

  let effective = hireDate;
  if (values.salaryEffectiveDate !== '') {
    effective = readDate(values.salaryEffectiveDate);
    if (!effective) {
      messages.push('Salary effective date must be YYYY-MM-DD');
    }
  } else if (values.annualAmount !== '' && !hireDate) {
    messages.push('Salary effective date must be YYYY-MM-DD');
  }

  if (amountMinor !== null && currency !== '') {
    try {
      assertAmount(amountMinor, Math.min(maxAmountMinor, SQLITE_INT_MAX));
    } catch (error) {
      messages.push(messageOf(error, 'Annual amount is invalid'));
    }
  }
  if (hireDate && effective && messages.length === 0) {
    try {
      assertNextEffectiveDate({
        effectiveDate: formatIsoDate(effective),
        hireDate,
        latestEffectiveDate: null,
      });
    } catch (error) {
      messages.push(messageOf(error, 'Salary effective date is invalid'));
    }
  }
  return messages;
}

function toDraft(
  values: Record<ImportHeader, string>,
  employeeId: string,
  maxAmountMinor: number,
): EmployeeDraft | null {
  const department = DEPARTMENT_BY_KEY.get(values.department.toLowerCase());
  const country = COUNTRY_LOOKUP[values.country.trim().toLowerCase()];
  const status = STATUS_BY_KEY.get(values.status.toLowerCase());
  const hireDate = readDate(values.hireDate);
  if (!department || !country || !status || !hireDate) return null;
  const terminationDate =
    values.terminationDate === '' ? null : readDate(values.terminationDate);
  const salary = salaryDraft(values, hireDate, maxAmountMinor);
  if (salary === undefined) return null;

  return {
    employeeId,
    firstName: values.firstName,
    lastName: values.lastName,
    firstNameKey: foldName(values.firstName),
    lastNameKey: foldName(values.lastName),
    email: values.email.toLowerCase(),
    department,
    country,
    jobTitle: values.jobTitle,
    status,
    hireDate,
    terminationDate,
    salary,
  };
}

function salaryDraft(
  values: Record<ImportHeader, string>,
  hireDate: Date,
  maxAmountMinor: number,
): EmployeeDraft['salary'] | undefined {
  const provided = SALARY_HEADERS.some((name) => values[name] !== '');
  if (!provided) return null;
  const amountMinor = parseMajorAmount(values.annualAmount);
  if (amountMinor === null) return undefined;
  const cap = Math.min(maxAmountMinor, SQLITE_INT_MAX);
  try {
    assertAmount(amountMinor, cap);
    assertCurrency(values.currency.toUpperCase());
  } catch {
    return undefined;
  }
  const effective =
    values.salaryEffectiveDate === ''
      ? hireDate
      : readDate(values.salaryEffectiveDate);
  if (!effective) return undefined;
  return {
    amountMinor,
    currency: values.currency.toUpperCase(),
    effectiveDate: effective,
    reason: values.reason === '' ? null : values.reason,
  };
}

function allocateId(
  reservedIds: Set<string>,
  sequence: { value: number },
): string | null {
  while (
    sequence.value <= 999_999 &&
    reservedIds.has(formatEmployeeId(sequence.value))
  ) {
    sequence.value += 1;
  }
  if (sequence.value > 999_999) return null;
  const employeeId = formatEmployeeId(sequence.value);
  sequence.value += 1;
  return employeeId;
}

function parseMajorAmount(value: string): number | null {
  const cleaned = value.replaceAll(',', '').trim();
  if (!MAJOR_AMOUNT.test(cleaned)) return null;
  const major = Number(cleaned);
  if (!Number.isFinite(major)) return null;
  return Math.round(major * 100);
}

function readDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  try {
    const date = parseIsoDate(value);
    return formatIsoDate(date) === value ? date : null;
  } catch {
    return null;
  }
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof DomainError ? error.message : fallback;
}
