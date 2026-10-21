export function nextIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function earliestSalaryDate(
  hireDate: string,
  latestSalaryDate: string | null,
): string {
  return latestSalaryDate ? nextIsoDate(latestSalaryDate) : hireDate;
}
