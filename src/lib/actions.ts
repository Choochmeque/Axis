import { toast } from '@/hooks/useToast';
import { shellApi } from '@/services/api';
import { notify } from '@/services/nativeNotification';
import type { Branch } from '@/types';

import { getErrorMessage } from './errorUtils';

export async function copyToClipboard(
  text: string,
  successMessage = 'Copied to clipboard'
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch (err) {
    toast.error('Copy failed', getErrorMessage(err));
    return false;
  }
}

export async function showInFinder(path: string): Promise<boolean> {
  try {
    await shellApi.showInFolder(path);
    return true;
  } catch (err) {
    toast.error('Show in Finder failed', getErrorMessage(err));
    return false;
  }
}

export function notifyNewCommits(branches: Branch[]): void {
  const currentBranch = branches.find((b) => b.isHead);
  if (currentBranch?.behind && currentBranch.behind > 0) {
    const commitWord = currentBranch.behind === 1 ? 'commit' : 'commits';
    notify(
      'New Commits Available',
      `${currentBranch.behind} ${commitWord} to pull from "${currentBranch.name}"`
    );
  }
}
