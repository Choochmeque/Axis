import { toast } from '@/hooks/useToast';
import i18n from '@/i18n';
import { shellApi } from '@/services/api';
import { notify } from '@/services/nativeNotification';
import type { Branch } from '@/types';

import { getErrorMessage } from './errorUtils';

export async function copyToClipboard(
  text: string,
  successMessage = i18n.t('notifications.success.copiedToClipboard')
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch (err) {
    toast.error(i18n.t('lib.actions.copyFailed'), getErrorMessage(err));
    return false;
  }
}

export async function showInFinder(path: string): Promise<boolean> {
  try {
    await shellApi.showInFolder(path);
    return true;
  } catch (err) {
    toast.error(i18n.t('lib.actions.showInFinderFailed'), getErrorMessage(err));
    return false;
  }
}

export function notifyNewCommits(branches: Branch[]): void {
  const currentBranch = branches.find((b) => b.isHead);
  if (currentBranch?.behind && currentBranch.behind > 0) {
    notify(
      i18n.t('lib.actions.newCommitsAvailable'),
      i18n.t('lib.actions.commitsToPull', {
        count: currentBranch.behind,
        branch: currentBranch.name,
      })
    );
  }
}
