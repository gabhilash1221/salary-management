export const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'People',
  'Finance',
  'Operations',
  'Executive',
];
export const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
];
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD'];
export const STATUSES = ['Active', 'On Leave', 'Terminated'];

const EXPONENTS: Record<string, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
};

export function formatMoney(amountMinor: number, currency: string): string {
  const exponent = EXPONENTS[currency] ?? 2;
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(
    amountMinor / 10 ** exponent,
  );
}
