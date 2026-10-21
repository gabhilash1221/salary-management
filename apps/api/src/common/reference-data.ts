export const SUPPORTED_CURRENCIES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'BRL',
  'AOA',
  'MZN',
  'CVE',
  'XOF',
  'STN',
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
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'AO', name: 'Angola', currency: 'AOA' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN' },
  { code: 'CV', name: 'Cape Verde', currency: 'CVE' },
  { code: 'GW', name: 'Guinea-Bissau', currency: 'XOF' },
  { code: 'ST', name: 'São Tomé and Príncipe', currency: 'STN' },
  { code: 'TL', name: 'Timor-Leste', currency: 'USD' },
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
  portugal: 'PT',
  pt: 'PT',
  brazil: 'BR',
  brasil: 'BR',
  br: 'BR',
  angola: 'AO',
  ao: 'AO',
  mozambique: 'MZ',
  mocambique: 'MZ',
  mz: 'MZ',
  'cape verde': 'CV',
  'cabo verde': 'CV',
  cv: 'CV',
  'guinea-bissau': 'GW',
  'guine-bissau': 'GW',
  gw: 'GW',
  'sao tome and principe': 'ST',
  'sao tome e principe': 'ST',
  st: 'ST',
  'timor-leste': 'TL',
  'east timor': 'TL',
  tl: 'TL',
};

export const COUNTRY_NAMES = COUNTRIES.map((country) => country.name);

const DEPARTMENT_ALIASES: Record<string, (typeof DEPARTMENTS)[number]> = {
  engineering: 'Engineering',
  engenharia: 'Engineering',
  sales: 'Sales',
  vendas: 'Sales',
  people: 'People',
  pessoas: 'People',
  finance: 'Finance',
  financas: 'Finance',
  operations: 'Operations',
  operacoes: 'Operations',
  executive: 'Executive',
  executivo: 'Executive',
};

const STATUS_ALIASES: Record<string, (typeof EMPLOYMENT_STATUSES)[number]> = {
  active: 'Active',
  ativo: 'Active',
  'on leave': 'On Leave',
  'de licenca': 'On Leave',
  licenca: 'On Leave',
  terminated: 'Terminated',
  desligado: 'Terminated',
  rescindido: 'Terminated',
};

export function foldLookup(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '');
}

export function resolveCountryCode(value: string): string | undefined {
  return COUNTRY_LOOKUP[foldLookup(value)];
}

export function resolveDepartmentName(
  value: string,
): (typeof DEPARTMENTS)[number] | undefined {
  return DEPARTMENT_ALIASES[foldLookup(value)];
}

export function resolveStatusName(
  value: string,
): (typeof EMPLOYMENT_STATUSES)[number] | undefined {
  return STATUS_ALIASES[foldLookup(value)];
}

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
