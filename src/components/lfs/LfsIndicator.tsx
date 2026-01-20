import { HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LfsIndicatorProps {
  isDownloaded?: boolean;
  className?: string;
}

export function LfsIndicator({ isDownloaded = true, className }: LfsIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded',
        isDownloaded
          ? 'bg-(--accent-color)/20 text-(--accent-color)'
          : 'bg-warning/20 text-warning',
        className
      )}
      title={isDownloaded ? 'LFS file (downloaded)' : 'LFS pointer (not downloaded)'}
    >
      <HardDrive size={10} />
      LFS
    </span>
  );
}
