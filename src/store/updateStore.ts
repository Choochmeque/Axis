import { create } from 'zustand';
import { events } from '@/bindings/api';
import i18n from '@/i18n';
import { updateApi } from '@/services/api';
import type { UpdateInfo } from '@/types';

interface UpdateState {
  updateAvailable: UpdateInfo | null;
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isReadyToRestart: boolean;
  error: string | null;
  dismissed: boolean;

  checkForUpdate: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  restartApp: () => Promise<void>;
  dismiss: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateAvailable: null,
  isChecking: false,
  isDownloading: false,
  downloadProgress: 0,
  isReadyToRestart: false,
  error: null,
  dismissed: false,

  checkForUpdate: async () => {
    if (get().isChecking) return;
    set({ isChecking: true, error: null });
    try {
      const info = await updateApi.check();
      if (info) {
        set({
          updateAvailable: info,
          isChecking: false,
          dismissed: false,
        });
      } else {
        set({ updateAvailable: null, isChecking: false });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      set({
        error: i18n.t('update.checkFailed'),
        isChecking: false,
      });
    }
  },

  downloadAndInstall: async () => {
    if (!get().updateAvailable || get().isDownloading) return;
    set({ isDownloading: true, downloadProgress: 0, error: null });

    let totalBytes = 0;
    let downloadedBytes = 0;

    const unlisten = await events.updateDownloadProgressEvent.listen((event) => {
      const { downloaded, total } = event.payload;
      downloadedBytes += downloaded;
      if (total && total > 0) {
        totalBytes = total;
      }
      if (totalBytes > 0) {
        set({ downloadProgress: Math.round((downloadedBytes / totalBytes) * 100) });
      }
    });

    try {
      await updateApi.downloadAndInstall();
      set({ downloadProgress: 100, isDownloading: false, isReadyToRestart: true });
    } catch (error) {
      console.error('Failed to download update:', error);
      set({
        error: i18n.t('update.downloadFailed'),
        isDownloading: false,
      });
    } finally {
      unlisten();
    }
  },

  restartApp: async () => {
    await updateApi.restart();
  },

  dismiss: () => {
    set({ dismissed: true });
  },
}));
