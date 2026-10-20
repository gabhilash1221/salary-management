import { roundHalfUp } from '../../common/utils/money';

export type Dimension = 'department' | 'country' | 'employmentStatus';

export type SalaryFact = {
  employeeId: string;
  department: string;
  country: string;
  status: string;
  currency: string;
  amountMinor: number;
};

export type SummaryRow = {
  currency: string;
  department?: string;
  country?: string;
  employmentStatus?: string;
  count: number;
  suppressed: boolean;
  min?: number;
  max?: number;
  average?: number;
  median?: number;
  p25?: number;
  p75?: number;
};

export type DistributionRow = {
  currency: string;
  minMinor: number;
  maxMinor: number;
  count: number;
};

export const BUCKET_WIDTH_MINOR = 5_000_000;

export function includedStatuses(
  statusFilter: string | undefined,
  groupBy: Dimension[],
): string[] | undefined {
  if (statusFilter) return [statusFilter];
  if (groupBy.includes('employmentStatus')) return undefined;
  return ['Active', 'On Leave'];
}

export function summarize(
  facts: SalaryFact[],
  groupBy: Dimension[],
  minGroupSize: number,
): SummaryRow[] {
  const groups = new Map<string, { row: SummaryRow; amounts: number[] }>();
  for (const fact of facts) {
    const row: SummaryRow = {
      currency: fact.currency,
      count: 0,
      suppressed: false,
    };
    if (groupBy.includes('department')) row.department = fact.department;
    if (groupBy.includes('country')) row.country = fact.country;
    if (groupBy.includes('employmentStatus'))
      row.employmentStatus = fact.status;
    const key = JSON.stringify([
      row.currency,
      row.department ?? '',
      row.country ?? '',
      row.employmentStatus ?? '',
    ]);
    const group = groups.get(key) ?? { row, amounts: [] };
    group.amounts.push(fact.amountMinor);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ row, amounts }) => finishRow(row, amounts, minGroupSize))
    .sort(compareRows);
}

export function buildDistribution(
  facts: Pick<SalaryFact, 'currency' | 'amountMinor'>[],
  width = BUCKET_WIDTH_MINOR,
): DistributionRow[] {
  const byCurrency = new Map<string, number[]>();
  for (const fact of facts) {
    const amounts = byCurrency.get(fact.currency) ?? [];
    amounts.push(fact.amountMinor);
    byCurrency.set(fact.currency, amounts);
  }

  const rows: DistributionRow[] = [];
  for (const [currency, amounts] of [...byCurrency.entries()].sort(
    (left, right) => left[0].localeCompare(right[0]),
  )) {
    const max = Math.max(...amounts);
    const bucketCount = Math.floor(max / width) + 1;
    const counts = Array.from({ length: bucketCount }, () => 0);
    for (const amount of amounts) {
      const index = Math.min(bucketCount - 1, Math.floor(amount / width));
      counts[index] += 1;
    }
    counts.forEach((count, index) => {
      rows.push({
        currency,
        minMinor: index * width,
        maxMinor: (index + 1) * width,
        count,
      });
    });
  }
  return rows;
}

export function rankByAverage(
  rows: SummaryRow[],
  direction: 'highest' | 'lowest',
): SummaryRow[] {
  const eligible = rows.filter(
    (row) => !row.suppressed && row.average !== undefined,
  );
  const winners: SummaryRow[] = [];
  for (const currency of [
    ...new Set(eligible.map((row) => row.currency)),
  ].sort()) {
    const group = eligible.filter((row) => row.currency === currency);
    const target =
      direction === 'highest'
        ? Math.max(...group.map((row) => row.average ?? 0))
        : Math.min(...group.map((row) => row.average ?? 0));
    winners.push(
      ...group
        .filter((row) => row.average === target)
        .sort((left, right) =>
          (left.department ?? '').localeCompare(right.department ?? ''),
        ),
    );
  }
  return winners;
}

function finishRow(
  row: SummaryRow,
  amounts: number[],
  minGroupSize: number,
): SummaryRow {
  const sorted = [...amounts].sort((left, right) => left - right);
  const count = sorted.length;
  if (count < minGroupSize) {
    return { ...row, count, suppressed: true };
  }
  const sum = sorted.reduce((total, amount) => total + amount, 0);
  return {
    ...row,
    count,
    suppressed: false,
    min: sorted[0],
    max: sorted[count - 1],
    average: roundHalfUp(sum / count),
    median: median(sorted),
    p25: percentileNearestRank(sorted, 25),
    p75: percentileNearestRank(sorted, 75),
  };
}

export function median(sortedAscending: number[]): number {
  const mid = Math.floor(sortedAscending.length / 2);
  if (sortedAscending.length % 2 === 1) {
    return sortedAscending[mid] ?? 0;
  }
  return roundHalfUp(
    ((sortedAscending[mid - 1] ?? 0) + (sortedAscending[mid] ?? 0)) / 2,
  );
}

export function percentileNearestRank(
  sortedAscending: number[],
  percentile: number,
): number {
  const rank = Math.ceil((percentile / 100) * sortedAscending.length);
  return (
    sortedAscending[Math.min(sortedAscending.length, Math.max(1, rank)) - 1] ??
    0
  );
}

function compareRows(left: SummaryRow, right: SummaryRow): number {
  return [
    left.currency,
    left.department ?? '',
    left.country ?? '',
    left.employmentStatus ?? '',
  ]
    .join('|')
    .localeCompare(
      [
        right.currency,
        right.department ?? '',
        right.country ?? '',
        right.employmentStatus ?? '',
      ].join('|'),
    );
}
