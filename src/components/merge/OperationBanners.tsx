import { BisectBanner } from './BisectBanner';
import { MergeBanner } from './MergeBanner';
import { RebaseBanner } from './RebaseBanner';

interface OperationBannersProps {
  onComplete?: () => void;
}

export function OperationBanners({ onComplete }: OperationBannersProps) {
  return (
    <div className="sticky top-0 z-10 shrink-0">
      <BisectBanner onComplete={onComplete} />
      <MergeBanner onComplete={onComplete} />
      <RebaseBanner onComplete={onComplete} />
    </div>
  );
}
