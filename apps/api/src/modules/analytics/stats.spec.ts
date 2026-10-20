import {
  buildDistribution,
  includedStatuses,
  median,
  percentileNearestRank,
  rankByAverage,
  summarize,
} from './stats';

describe('compensation stats', () => {
  it('rounds an even median half up and uses nearest-rank percentiles', () => {
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([1, 2, 3])).toBe(2);
    expect(percentileNearestRank([1, 2, 3, 4, 5], 25)).toBe(2);
    expect(percentileNearestRank([1, 2, 3, 4, 5], 75)).toBe(4);
  });

  it('keeps currencies apart and suppresses small groups', () => {
    const rows = summarize(
      [
        fact('a', 'Engineering', 'USD', 100),
        fact('b', 'Engineering', 'USD', 300),
        fact('c', 'Engineering', 'INR', 100),
      ],
      ['department'],
      2,
    );
    const usd = rows.find((row) => row.currency === 'USD');
    const inr = rows.find((row) => row.currency === 'INR');
    expect(usd).toMatchObject({
      count: 2,
      suppressed: false,
      average: 200,
      median: 200,
    });
    expect(inr).toMatchObject({ count: 1, suppressed: true });
    expect(inr?.average).toBeUndefined();
  });

  it('includes terminated employees only when status is requested', () => {
    expect(includedStatuses(undefined, ['department'])).toEqual([
      'Active',
      'On Leave',
    ]);
    expect(includedStatuses('Terminated', ['department'])).toEqual([
      'Terminated',
    ]);
    expect(includedStatuses(undefined, ['employmentStatus'])).toBeUndefined();
  });

  it('returns every tied department and fixed distribution edges', () => {
    const rows = summarize(
      [
        fact('a', 'Engineering', 'CAD', 100),
        fact('b', 'Engineering', 'CAD', 100),
        fact('c', 'Sales', 'CAD', 100),
        fact('d', 'Sales', 'CAD', 100),
      ],
      ['department'],
      2,
    );
    expect(rankByAverage(rows, 'highest').map((row) => row.department)).toEqual(
      ['Engineering', 'Sales'],
    );
    expect(
      buildDistribution(
        [{ currency: 'USD', amountMinor: 5_000_000 }],
        5_000_000,
      ),
    ).toEqual([
      { currency: 'USD', minMinor: 0, maxMinor: 5_000_000, count: 0 },
      { currency: 'USD', minMinor: 5_000_000, maxMinor: 10_000_000, count: 1 },
    ]);
  });
});

function fact(
  employeeId: string,
  department: string,
  currency: string,
  amountMinor: number,
) {
  return {
    employeeId,
    department,
    country: 'US',
    status: 'Active',
    currency,
    amountMinor,
  };
}
