import { type FormEvent, useState } from 'react';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { CURRENCIES } from '../../lib/formatMoney';

export function SalaryForm({
  pending,
  error,
  earliestDate = '',
  latestSalaryDate = null,
  defaultCurrency = 'USD',
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  earliestDate?: string;
  latestSalaryDate?: string | null;
  defaultCurrency?: string;
  onSubmit: (input: {
    amountMinor: number;
    currency: string;
    effectiveDate: string;
    reason: string;
  }) => void;
}) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [effectiveDate, setEffectiveDate] = useState(earliestDate);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const major = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(major) || major <= 0) {
      setLocalError('Enter an annual amount greater than zero.');
      return;
    }
    if (earliestDate && effectiveDate < earliestDate) {
      setLocalError(`Effective date must be ${earliestDate} or a later date.`);
      return;
    }
    setLocalError(null);
    onSubmit({
      amountMinor: Math.round(major * 100),
      currency,
      effectiveDate,
      reason,
    });
  }

  const message = localError ?? error;

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <Field label="Annual amount" htmlFor="amount">
        <input
          id="amount"
          className={controlClass}
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </Field>
      <Field label="Currency" htmlFor="currency">
        <select
          id="currency"
          className={controlClass}
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Effective date" htmlFor="effectiveDate">
        <input
          id="effectiveDate"
          className={controlClass}
          type="date"
          min={earliestDate || undefined}
          value={effectiveDate}
          onChange={(event) => setEffectiveDate(event.target.value)}
          required
        />
      </Field>
      {latestSalaryDate ? (
        <p className="text-sm text-muted sm:col-span-2">
          Latest salary record is {latestSalaryDate}. Use {earliestDate} or a
          later date.
        </p>
      ) : null}
      <Field label="Reason" htmlFor="reason">
        <input
          id="reason"
          className={controlClass}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {message ? (
        <div className="sm:col-span-2">
          <ErrorState message={message} />
        </div>
      ) : null}
      <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
        {pending ? 'Saving…' : 'Update salary'}
      </Button>
    </form>
  );
}
