import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SshKeyFormat } from '@/types';
import { useSshKeyCheck } from './useSshKeyCheck';

const mockRemoteSshKeysGet = vi.fn();
const mockSshKeysCheckFormat = vi.fn();
const mockSshKeysIsPassphraseCached = vi.fn();
const mockOpenPassphraseDialog = vi.fn();
const mockGetState = vi.fn();

vi.mock('@/services/api', () => ({
  remoteSshKeysApi: {
    get: (remote: string) => mockRemoteSshKeysGet(remote),
  },
  sshKeysApi: {
    checkFormat: (path: string) => mockSshKeysCheckFormat(path),
    isPassphraseCached: (path: string) => mockSshKeysIsPassphraseCached(path),
  },
}));

vi.mock('@/store/dialogStore', () => ({
  useDialogStore: (selector: (state: unknown) => unknown) => {
    const state = {
      openPassphraseDialog: mockOpenPassphraseDialog,
    };
    return selector(state);
  },
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => mockGetState(),
  },
}));

describe('useSshKeyCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({
      settings: { defaultSshKey: null },
    });
  });

  describe('checkSshKeyForRemote', () => {
    it('should proceed when no key is configured', async () => {
      mockRemoteSshKeysGet.mockResolvedValue(null);
      mockGetState.mockReturnValue({ settings: { defaultSshKey: null } });

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(true);
      expect(onProceed).toHaveBeenCalled();
      expect(mockSshKeysCheckFormat).not.toHaveBeenCalled();
    });

    it('should use per-remote key when available', async () => {
      mockRemoteSshKeysGet.mockResolvedValue('/path/to/remote-key');
      mockSshKeysCheckFormat.mockResolvedValue(SshKeyFormat.Unencrypted);

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      await act(async () => {
        await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(mockRemoteSshKeysGet).toHaveBeenCalledWith('origin');
      expect(mockSshKeysCheckFormat).toHaveBeenCalledWith('/path/to/remote-key');
      expect(onProceed).toHaveBeenCalled();
    });

    it('should fall back to global default key when remote key is auto', async () => {
      mockRemoteSshKeysGet.mockResolvedValue('auto');
      mockGetState.mockReturnValue({ settings: { defaultSshKey: '/path/to/default-key' } });
      mockSshKeysCheckFormat.mockResolvedValue(SshKeyFormat.Unencrypted);

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      await act(async () => {
        await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(mockSshKeysCheckFormat).toHaveBeenCalledWith('/path/to/default-key');
      expect(onProceed).toHaveBeenCalled();
    });

    it('should fall back to global default key when no per-remote key', async () => {
      mockRemoteSshKeysGet.mockResolvedValue(null);
      mockGetState.mockReturnValue({ settings: { defaultSshKey: '/path/to/default-key' } });
      mockSshKeysCheckFormat.mockResolvedValue(SshKeyFormat.Unencrypted);

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      await act(async () => {
        await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(mockSshKeysCheckFormat).toHaveBeenCalledWith('/path/to/default-key');
      expect(onProceed).toHaveBeenCalled();
    });

    it('should proceed for unencrypted key', async () => {
      mockRemoteSshKeysGet.mockResolvedValue('/path/to/key');
      mockSshKeysCheckFormat.mockResolvedValue(SshKeyFormat.Unencrypted);

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(true);
      expect(onProceed).toHaveBeenCalled();
      expect(mockOpenPassphraseDialog).not.toHaveBeenCalled();
    });

    it('should proceed for encrypted key with cached passphrase', async () => {
      mockRemoteSshKeysGet.mockResolvedValue('/path/to/key');
      mockSshKeysCheckFormat.mockResolvedValue(SshKeyFormat.EncryptedPem);
      mockSshKeysIsPassphraseCached.mockResolvedValue(true);

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(true);
      expect(onProceed).toHaveBeenCalled();
      expect(mockSshKeysIsPassphraseCached).toHaveBeenCalledWith('/path/to/key');
      expect(mockOpenPassphraseDialog).not.toHaveBeenCalled();
    });

    it('should open passphrase dialog for encrypted PEM key without cached passphrase', async () => {
      mockRemoteSshKeysGet.mockResolvedValue('/path/to/key');
      mockSshKeysCheckFormat.mockResolvedValue(SshKeyFormat.EncryptedPem);
      mockSshKeysIsPassphraseCached.mockResolvedValue(false);

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(false);
      expect(onProceed).not.toHaveBeenCalled();
      expect(mockOpenPassphraseDialog).toHaveBeenCalledWith({
        keyPath: '/path/to/key',
        onSuccess: onProceed,
      });
    });

    it('should open passphrase dialog for encrypted OpenSSH key without cached passphrase', async () => {
      mockRemoteSshKeysGet.mockResolvedValue('/path/to/key');
      mockSshKeysCheckFormat.mockResolvedValue(SshKeyFormat.EncryptedOpenSsh);
      mockSshKeysIsPassphraseCached.mockResolvedValue(false);

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(false);
      expect(onProceed).not.toHaveBeenCalled();
      expect(mockOpenPassphraseDialog).toHaveBeenCalledWith({
        keyPath: '/path/to/key',
        onSuccess: onProceed,
      });
    });

    it('should proceed for unknown key format', async () => {
      mockRemoteSshKeysGet.mockResolvedValue('/path/to/key');
      mockSshKeysCheckFormat.mockResolvedValue(SshKeyFormat.Unknown);

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(true);
      expect(onProceed).toHaveBeenCalled();
    });

    it('should proceed on error and log warning', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockRemoteSshKeysGet.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(true);
      expect(onProceed).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'SSH key check failed, proceeding anyway:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should proceed on checkFormat error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockRemoteSshKeysGet.mockResolvedValue('/path/to/key');
      mockSshKeysCheckFormat.mockRejectedValue(new Error('Format check failed'));

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(true);
      expect(onProceed).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle null settings gracefully', async () => {
      mockRemoteSshKeysGet.mockResolvedValue(null);
      mockGetState.mockReturnValue({ settings: null });

      const { result } = renderHook(() => useSshKeyCheck());
      const onProceed = vi.fn();

      let returnValue: boolean;
      await act(async () => {
        returnValue = await result.current.checkSshKeyForRemote('origin', onProceed);
      });

      expect(returnValue!).toBe(true);
      expect(onProceed).toHaveBeenCalled();
    });
  });
});
