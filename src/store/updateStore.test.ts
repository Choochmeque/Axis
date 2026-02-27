import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateStore } from './updateStore';

const mockCheck = vi.fn();
const mockDownloadAndInstall = vi.fn();
const mockRestart = vi.fn();
const mockListen = vi.fn();

vi.mock('@/services/api', () => ({
  updateApi: {
    check: () => mockCheck(),
    downloadAndInstall: () => mockDownloadAndInstall(),
    restart: () => mockRestart(),
  },
}));

vi.mock('@/bindings/api', () => ({
  events: {
    updateDownloadProgressEvent: {
      listen: (callback: unknown) => mockListen(callback),
    },
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    changeLanguage: vi.fn(),
  },
}));

describe('updateStore', () => {
  beforeEach(() => {
    useUpdateStore.setState({
      updateAvailable: null,
      isChecking: false,
      isDownloading: false,
      downloadProgress: 0,
      isReadyToRestart: false,
      error: null,
      dismissed: false,
    });
    vi.clearAllMocks();
    mockListen.mockResolvedValue(vi.fn());
  });

  describe('checkForUpdate', () => {
    it('should set isChecking while checking', async () => {
      let resolveCheck: (value: null) => void;
      mockCheck.mockReturnValue(
        new Promise((resolve) => {
          resolveCheck = resolve;
        })
      );

      const promise = useUpdateStore.getState().checkForUpdate();
      expect(useUpdateStore.getState().isChecking).toBe(true);

      resolveCheck!(null);
      await promise;

      expect(useUpdateStore.getState().isChecking).toBe(false);
    });

    it('should set updateAvailable when update is found', async () => {
      mockCheck.mockResolvedValue({
        version: '1.2.0',
        date: '2026-01-30',
        body: 'New features',
      });

      await useUpdateStore.getState().checkForUpdate();

      const state = useUpdateStore.getState();
      expect(state.updateAvailable).toEqual({
        version: '1.2.0',
        date: '2026-01-30',
        body: 'New features',
      });
      expect(state.isChecking).toBe(false);
      expect(state.dismissed).toBe(false);
    });

    it('should set updateAvailable to null when no update', async () => {
      mockCheck.mockResolvedValue(null);

      await useUpdateStore.getState().checkForUpdate();

      expect(useUpdateStore.getState().updateAvailable).toBeNull();
      expect(useUpdateStore.getState().isChecking).toBe(false);
    });

    it('should set error on check failure', async () => {
      mockCheck.mockRejectedValue(new Error('Network error'));

      await useUpdateStore.getState().checkForUpdate();

      const state = useUpdateStore.getState();
      expect(state.error).toBe('update.checkFailed');
      expect(state.isChecking).toBe(false);
    });

    it('should not check concurrently', async () => {
      let resolveCheck: (value: null) => void;
      mockCheck.mockReturnValue(
        new Promise((resolve) => {
          resolveCheck = resolve;
        })
      );

      const promise1 = useUpdateStore.getState().checkForUpdate();
      useUpdateStore.getState().checkForUpdate(); // second call should be no-op

      expect(mockCheck).toHaveBeenCalledTimes(1);

      resolveCheck!(null);
      await promise1;
    });
  });

  describe('downloadAndInstall', () => {
    it('should do nothing when no update is available', async () => {
      await useUpdateStore.getState().downloadAndInstall();

      expect(useUpdateStore.getState().isDownloading).toBe(false);
      expect(mockDownloadAndInstall).not.toHaveBeenCalled();
    });

    it('should call downloadAndInstall and set ready to restart', async () => {
      mockDownloadAndInstall.mockResolvedValue(null);

      useUpdateStore.setState({
        updateAvailable: { version: '1.2.0', date: null, body: null },
      });

      await useUpdateStore.getState().downloadAndInstall();

      const state = useUpdateStore.getState();
      expect(state.isDownloading).toBe(false);
      expect(state.isReadyToRestart).toBe(true);
      expect(state.downloadProgress).toBe(100);
      expect(mockDownloadAndInstall).toHaveBeenCalled();
    });

    it('should listen for progress events during download', async () => {
      mockDownloadAndInstall.mockResolvedValue(null);

      useUpdateStore.setState({
        updateAvailable: { version: '1.2.0', date: null, body: null },
      });

      await useUpdateStore.getState().downloadAndInstall();

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(typeof mockListen.mock.calls[0][0]).toBe('function');
    });

    it('should unlisten after download completes', async () => {
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);
      mockDownloadAndInstall.mockResolvedValue(null);

      useUpdateStore.setState({
        updateAvailable: { version: '1.2.0', date: null, body: null },
      });

      await useUpdateStore.getState().downloadAndInstall();

      expect(mockUnlisten).toHaveBeenCalled();
    });

    it('should unlisten after download failure', async () => {
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);
      mockDownloadAndInstall.mockRejectedValue(new Error('Download failed'));

      useUpdateStore.setState({
        updateAvailable: { version: '1.2.0', date: null, body: null },
      });

      await useUpdateStore.getState().downloadAndInstall();

      expect(mockUnlisten).toHaveBeenCalled();
    });

    it('should set error on download failure', async () => {
      mockDownloadAndInstall.mockRejectedValue(new Error('Download failed'));

      useUpdateStore.setState({
        updateAvailable: { version: '1.2.0', date: null, body: null },
      });

      await useUpdateStore.getState().downloadAndInstall();

      const state = useUpdateStore.getState();
      expect(state.error).toBe('update.downloadFailed');
      expect(state.isDownloading).toBe(false);
    });

    it('should not download concurrently', async () => {
      let resolveDownload: () => void;
      mockDownloadAndInstall.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveDownload = resolve;
        })
      );

      useUpdateStore.setState({
        updateAvailable: { version: '1.2.0', date: null, body: null },
      });

      const promise1 = useUpdateStore.getState().downloadAndInstall();
      // Allow the event listener setup (async) to complete
      await Promise.resolve();
      useUpdateStore.getState().downloadAndInstall(); // second call should be no-op

      expect(mockDownloadAndInstall).toHaveBeenCalledTimes(1);

      resolveDownload!();
      await promise1;
    });
  });

  describe('restartApp', () => {
    it('should call restart', async () => {
      mockRestart.mockResolvedValue(null);

      await useUpdateStore.getState().restartApp();

      expect(mockRestart).toHaveBeenCalled();
    });
  });

  describe('dismiss', () => {
    it('should set dismissed to true', () => {
      useUpdateStore.getState().dismiss();

      expect(useUpdateStore.getState().dismissed).toBe(true);
    });
  });
});
