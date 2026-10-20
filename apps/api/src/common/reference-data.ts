export const SUPPORTED_CURRENCIES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'CAD',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'People',
  'Finance',
  'Operations',
  'Executive',
] as const;

export const RANDOM_DEPARTMENTS = [
  'Engineering',
  'Sales',
  'People',
  'Finance',
  'Operations',
] as const;

export const EmploymentStatus = {
  Active: 'Active',
  OnLeave: 'On Leave',
  Terminated: 'Terminated',
} as const;

export const EMPLOYMENT_STATUSES = [
  EmploymentStatus.Active,
  EmploymentStatus.OnLeave,
  EmploymentStatus.Terminated,
] as const;

export type EmploymentStatusName = (typeof EMPLOYMENT_STATUSES)[number];

export const Role = {
  HrManager: 'HR_MANAGER',
  HrViewer: 'HR_VIEWER',
  DirectoryUser: 'DIRECTORY_USER',
  Auditor: 'AUDITOR',
} as const;

export type RoleName = (typeof Role)[keyof typeof Role];

export const ROLES = Object.values(Role);

export const SALARY_FIELD_ROLES: RoleName[] = [Role.HrManager, Role.HrViewer];

export const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
] as const;

export const COUNTRY_LOOKUP: Record<string, string> = {
  india: 'IN',
  in: 'IN',
  'united states': 'US',
  usa: 'US',
  us: 'US',
  germany: 'DE',
  de: 'DE',
  'united kingdom': 'GB',
  uk: 'GB',
  gb: 'GB',
  canada: 'CA',
  ca: 'CA',
};

export const COUNTRY_NAMES = [
  'India',
  'United States',
  'Germany',
  'United Kingdom',
  'Canada',
];

export const SEED_TIMESTAMP = new Date('2026-01-15T00:00:00.000Z');
export const SEED_AS_OF = new Date('2026-10-20T00:00:00.000Z');
export const SEED_FUTURE_DATE = new Date('2027-06-01T00:00:00.000Z');
export const DEFAULT_SEED = 42;
export const EMPLOYEE_COUNT = 10_000;

export function foldName(value: string): string {
  return value.toLocaleLowerCase('en-US');
}

export function analyticsDefinition(minGroupSize: number): string {
  return [
    'Population is Active and On Leave employees unless a status filter is set or the breakdown includes employment status.',
    'Current salary is the latest annual base record with an effective date on or before today (UTC).',
    'Amounts are integers in minor units. Results are always split by currency and are never blended.',
    `Groups with fewer than ${minGroupSize} employees return a count and suppress salary statistics.`,
    'Average and even-count median use half-up rounding to the nearest minor unit.',
    'P25 and P75 use nearest rank: ceil(p / 100 * N).',
  ].join(' ');
}
