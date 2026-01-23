import { useTranslation } from 'react-i18next';
import { HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LfsIndicatorProps {
  isDownloaded?: boolean;
  className?: string;
}

export function LfsIndicator({ isDownloaded = true, className }: LfsIndicatorProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded',
        isDownloaded
          ? 'bg-(--accent-color)/20 text-(--accent-color)'
          : 'bg-warning/20 text-warning',
        className
      )}
      title={isDownloaded ? t('lfs.indicator.downloaded') : t('lfs.indicator.pointer')}
    >
      <HardDrive size={10} />
      {t('lfs.indicator.label')}
    </span>
  );
}
