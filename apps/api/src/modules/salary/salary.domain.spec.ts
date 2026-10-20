import {
  assertAmount,
  assertNextEffectiveDate,
  DomainError,
  resolveCurrentSalary,
} from './salary.domain';

describe('salary domain', () => {
  const hireDate = new Date('2020-01-01T00:00:00.000Z');

  it('rejects amounts that are not a positive minor-unit integer', () => {
    expect(() => assertAmount(0, 100)).toThrow(DomainError);
    expect(() => assertAmount(1.5, 100)).toThrow(DomainError);
    expect(() => assertAmount(101, 100)).toThrow(DomainError);
    expect(() => assertAmount(100, 100)).not.toThrow();
  });

  it('rejects an effective date before hire or on or before the latest record', () => {
    expect(() =>
      assertNextEffectiveDate({
        effectiveDate: '2019-12-31',
        hireDate,
        latestEffectiveDate: null,
      }),
    ).toThrow(DomainError);

    expect(() =>
      assertNextEffectiveDate({
        effectiveDate: '2024-01-01',
        hireDate,
        latestEffectiveDate: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).toThrow(/later than the latest/);

    expect(
      assertNextEffectiveDate({
        effectiveDate: '2027-01-01',
        hireDate,
        latestEffectiveDate: new Date('2024-01-01T00:00:00.000Z'),
      }).toISOString(),
    ).toBe('2027-01-01T00:00:00.000Z');
  });

  it('uses the latest record on or before today and ignores future dates', () => {
    const records = [
      { id: 'past', effectiveDate: new Date('2024-01-01T00:00:00.000Z') },
      { id: 'current', effectiveDate: new Date('2026-05-01T00:00:00.000Z') },
      { id: 'future', effectiveDate: new Date('2027-06-01T00:00:00.000Z') },
    ];
    expect(
      resolveCurrentSalary(records, new Date('2026-10-20T15:00:00.000Z'))?.id,
    ).toBe('current');
    expect(
      resolveCurrentSalary(
        [{ id: 'future', effectiveDate: new Date('2027-06-01T00:00:00.000Z') }],
        new Date('2026-10-20T00:00:00.000Z'),
      ),
    ).toBeNull();
  });
});
