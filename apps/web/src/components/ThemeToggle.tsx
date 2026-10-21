import { useTheme } from '../app/theme-context';
import { useI18n } from '../i18n/locale-context';

export function ThemeToggle({
  variant = 'surface',
}: {
  variant?: 'surface' | 'topbar';
}) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const night = theme === 'night';
  const tone =
    variant === 'topbar'
      ? night
        ? 'border border-white/40 bg-transparent text-white'
        : 'border border-line bg-canvas text-ink'
      : 'border border-line bg-surface text-ink';

  return (
    <button
      type="button"
      className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${tone}`}
      aria-pressed={night}
      onClick={toggleTheme}
    >
      {night ? t('theme.day') : t('theme.night')}
    </button>
  );
}
