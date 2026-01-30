import { useCallback } from 'react';
import { sshKeysApi, remoteSshKeysApi } from '@/services/api';
import { SshKeyFormat } from '@/types';
import { useSettingsStore } from '@/store/settingsStore';
import { useDialogStore } from '@/store/dialogStore';

export function useSshKeyCheck() {
  const openPassphraseDialog = useDialogStore((s) => s.openPassphraseDialog);

  const resolveKeyPathForRemote = useCallback(
    async (remoteName: string): Promise<string | null> => {
      // Check per-remote key first
      const perRemoteKey = await remoteSshKeysApi.get(remoteName);
      if (perRemoteKey && perRemoteKey !== 'auto') {
        return perRemoteKey;
      }

      // Fall back to global default
      const settings = useSettingsStore.getState().settings;
      return settings?.defaultSshKey ?? null;
    },
    []
  );

  const checkSshKeyForRemote = useCallback(
    async (remoteName: string, onProceed: () => void): Promise<boolean> => {
      try {
        const keyPath = await resolveKeyPathForRemote(remoteName);
        if (!keyPath) {
          // No explicit key configured — proceed (will use ssh-agent or default)
          onProceed();
          return true;
        }

        const format = await sshKeysApi.checkFormat(keyPath);

        if (format === SshKeyFormat.EncryptedPem || format === SshKeyFormat.EncryptedOpenSsh) {
          // Check if passphrase is already cached (e.g. from a previous operation)
          const cached = await sshKeysApi.isPassphraseCached(keyPath);
          if (cached) {
            onProceed();
            return true;
          }

          // Need passphrase — open dialog via store
          openPassphraseDialog({
            keyPath,
            onSuccess: onProceed,
          });
          return false;
        }

        // Unencrypted or unknown — proceed
        onProceed();
        return true;
      } catch (err) {
        console.warn('SSH key check failed, proceeding anyway:', err);
        onProceed();
        return true;
      }
    },
    [resolveKeyPathForRemote, openPassphraseDialog]
  );

  return { checkSshKeyForRemote };
}
