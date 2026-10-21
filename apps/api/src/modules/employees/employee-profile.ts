import {
  DEPARTMENTS,
  foldName,
  resolveCountryCode,
  resolveDepartmentName,
  resolveStatusName,
} from '../../common/reference-data';
import { formatIsoDate, parseIsoDate } from '../../common/utils/dates';

const FORMULA = /^[=+\-@]/;
const EMPLOYEE_ID = /^EMP-\d{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmployeeProfileInput = {
  employeeId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  department?: string | null;
  country?: string | null;
  jobTitle?: string | null;
  status?: string | null;
  hireDate?: string | null;
  terminationDate?: string | null;
};

export type EmployeeProfile = {
  employeeId: string | null;
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
};

export function parseEmployeeProfile(
  input: EmployeeProfileInput,
  mode: 'create' | 'update',
): { ok: true; profile: EmployeeProfile } | { ok: false; messages: string[] } {
  const employeeId = text(input.employeeId);
  const firstName = text(input.firstName);
  const lastName = text(input.lastName);
  const email = text(input.email);
  const departmentInput = text(input.department);
  const countryInput = text(input.country);
  const jobTitle = text(input.jobTitle);
  const statusInput = text(input.status);
  const hireDateInput = text(input.hireDate);
  const terminationInput = text(input.terminationDate);
  const messages: string[] = [];

  for (const [label, value] of [
    ['Employee ID', employeeId],
    ['First name', firstName],
    ['Last name', lastName],
    ['Email', email],
    ['Department', departmentInput],
    ['Country', countryInput],
    ['Job title', jobTitle],
    ['Status', statusInput],
    ['Hire date', hireDateInput],
    ['Termination date', terminationInput],
  ] as const) {
    if (value !== '' && FORMULA.test(value)) {
      messages.push(`${label} cannot start with =, +, -, or @`);
    }
  }
  if (messages.length > 0) return { ok: false, messages };

  if (mode === 'create' && employeeId !== '' && !EMPLOYEE_ID.test(employeeId)) {
    messages.push('Employee ID must look like EMP-000001');
  }
  if (firstName === '' || firstName.length > 100) {
    messages.push('First name is required and must be 100 characters or fewer');
  }
  if (lastName === '' || lastName.length > 100) {
    messages.push('Last name is required and must be 100 characters or fewer');
  }
  if (email === '' || email.length > 254 || !EMAIL.test(email)) {
    messages.push('Email must be a valid address');
  }

  const department = resolveDepartmentName(departmentInput);
  if (!department) {
    messages.push(`Department must be one of ${DEPARTMENTS.join(', ')}`);
  }
  const country = resolveCountryCode(countryInput);
  if (!country) {
    messages.push('Country must be a supported country code or name');
  }
  if (jobTitle === '' || jobTitle.length > 80) {
    messages.push('Job title is required and must be 80 characters or fewer');
  }
  const status = resolveStatusName(statusInput);
  if (!status) {
    messages.push('Status must be Active, On Leave, or Terminated');
  }

  const hireDate = readDate(hireDateInput);
  if (!hireDate) messages.push('Hire date must be YYYY-MM-DD');
  const terminationDate =
    terminationInput === '' ? null : readDate(terminationInput);
  if (terminationInput !== '' && !terminationDate) {
    messages.push('Termination date must be YYYY-MM-DD');
  }
  if (status === 'Terminated' && !terminationDate) {
    messages.push('Terminated employees require a termination date');
  }
  if (status && status !== 'Terminated' && terminationInput !== '') {
    messages.push('Termination date is only allowed when status is Terminated');
  }
  if (
    hireDate &&
    terminationDate &&
    terminationDate.getTime() < hireDate.getTime()
  ) {
    messages.push('Termination date cannot be earlier than the hire date');
  }

  if (messages.length > 0 || !department || !country || !status || !hireDate) {
    return { ok: false, messages };
  }

  return {
    ok: true,
    profile: {
      employeeId: mode === 'create' && employeeId !== '' ? employeeId : null,
      firstName,
      lastName,
      firstNameKey: foldName(firstName),
      lastNameKey: foldName(lastName),
      email: email.toLowerCase(),
      department,
      country,
      jobTitle,
      status,
      hireDate,
      terminationDate: status === 'Terminated' ? terminationDate : null,
    },
  };
}

function text(value: string | null | undefined): string {
  return (value ?? '').trim();
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
