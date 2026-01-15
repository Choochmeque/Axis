import { create } from 'zustand';
import { SigningFormat, Theme } from '@/types';
import type { AppSettings, Theme as ThemeType } from '@/types';
import { settingsApi } from '@/services/api';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  showSettings: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  setTheme: (theme: ThemeType) => void;
  getEffectiveTheme: () => 'light' | 'dark';
  setShowSettings: (show: boolean) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.System,
  fontSize: 12,
  showLineNumbers: true,
  autoFetchInterval: 0,
  confirmBeforeDiscard: true,
  signCommits: false,
  signingFormat: SigningFormat.Gpg,
  signingKey: null,
  gpgProgram: null,
  sshProgram: null,
  diffContextLines: 3,
  diffWordWrap: false,
  diffSideBySide: false,
  spellCheckCommitMessages: false,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,
  showSettings: false,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsApi.get();
      set({ settings, isLoading: false });
      applySettings(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ settings: DEFAULT_SETTINGS, isLoading: false, error: 'Failed to load settings' });
      applySettings(DEFAULT_SETTINGS);
    }
  },

  updateSettings: async (settings: AppSettings) => {
    try {
      await settingsApi.save(settings);
      set({ settings });
      applySettings(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  setTheme: (theme: ThemeType) => {
    const { settings } = get();
    if (settings) {
      const newSettings = { ...settings, theme };
      set({ settings: newSettings });
      applySettings(newSettings);
    }
  },

  getEffectiveTheme: () => {
    const { settings } = get();
    const theme = settings?.theme || Theme.System;
    if (theme === Theme.System) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme === Theme.Dark ? 'dark' : 'light';
  },

  setShowSettings: (show: boolean) => set({ showSettings: show }),
}));

function applySettings(settings: AppSettings) {
  // Apply theme
  const effectiveTheme =
    settings.theme === Theme.System
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : settings.theme === Theme.Dark
        ? 'dark'
        : 'light';

  document.documentElement.setAttribute('data-theme', effectiveTheme);

  // Apply font size
  document.documentElement.style.setProperty('--app-font-size', `${settings.fontSize}px`);
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { settings } = useSettingsStore.getState();
    if (settings?.theme === Theme.System) {
      applySettings(settings);
    }
  });
}
