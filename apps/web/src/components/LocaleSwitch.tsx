import { useI18n } from '../i18n/locale-context';

export function LocaleSwitch({
  variant = 'surface',
}: {
  variant?: 'surface' | 'topbar';
}) {
  const { locale, setLocale, t } = useI18n();
  const tone =
    variant === 'topbar'
      ? 'border border-line bg-canvas text-ink dark:border-white/40 dark:bg-transparent dark:text-white'
      : 'border border-line bg-surface text-ink';

  return (
    <select
      aria-label={t('locale.label')}
      className={`cursor-pointer rounded-md px-2 py-1.5 text-sm ${tone}`}
      value={locale}
      onChange={(event) => setLocale(event.target.value === 'pt' ? 'pt' : 'en')}
    >
      <option value="en">English</option>
      <option value="pt">Português</option>
    </select>
  );
}
