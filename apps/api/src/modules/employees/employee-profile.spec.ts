import { parseEmployeeProfile } from './employee-profile';

const valid = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'Ada@Example.test',
  department: 'engineering',
  country: 'United Kingdom',
  jobTitle: 'Engineer',
  status: 'active',
  hireDate: '2024-01-15',
  terminationDate: null,
};

describe('parseEmployeeProfile', () => {
  it('canonicalizes a new employee and leaves a blank id unassigned', () => {
    const parsed = parseEmployeeProfile(
      { ...valid, employeeId: '  ' },
      'create',
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.profile.employeeId).toBeNull();
    expect(parsed.profile.email).toBe('ada@example.test');
    expect(parsed.profile.department).toBe('Engineering');
    expect(parsed.profile.country).toBe('GB');
    expect(parsed.profile.status).toBe('Active');
    expect(parsed.profile.firstNameKey).toBe('ada');
  });

  it('rejects invalid fields and a termination date on an active employee', () => {
    const parsed = parseEmployeeProfile(
      {
        ...valid,
        employeeId: 'EMP-1',
        email: 'not-an-email',
        terminationDate: '2024-02-01',
        firstName: '=Ada',
      },
      'create',
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.messages.join(' ')).toMatch(/cannot start with/);
    expect(parsed.messages.join(' ')).not.toMatch(/Employee ID/);
  });

  it('requires a termination date on or after the hire date', () => {
    const missing = parseEmployeeProfile(
      { ...valid, status: 'Terminated', terminationDate: '' },
      'update',
    );
    const early = parseEmployeeProfile(
      {
        ...valid,
        status: 'Terminated',
        terminationDate: '2020-01-01',
      },
      'update',
    );
    expect(missing.ok).toBe(false);
    expect(early.ok).toBe(false);
    if (missing.ok || early.ok) return;
    expect(missing.messages.join(' ')).toMatch(/require a termination date/);
    expect(early.messages.join(' ')).toMatch(/cannot be earlier/);
  });
});
