import { useI18n } from '../i18n/locale-context';

export function LoadingState({ message }: { message?: string }) {
  const { t } = useI18n();
  return <p className="text-muted">{message ?? t('common.loading')}</p>;
}
