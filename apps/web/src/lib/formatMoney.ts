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
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AO', name: 'Angola' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'TL', name: 'Timor-Leste' },
];
export const CURRENCIES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'BRL',
  'AOA',
  'MZN',
  'CVE',
  'XOF',
  'STN',
];
export const STATUSES = ['Active', 'On Leave', 'Terminated'];

const EXPONENTS: Record<string, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  BRL: 2,
  AOA: 2,
  MZN: 2,
  CVE: 2,
  XOF: 2,
  STN: 2,
};

export function formatMoney(
  amountMinor: number,
  currency: string,
  locale: 'en' | 'pt' = 'en',
): string {
  const exponent = EXPONENTS[currency] ?? 2;
  return new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en', {
    style: 'currency',
    currency,
  }).format(amountMinor / 10 ** exponent);
}
