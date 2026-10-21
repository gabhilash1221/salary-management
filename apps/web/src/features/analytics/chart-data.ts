import type { DistributionRow, SummaryRow } from '../../api/types';

export type ChartItem = {
  key: string;
  label: string;
  value: number;
  display: string;
};

export function groupLabel(row: SummaryRow): string {
  return row.department ?? row.country ?? row.employmentStatus ?? 'All';
}

export function currenciesIn(rows: Array<{ currency: string }>): string[] {
  return [...new Set(rows.map((row) => row.currency))];
}

export function medianItems(
  rows: SummaryRow[],
  format: (amountMinor: number, currency: string) => string,
): ChartItem[] {
  return rows
    .map((row) => {
      const median = row.median;
      const label = groupLabel(row);
      if (row.suppressed || median === undefined) {
        return { key: label, label, value: 0, display: 'Suppressed' };
      }
      return {
        key: label,
        label,
        value: median,
        display: format(median, row.currency),
      };
    })
    .sort((left, right) => right.value - left.value);
}

export function headcountItems(rows: SummaryRow[]): ChartItem[] {
  return rows
    .map((row) => ({
      key: groupLabel(row),
      label: groupLabel(row),
      value: row.count,
      display: String(row.count),
    }))
    .sort((left, right) => right.value - left.value);
}

export function distributionItems(
  rows: DistributionRow[],
  format: (amountMinor: number, currency: string) => string,
): ChartItem[] {
  const first = rows.findIndex((row) => row.count > 0);
  let last = -1;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index]?.count) {
      last = index;
      break;
    }
  }
  if (first < 0 || last < 0) return [];
  return rows.slice(first, last + 1).map((row) => ({
    key: String(row.minMinor),
    label: format(row.minMinor, row.currency),
    value: row.count,
    display: `${format(row.minMinor, row.currency)}–${format(row.maxMinor, row.currency)}: ${row.count}`,
  }));
}
