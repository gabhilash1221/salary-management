import {
  COUNTRIES,
  EmploymentStatus,
  foldName,
  RANDOM_DEPARTMENTS,
  SEED_AS_OF,
  SEED_FUTURE_DATE,
  SEED_TIMESTAMP,
} from '../../src/common/reference-data';
import { addUtcDays } from '../../src/common/utils/dates';
import {
  ANNUAL_RANGE_MAJOR,
  FIRST_NAMES,
  JOB_TITLES,
  LAST_NAMES,
} from './reference-data';

export type GeneratedSalary = {
  id: string;
  employeeId: string;
  amountMinor: number;
  currency: string;
  effectiveDate: Date;
  reason: string | null;
  createdByUserId: string;
  createdAt: Date;
};

export type GeneratedEmployee = {
  id: string;
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
  version: number;
  createdAt: Date;
  updatedAt: Date;
  salaryRecords: GeneratedSalary[];
};

export type Rng = {
  next(): number;
  int(max: number): number;
  pick<T>(items: readonly T[]): T;
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(max: number) {
      return Math.floor(next() * max);
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)] as T;
    },
  };
}

const HIRE_START = new Date('2014-01-01T00:00:00.000Z');
const HIRE_SPAN_DAYS = Math.round(
  (Date.parse('2025-12-01T00:00:00.000Z') - HIRE_START.getTime()) / 86_400_000,
);

function hireDateFor(rng: Rng): Date {
  return addUtcDays(HIRE_START, rng.int(HIRE_SPAN_DAYS));
}

function salaryDates(
  hireDate: Date,
  extra: number,
  future: boolean,
  cap: Date,
): Date[] {
  const dates = [hireDate];
  let cursor = hireDate;
  for (let index = 0; index < extra; index += 1) {
    cursor = addUtcDays(cursor, 120 + (index % 5) * 30);
    if (cursor.getTime() > cap.getTime()) {
      break;
    }
    dates.push(cursor);
  }
  if (future) {
    if (dates.length === 1) {
      dates.push(SEED_FUTURE_DATE);
    } else {
      dates[dates.length - 1] = SEED_FUTURE_DATE;
    }
  }
  return dates.slice(0, 5);
}

function amountFor(
  currency: string,
  rng: Rng,
  boundary: 'min' | 'max' | null,
): number {
  const range = ANNUAL_RANGE_MAJOR[currency];
  if (!range) {
    throw new Error(`Missing salary range for ${currency}`);
  }
  const major =
    boundary === 'min'
      ? range.min
      : boundary === 'max'
        ? range.max
        : range.min + rng.int(range.max - range.min + 1);
  return major * 100;
}

export function generateEmployees(
  count: number,
  seed: number,
): GeneratedEmployee[] {
  const rng = createRng(seed);
  const employees: GeneratedEmployee[] = [];

  for (let number = 1; number <= count; number += 1) {
    const employeeId = `EMP-${String(number).padStart(6, '0')}`;
    const country = forcedCountry(number) ?? rng.pick(COUNTRIES);
    const department = forcedDepartment(number) ?? rng.pick(RANDOM_DEPARTMENTS);
    const status = forcedStatus(number) ?? randomStatus(rng);
    const names = forcedNames(number) ?? {
      firstName: rng.pick(FIRST_NAMES),
      lastName: rng.pick(LAST_NAMES),
    };
    const hireDate = hireDateFor(rng);
    const terminationDate =
      status === EmploymentStatus.Terminated
        ? addUtcDays(hireDate, 30 + rng.int(400))
        : null;
    const safeTermination =
      terminationDate && terminationDate.getTime() > SEED_AS_OF.getTime()
        ? SEED_AS_OF
        : terminationDate;
    const boundary = number === 6 ? 'min' : number === 7 ? 'max' : null;
    const extra = rng.int(5);
    const cap = safeTermination ?? SEED_AS_OF;
    const dates = salaryDates(hireDate, extra, number === 5, cap);
    const salaryRecords = dates.map((effectiveDate, index) => ({
      id: `sal_${String(number).padStart(5, '0')}_${index + 1}`,
      employeeId,
      amountMinor: amountFor(country.currency, rng, boundary),
      currency: country.currency,
      effectiveDate,
      reason: index === 0 ? 'Hire' : 'Review',
      createdByUserId: 'user_hr_manager',
      createdAt: SEED_TIMESTAMP,
    }));

    employees.push({
      id: `emp_${String(number).padStart(5, '0')}`,
      employeeId,
      firstName: names.firstName,
      lastName: names.lastName,
      firstNameKey: foldName(names.firstName),
      lastNameKey: foldName(names.lastName),
      email: `emp${String(number).padStart(5, '0')}@example.test`,
      department,
      country: country.code,
      jobTitle: rng.pick(JOB_TITLES),
      status,
      hireDate,
      terminationDate: safeTermination,
      version: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
      salaryRecords,
    });
  }

  return employees;
}

function forcedNames(
  number: number,
): { firstName: string; lastName: string } | null {
  if (number === 1) return { firstName: 'José', lastName: 'García' };
  if (number === 2 || number === 3)
    return { firstName: 'Jane', lastName: 'Doe' };
  if (number === 4) {
    return {
      firstName: 'Maximilian',
      lastName: 'Wolfeschlegelsteinhausenbergerdorff',
    };
  }
  return null;
}

function forcedCountry(number: number): (typeof COUNTRIES)[number] | null {
  if (number === 6 || number === 7) return COUNTRIES[1];
  if (number >= 9998) return COUNTRIES[4];
  return null;
}

function forcedDepartment(number: number): string | null {
  if (number === 6 || number === 7) return 'Engineering';
  if (number >= 9998) return 'Executive';
  return null;
}

function forcedStatus(number: number): string | null {
  if (number === 8) return EmploymentStatus.OnLeave;
  if (number === 9) return EmploymentStatus.Terminated;
  if (number === 5 || number === 6 || number === 7 || number >= 9998)
    return EmploymentStatus.Active;
  return null;
}

function randomStatus(rng: Rng): string {
  const roll = rng.int(100);
  if (roll < 85) return EmploymentStatus.Active;
  if (roll < 95) return EmploymentStatus.OnLeave;
  return EmploymentStatus.Terminated;
}
