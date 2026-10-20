import { type FormEvent, useState } from 'react';
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
    <form className="form-grid" onSubmit={submit}>
      <label htmlFor="amount">
        Annual amount
        <input
          id="amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </label>
      <label htmlFor="currency">
        Currency
        <select
          id="currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="effectiveDate">
        Effective date
        <input
          id="effectiveDate"
          type="date"
          value={effectiveDate}
          onChange={(event) => setEffectiveDate(event.target.value)}
          required
        />
      </label>
      <label htmlFor="reason">
        Reason
        <input
          id="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Update salary'}
      </button>
    </form>
  );
}
