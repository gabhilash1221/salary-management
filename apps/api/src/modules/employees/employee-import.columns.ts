export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
export const SQLITE_INT_MAX = 2_147_483_647;

export const IMPORT_HEADERS = [
  'employeeId',
  'firstName',
  'lastName',
  'email',
  'department',
  'country',
  'jobTitle',
  'status',
  'hireDate',
  'terminationDate',
  'annualAmount',
  'currency',
  'salaryEffectiveDate',
  'reason',
] as const;

export type ImportHeader = (typeof IMPORT_HEADERS)[number];

export const IMPORT_LABELS: Record<ImportHeader, string> = {
  employeeId: 'Employee ID',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  department: 'Department',
  country: 'Country',
  jobTitle: 'Job title',
  status: 'Status',
  hireDate: 'Hire date',
  terminationDate: 'Termination date',
  annualAmount: 'Annual amount',
  currency: 'Currency',
  salaryEffectiveDate: 'Salary effective date',
  reason: 'Reason',
};

export const SAMPLE_ROWS: string[][] = [
  [
    'EMP-900001',
    'Ada',
    'Lovelace',
    'ada.lovelace@example.test',
    'Engineering',
    'GB',
    'Engineer',
    'Active',
    '2024-01-15',
    '',
    '120000',
    'GBP',
    '2024-01-15',
    'Hire',
  ],
  [
    'EMP-900002',
    'Grace',
    'Hopper',
    'grace.hopper@example.test',
    'People',
    'US',
    'Researcher',
    'On Leave',
    '2023-06-01',
    '',
    '',
    '',
    '',
    '',
  ],
];

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportFileError';
  }
}

export type ParsedRow = {
  row: number;
  values: Record<ImportHeader, string>;
};

export type ImportStatus = 'ready' | 'failed' | 'skipped' | 'imported';

export type ImportRowView = {
  row: number;
  status: ImportStatus;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  messages: string[];
};

export type ImportReport = {
  total: number;
  valid: number;
  failed: number;
  skipped: number;
  imported: number;
  rows: ImportRowView[];
};

export type SalaryDraft = {
  amountMinor: number;
  currency: string;
  effectiveDate: Date;
  reason: string | null;
};

export type EmployeeDraft = {
  employeeId: string;
  firstName: string;
  lastName: string;
  firstNameKey: string;
  lastNameKey: string;
  email: string;
  department: string;
  country: string;
  jobTitle: string;
  status: string;
  hireDate: Date;
  terminationDate: Date | null;
  salary: SalaryDraft | null;
};

export type ClassifiedRow = {
  view: ImportRowView;
  draft: EmployeeDraft | null;
};
