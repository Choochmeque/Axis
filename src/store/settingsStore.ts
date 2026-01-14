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
  fontSize: 13,
  showLineNumbers: true,
  defaultBranchName: 'main',
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
  commitMessageWidth: 72,
  spellCheckCommitMessages: false,
  terminalFontFamily: 'monospace',
  terminalFontSize: 13,
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
      // Apply theme on load
      applyTheme(settings.theme);
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ settings: DEFAULT_SETTINGS, isLoading: false, error: 'Failed to load settings' });
      applyTheme(DEFAULT_SETTINGS.theme);
    }
  },

  updateSettings: async (settings: AppSettings) => {
    try {
      await settingsApi.save(settings);
      set({ settings });
      applyTheme(settings.theme);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  setTheme: (theme: ThemeType) => {
    const { settings } = get();
    if (settings) {
      set({ settings: { ...settings, theme } });
      applyTheme(theme);
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

function applyTheme(theme: ThemeType) {
  const effectiveTheme =
    theme === Theme.System
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme === Theme.Dark
        ? 'dark'
        : 'light';

  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { settings } = useSettingsStore.getState();
    if (settings?.theme === Theme.System) {
      applyTheme(Theme.System);
    }
  });
}
