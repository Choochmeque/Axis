import { Braces, Code2, FolderOpen, Ghost, Laptop, Terminal, type LucideIcon } from 'lucide-react';
import { OpenTarget } from '@/types';
import type { OpenTarget as OpenTargetType } from '@/types';

export interface OpenTargetOption {
  value: OpenTargetType;
  labelKey: string;
  icon: LucideIcon;
}

export const OPEN_TARGETS: OpenTargetOption[] = [
  { value: OpenTarget.Zed, labelKey: 'openTargets.zed', icon: Code2 },
  { value: OpenTarget.Finder, labelKey: 'openTargets.finder', icon: FolderOpen },
  { value: OpenTarget.Terminal, labelKey: 'openTargets.terminal', icon: Terminal },
  { value: OpenTarget.Iterm2, labelKey: 'openTargets.iterm2', icon: Terminal },
  { value: OpenTarget.Ghostty, labelKey: 'openTargets.ghostty', icon: Ghost },
  { value: OpenTarget.Xcode, labelKey: 'openTargets.xcode', icon: Laptop },
  { value: OpenTarget.AndroidStudio, labelKey: 'openTargets.androidStudio', icon: Braces },
  { value: OpenTarget.IntelliJIdea, labelKey: 'openTargets.intellijIdea', icon: Braces },
];

export function getOpenTargetOption(target: OpenTargetType): OpenTargetOption {
  return OPEN_TARGETS.find((option) => option.value === target) ?? OPEN_TARGETS[1];
}
