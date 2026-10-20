import { type FormEvent, useState } from 'react';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { CURRENCIES } from '../../lib/formatMoney';

export function SalaryForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (input: {
    amountMinor: number;
    currency: string;
    effectiveDate: string;
    reason: string;
  }) => void;
}) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const major = Number(amount);
    if (!Number.isFinite(major) || major <= 0) return;
    onSubmit({
      amountMinor: Math.round(major * 100),
      currency,
      effectiveDate,
      reason,
    });
  }

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
          value={effectiveDate}
          onChange={(event) => setEffectiveDate(event.target.value)}
          required
        />
      </Field>
      <Field label="Reason" htmlFor="reason">
        <input
          id="reason"
          className={controlClass}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {error ? (
        <div className="sm:col-span-2">
          <ErrorState message={error} />
        </div>
      ) : null}
      <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
        {pending ? 'Saving…' : 'Update salary'}
      </Button>
    </form>
  );
}
