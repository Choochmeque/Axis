import { FolderOpen, Terminal } from 'lucide-react';
import type { OpenTargetOption } from '@/types';

interface OpenTargetIconProps {
  option: OpenTargetOption;
  size?: number;
}

export function OpenTargetIcon({ option, size = 18 }: OpenTargetIconProps) {
  if (option.iconDataUrl) {
    return (
      <img
        src={option.iconDataUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[3px]"
      />
    );
  }

  const Icon = option.target.kind === 'Terminal' ? Terminal : FolderOpen;
  return <Icon size={size} />;
}
