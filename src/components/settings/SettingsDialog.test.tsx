import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsDialog } from './SettingsDialog';
import { settingsApi } from '@/services/api';
import { AiProvider, SigningFormat, Theme } from '@/types';

// Mock the API
vi.mock('@/services/api', () => ({
  settingsApi: {
    get: vi.fn(),
    save: vi.fn(),
  },
  signingApi: {
    listGpgKeys: vi.fn().mockResolvedValue([]),
    listSshKeys: vi.fn().mockResolvedValue([]),
    getConfig: vi.fn().mockResolvedValue({}),
    testSigning: vi.fn().mockResolvedValue({ success: true }),
  },
  sshKeysApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  lfsApi: {
    getGitEnvironment: vi.fn().mockResolvedValue({
      gitVersion: '2.40.0',
      gitPath: '/usr/bin/git',
      libgit2Version: '1.7.0',
      lfsInstalled: false,
      lfsVersion: null,
    }),
  },
  avatarApi: {
    clearCache: vi.fn().mockResolvedValue(undefined),
  },
  aiApi: {
    hasApiKey: vi.fn().mockResolvedValue(false),
    listOllamaModels: vi.fn().mockResolvedValue([]),
  },
}));

// Mock the settings store
const mockUpdateSettings = vi.fn();
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      updateSettings: mockUpdateSettings,
    };
    return selector ? selector(state) : state;
  }),
}));

const mockSettings = {
  theme: Theme.Dark,
  language: 'system',
  fontSize: 12,
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
  diffWordWrap: false,
  diffSideBySide: false,
  spellCheckCommitMessages: false,
  conventionalCommitsEnabled: false,
  conventionalCommitsScopes: null,
  notificationHistoryCapacity: 50,
  aiEnabled: false,
  aiProvider: AiProvider.OpenAi,
  aiModel: null,
  aiOllamaUrl: null,
  defaultSshKey: null,
  gravatarEnabled: false,
};

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.get).mockResolvedValue(mockSettings);
    vi.mocked(settingsApi.save).mockResolvedValue(null);
    mockUpdateSettings.mockResolvedValue(undefined);
  });

  it('should not render when not open', () => {
    render(<SettingsDialog isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('should render when open', async () => {
    render(<SettingsDialog isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('should load settings on open', async () => {
    render(<SettingsDialog isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(settingsApi.get).toHaveBeenCalled();
    });
  });

  it('should show tabs for different settings categories', async () => {
    render(<SettingsDialog isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Git')).toBeInTheDocument();
      expect(screen.getByText('Diff & Editor')).toBeInTheDocument();
    });
  });

  it('should switch tabs when clicked', async () => {
    render(<SettingsDialog isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });

    // Click on Git tab
    fireEvent.click(screen.getByText('Git'));

    await waitFor(() => {
      expect(screen.getByText('Auto-fetch Interval (minutes)')).toBeInTheDocument();
    });
  });

  it('should call onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<SettingsDialog isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('should save settings when save is clicked', async () => {
    const onClose = vi.fn();
    render(<SettingsDialog isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Change a setting to enable save button
    const themeSelect = screen.getByLabelText('Theme');
    fireEvent.click(themeSelect);
    fireEvent.click(await screen.findByRole('option', { name: 'Light' }));

    // Click save
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it('should show error when save fails', async () => {
    mockUpdateSettings.mockRejectedValue(new Error('Save failed'));

    render(<SettingsDialog isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Change a setting
    const themeSelect = screen.getByLabelText('Theme');
    fireEvent.click(themeSelect);
    fireEvent.click(await screen.findByRole('option', { name: 'Light' }));

    // Click save
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('should reset changes when reset is clicked', async () => {
    render(<SettingsDialog isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Get the theme select
    const themeSelect = screen.getByLabelText('Theme');
    expect(themeSelect).toHaveTextContent('Dark');

    // Change it
    fireEvent.click(themeSelect);
    fireEvent.click(await screen.findByRole('option', { name: 'Light' }));
    expect(themeSelect).toHaveTextContent('Light');

    // Click reset
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));

    // Should be back to original
    await waitFor(() => {
      expect(themeSelect).toHaveTextContent('Dark');
    });
  });
});
