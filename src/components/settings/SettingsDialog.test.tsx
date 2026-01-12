import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsDialog } from './SettingsDialog';
import { settingsApi } from '../../services/api';

// Mock window.matchMedia before importing the settings store
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock the API
vi.mock('../../services/api', () => ({
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
}));

// Mock the settings store
const mockUpdateSettings = vi.fn();
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      updateSettings: mockUpdateSettings,
    };
    return selector ? selector(state) : state;
  }),
}));

const mockSettings = {
  theme: 'dark' as const,
  font_size: 13,
  show_line_numbers: true,
  default_branch_name: 'main',
  auto_fetch_interval: 0,
  confirm_before_discard: true,
  sign_commits: false,
  signing_format: 'gpg' as const,
  signing_key: undefined,
  gpg_program: undefined,
  ssh_program: undefined,
  diff_context_lines: 3,
  diff_word_wrap: false,
  diff_side_by_side: false,
  commit_message_width: 72,
  spell_check_commit_messages: false,
  terminal_font_family: 'monospace',
  terminal_font_size: 13,
};

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.get).mockResolvedValue(mockSettings);
    vi.mocked(settingsApi.save).mockResolvedValue();
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
      expect(screen.getByText('Terminal')).toBeInTheDocument();
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
      expect(screen.getByText('Default Branch Name')).toBeInTheDocument();
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
    fireEvent.change(themeSelect, { target: { value: 'light' } });

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
    fireEvent.change(themeSelect, { target: { value: 'light' } });

    // Click save
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to save settings')).toBeInTheDocument();
    });
  });

  it('should reset changes when reset is clicked', async () => {
    render(<SettingsDialog isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Get the theme select
    const themeSelect = screen.getByLabelText('Theme') as HTMLSelectElement;
    expect(themeSelect.value).toBe('dark');

    // Change it
    fireEvent.change(themeSelect, { target: { value: 'light' } });
    expect(themeSelect.value).toBe('light');

    // Click reset
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));

    // Should be back to original
    await waitFor(() => {
      expect(themeSelect.value).toBe('dark');
    });
  });
});
