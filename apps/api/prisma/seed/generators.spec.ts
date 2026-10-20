import {
  EMPLOYEE_COUNT,
  EmploymentStatus,
  foldName,
  SEED_AS_OF,
  SEED_FUTURE_DATE,
} from '../../src/common/reference-data';
import { generateEmployees } from './generators';
import { ANNUAL_RANGE_MAJOR } from './reference-data';

describe('generateEmployees', () => {
  const employees = generateEmployees(EMPLOYEE_COUNT, 42);

  it('creates exactly 10,000 employees with one to five salary records', () => {
    expect(employees).toHaveLength(EMPLOYEE_COUNT);
    expect(new Set(employees.map((employee) => employee.employeeId)).size).toBe(
      EMPLOYEE_COUNT,
    );
    for (const employee of employees) {
      expect(employee.salaryRecords.length).toBeGreaterThanOrEqual(1);
      expect(employee.salaryRecords.length).toBeLessThanOrEqual(5);
      expect(
        employee.salaryRecords.some(
          (record) => record.effectiveDate.getTime() <= SEED_AS_OF.getTime(),
        ),
      ).toBe(true);
      expect(employee.firstNameKey).toBe(foldName(employee.firstName));
    }
  });

  it('includes the required edge cases', () => {
    const jose = employees.find(
      (employee) => employee.employeeId === 'EMP-000001',
    );
    expect(jose).toMatchObject({ firstName: 'José', lastName: 'García' });
    expect(
      employees.filter(
        (employee) =>
          employee.firstName === 'Jane' && employee.lastName === 'Doe',
      ),
    ).toHaveLength(2);
    expect(
      employees.find((employee) => employee.employeeId === 'EMP-000004')
        ?.lastName.length,
    ).toBeGreaterThan(20);

    const future = employees.find(
      (employee) => employee.employeeId === 'EMP-000005',
    );
    expect(
      future?.salaryRecords.some(
        (record) =>
          record.effectiveDate.getTime() === SEED_FUTURE_DATE.getTime(),
      ),
    ).toBe(true);

    const minimum = employees.find(
      (employee) => employee.employeeId === 'EMP-000006',
    );
    const maximum = employees.find(
      (employee) => employee.employeeId === 'EMP-000007',
    );
    expect(
      minimum?.salaryRecords.every(
        (record) => record.amountMinor === ANNUAL_RANGE_MAJOR.USD.min * 100,
      ),
    ).toBe(true);
    expect(
      maximum?.salaryRecords.every(
        (record) => record.amountMinor === ANNUAL_RANGE_MAJOR.USD.max * 100,
      ),
    ).toBe(true);

    const executive = employees.filter(
      (employee) =>
        employee.department === 'Executive' && employee.country === 'CA',
    );
    expect(executive).toHaveLength(3);
    expect(
      executive.every(
        (employee) => employee.status === EmploymentStatus.Active,
      ),
    ).toBe(true);
    expect(
      employees.some(
        (employee) => employee.status === EmploymentStatus.OnLeave,
      ),
    ).toBe(true);
    expect(
      employees.some(
        (employee) => employee.status === EmploymentStatus.Terminated,
      ),
    ).toBe(true);
  });
});
