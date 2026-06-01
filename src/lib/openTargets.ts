import type { OpenTarget, OpenTargetKind, OpenTargetOption } from '@/types';

export const FALLBACK_OPEN_TARGET: OpenTarget = {
  kind: 'Finder' as OpenTargetKind,
  id: 'finder',
};

export const FALLBACK_OPEN_TARGET_OPTIONS: OpenTargetOption[] = [
  {
    target: FALLBACK_OPEN_TARGET,
    name: 'Finder',
    iconDataUrl: null,
    installed: true,
  },
];

export function openTargetKey(target: OpenTarget): string {
  return `${target.kind}:${target.id}`;
}

export function getOpenTargetOption(
  options: OpenTargetOption[],
  target: OpenTarget | undefined | null
): OpenTargetOption {
  if (!target) {
    return FALLBACK_OPEN_TARGET_OPTIONS[0];
  }

  const key = openTargetKey(target);
  return (
    options.find((option) => openTargetKey(option.target) === key) ??
    FALLBACK_OPEN_TARGET_OPTIONS[0]
  );
}
