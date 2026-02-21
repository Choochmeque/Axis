import { create } from 'zustand';
import i18n from '@/i18n';

import { settingsApi } from '@/services/api';
import { useToastStore } from '@/store/toastStore';
import { AiProvider, SigningFormat, Theme } from '@/types';
import type { AppSettings, Theme as ThemeType } from '@/types';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  setTheme: (theme: ThemeType) => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.System,
  language: 'system',
  fontSize: 13,
  showLineNumbers: true,
  autoFetchInterval: 5,
  confirmBeforeDiscard: true,
  signCommits: false,
  bypassHooks: false,
  signingFormat: SigningFormat.Gpg,
  signingKey: null,
  gpgProgram: null,
  sshProgram: null,
  diffContextLines: 3,
  diffWordWrap: true,
  diffSideBySide: false,
  spellCheckCommitMessages: false,
  conventionalCommitsEnabled: false,
  conventionalCommitsScopes: null,
  aiEnabled: false,
  aiProvider: AiProvider.OpenAi,
  aiModel: null,
  aiOllamaUrl: null,
  defaultSshKey: null,
  notificationHistoryCapacity: 50,
  gravatarEnabled: false,
  autoUpdateEnabled: true,
  largeBinaryWarningEnabled: true,
  largeBinaryThreshold: 10485760,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsApi.get();
      set({ settings, isLoading: false });
      applySettings(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        error: i18n.t('store.settings.loadFailed'),
      });
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

  // Apply notification history capacity
  useToastStore.getState().setHistoryCapacity(settings.notificationHistoryCapacity);

  // Apply language
  if (settings.language === 'system') {
    i18n.changeLanguage();
  } else {
    i18n.changeLanguage(settings.language);
  }
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
