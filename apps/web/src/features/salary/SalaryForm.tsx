import { type FormEvent, useState } from 'react';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { useI18n } from '../../i18n/locale-context';
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
  const { t } = useI18n();

  function submit(event: FormEvent) {
    event.preventDefault();
    const major = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(major) || major <= 0) {
      setLocalError(t('salary.amountError'));
      return;
    }
    if (earliestDate && effectiveDate < earliestDate) {
      setLocalError(t('salary.dateError', { date: earliestDate }));
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
      <Field label={t('salary.annual')} htmlFor="amount">
        <input
          id="amount"
          className={controlClass}
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </Field>
      <Field label={t('salary.currency')} htmlFor="currency">
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
      <Field label={t('salary.effective')} htmlFor="effectiveDate">
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
          {t('salary.latest', {
            latest: latestSalaryDate,
            earliest: earliestDate,
          })}
        </p>
      ) : null}
      <Field label={t('salary.reason')} htmlFor="reason">
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
        {pending ? t('common.saving') : t('salary.update')}
      </Button>
    </form>
  );
}
