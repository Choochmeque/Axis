import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from './settingsStore';

vi.mock('@/services/api', () => ({
  settingsApi: {
    get: vi.fn(),
    save: vi.fn(),
  },
  aiApi: {
    listModels: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    changeLanguage: vi.fn(),
  },
}));

vi.mock('@/store/toastStore', () => ({
  useToastStore: {
    getState: () => ({
      setHistoryCapacity: vi.fn(),
    }),
  },
}));

import { aiApi, settingsApi } from '@/services/api';
import { AiProvider, OpenTarget, SigningFormat, Theme } from '@/types';

describe('settingsStore', () => {
  const mockSettings = {
    theme: Theme.System,
    language: 'system',
    fontSize: 13,
    showLineNumbers: true,
    autoFetchInterval: 5,
    confirmBeforeDiscard: true,
    signCommits: false,
    bypassHooks: false,
    defaultOpenTarget: OpenTarget.Finder,
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

  const emptyModelsCache = { models: [], loading: false, error: null };

  beforeEach(() => {
    vi.useFakeTimers();
    useSettingsStore.setState({
      settings: null,
      isLoading: false,
      error: null,
      aiModelsCache: {
        [AiProvider.OpenAi]: { ...emptyModelsCache },
        [AiProvider.Anthropic]: { ...emptyModelsCache },
        [AiProvider.Ollama]: { ...emptyModelsCache },
      },
    });
    vi.clearAllMocks();

    // Mock document methods
    Object.defineProperty(document.documentElement, 'setAttribute', {
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(document.documentElement.style, 'setProperty', {
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadSettings', () => {
    it('should load settings from API', async () => {
      vi.mocked(settingsApi.get).mockResolvedValue(mockSettings);

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.settings).toEqual(mockSettings);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: typeof mockSettings) => void;
      const pendingPromise = new Promise<typeof mockSettings>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(settingsApi.get).mockReturnValue(pendingPromise);

      const loadPromise = useSettingsStore.getState().loadSettings();

      expect(useSettingsStore.getState().isLoading).toBe(true);

      resolvePromise!(mockSettings);
      await loadPromise;

      expect(useSettingsStore.getState().isLoading).toBe(false);
    });

    it('should use default settings on error', async () => {
      vi.mocked(settingsApi.get).mockRejectedValue(new Error('Failed to load'));

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.settings).not.toBeNull();
      expect(state.error).toBe('store.settings.loadFailed');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should save settings via API', async () => {
      vi.mocked(settingsApi.save).mockResolvedValue(null);
      const newSettings = { ...mockSettings, fontSize: 16 };

      await useSettingsStore.getState().updateSettings(newSettings);

      expect(settingsApi.save).toHaveBeenCalledWith(newSettings);
      expect(useSettingsStore.getState().settings).toEqual(newSettings);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(settingsApi.save).mockRejectedValue(new Error('Save failed'));

      await expect(useSettingsStore.getState().updateSettings(mockSettings)).rejects.toThrow(
        'Save failed'
      );
    });
  });

  describe('setTheme', () => {
    it('should update theme in settings', () => {
      useSettingsStore.setState({ settings: mockSettings });

      useSettingsStore.getState().setTheme(Theme.Dark);

      expect(useSettingsStore.getState().settings?.theme).toBe(Theme.Dark);
    });

    it('should do nothing if no settings loaded', () => {
      useSettingsStore.setState({ settings: null });

      useSettingsStore.getState().setTheme(Theme.Dark);

      expect(useSettingsStore.getState().settings).toBeNull();
    });
  });

  describe('getEffectiveTheme', () => {
    it('should return dark when theme is Dark', () => {
      useSettingsStore.setState({ settings: { ...mockSettings, theme: Theme.Dark } });

      expect(useSettingsStore.getState().getEffectiveTheme()).toBe('dark');
    });

    it('should return light when theme is Light', () => {
      useSettingsStore.setState({ settings: { ...mockSettings, theme: Theme.Light } });

      expect(useSettingsStore.getState().getEffectiveTheme()).toBe('light');
    });

    it('should return system preference when theme is System', () => {
      useSettingsStore.setState({ settings: { ...mockSettings, theme: Theme.System } });

      // The jsdom mock returns true for prefers-color-scheme: dark
      const result = useSettingsStore.getState().getEffectiveTheme();
      expect(['light', 'dark']).toContain(result);
    });

    it('should default to System theme when no settings', () => {
      useSettingsStore.setState({ settings: null });

      // Should follow system preference
      const result = useSettingsStore.getState().getEffectiveTheme();
      expect(['light', 'dark']).toContain(result);
    });
  });

  describe('AI Models Cache', () => {
    it('should return empty cache for provider by default', () => {
      const cache = useSettingsStore.getState().getAiModels(AiProvider.OpenAi);

      expect(cache.models).toEqual([]);
      expect(cache.loading).toBe(false);
      expect(cache.error).toBeNull();
    });

    it('should load models and cache them', async () => {
      const mockModels = ['gpt-4o', 'gpt-4o-mini'];
      vi.mocked(aiApi.listModels).mockResolvedValue(mockModels);

      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);

      const cache = useSettingsStore.getState().getAiModels(AiProvider.OpenAi);
      expect(cache.models).toEqual(mockModels);
      expect(cache.loading).toBe(false);
      expect(cache.error).toBeNull();
    });

    it('should not reload cached models without force', async () => {
      const mockModels = ['gpt-4o', 'gpt-4o-mini'];
      vi.mocked(aiApi.listModels).mockResolvedValue(mockModels);

      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);
      vi.mocked(aiApi.listModels).mockClear();

      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);

      expect(aiApi.listModels).not.toHaveBeenCalled();
    });

    it('should reload models with force=true', async () => {
      const initialModels = ['gpt-4o'];
      const updatedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'];
      vi.mocked(aiApi.listModels).mockResolvedValue(initialModels);

      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);
      vi.mocked(aiApi.listModels).mockResolvedValue(updatedModels);

      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi, true);

      const cache = useSettingsStore.getState().getAiModels(AiProvider.OpenAi);
      expect(cache.models).toEqual(updatedModels);
      expect(aiApi.listModels).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when loading models', async () => {
      vi.mocked(aiApi.listModels).mockRejectedValue(new Error('API error'));

      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);

      const cache = useSettingsStore.getState().getAiModels(AiProvider.OpenAi);
      expect(cache.models).toEqual([]);
      expect(cache.loading).toBe(false);
      expect(cache.error).toBe('API error');
    });

    it('should cache models separately per provider', async () => {
      const openAiModels = ['gpt-4o', 'gpt-4o-mini'];
      const anthropicModels = ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'];

      vi.mocked(aiApi.listModels)
        .mockResolvedValueOnce(openAiModels)
        .mockResolvedValueOnce(anthropicModels);

      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);
      await useSettingsStore.getState().loadAiModels(AiProvider.Anthropic);

      expect(useSettingsStore.getState().getAiModels(AiProvider.OpenAi).models).toEqual(
        openAiModels
      );
      expect(useSettingsStore.getState().getAiModels(AiProvider.Anthropic).models).toEqual(
        anthropicModels
      );
    });

    it('should clear all cached models', async () => {
      const mockModels = ['gpt-4o'];
      vi.mocked(aiApi.listModels).mockResolvedValue(mockModels);

      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);
      useSettingsStore.getState().clearAiModelsCache();

      const cache = useSettingsStore.getState().getAiModels(AiProvider.OpenAi);
      expect(cache.models).toEqual([]);
    });

    it('should set loading state while fetching', async () => {
      let resolvePromise: (value: string[]) => void;
      const pendingPromise = new Promise<string[]>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(aiApi.listModels).mockReturnValue(pendingPromise);

      const loadPromise = useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);

      expect(useSettingsStore.getState().getAiModels(AiProvider.OpenAi).loading).toBe(true);

      resolvePromise!(['gpt-4o']);
      await loadPromise;

      expect(useSettingsStore.getState().getAiModels(AiProvider.OpenAi).loading).toBe(false);
    });

    it('should not start loading if already loading', async () => {
      let resolvePromise: (value: string[]) => void;
      const pendingPromise = new Promise<string[]>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(aiApi.listModels).mockReturnValue(pendingPromise);

      // Start first load
      const loadPromise1 = useSettingsStore.getState().loadAiModels(AiProvider.OpenAi);

      // Try to start second load while first is in progress
      await useSettingsStore.getState().loadAiModels(AiProvider.OpenAi, true);

      // Should only have called once
      expect(aiApi.listModels).toHaveBeenCalledTimes(1);

      resolvePromise!(['gpt-4o']);
      await loadPromise1;
    });
  });
});
