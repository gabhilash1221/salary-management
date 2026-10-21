import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../common/reference-data';
import { parseIsoDate } from '../../common/utils/dates';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export type SalarySnapshot = {
  amountMinor: number;
  currency: string;
  effectiveDate: Date;
};

export function assertCurrency(
  currency: string,
): asserts currency is SupportedCurrency {
  if (!SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
    throw new DomainError(
      `Currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}`,
    );
  }
}

export function assertAmount(amountMinor: number, maxAmountMinor: number) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new DomainError('Amount must be a positive integer in minor units');
  }
  if (amountMinor > maxAmountMinor) {
    throw new DomainError('Amount exceeds the configured maximum');
  }
}

export function assertNextEffectiveDate(input: {
  effectiveDate: string;
  hireDate: Date;
  latestEffectiveDate: Date | null;
}) {
  const effectiveDate = parseIsoDate(input.effectiveDate);
  if (effectiveDate.getTime() < input.hireDate.getTime()) {
    throw new DomainError(
      'Effective date cannot be earlier than the hire date',
    );
  }
  if (
    input.latestEffectiveDate &&
    effectiveDate.getTime() <= input.latestEffectiveDate.getTime()
  ) {
    throw new DomainError(
      'Effective date must be later than the latest salary record',
    );
  }
  return effectiveDate;
}

export function resolveCurrentSalary<T extends { effectiveDate: Date }>(
  records: T[],
  today: Date,
): T | null {
  const todayTime = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const eligible = records.filter(
    (record) => record.effectiveDate.getTime() <= todayTime,
  );
  eligible.sort(
    (left, right) =>
      right.effectiveDate.getTime() - left.effectiveDate.getTime(),
  );
  return eligible[0] ?? null;
}
