import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloneDialog } from './CloneDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockOpen = vi.fn();
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: () => mockOpen(),
}));

const mockLoadRecentRepositories = vi.fn();
vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadRecentRepositories: mockLoadRecentRepositories,
  }),
}));

const mockAddTab = vi.fn();
const mockFindTabByPath = vi.fn();
const mockSetActiveTab = vi.fn();
vi.mock('@/store/tabsStore', () => ({
  /* eslint-disable @typescript-eslint/naming-convention -- Matches actual enum exports */
  TabType: { Repository: 'repository' },
  /* eslint-enable @typescript-eslint/naming-convention */
  useTabsStore: () => ({
    addTab: mockAddTab,
    findTabByPath: mockFindTabByPath,
    setActiveTab: mockSetActiveTab,
  }),
}));

const mockTrackOperation = vi.fn((_opts, fn) => fn());
vi.mock('@/hooks', () => ({
  useOperation: () => ({
    trackOperation: mockTrackOperation,
  }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

const mockClone = vi.fn();
vi.mock('@/services/api', () => ({
  repositoryApi: {
    clone: () => mockClone(),
  },
}));

describe('CloneDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByText('repository.clone.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<CloneDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('repository.clone.title')).not.toBeInTheDocument();
  });

  it('should render URL input', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByPlaceholderText('repository.clone.urlPlaceholder')).toBeInTheDocument();
  });

  it('should render destination input', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(
      screen.getByPlaceholderText('repository.clone.destinationPlaceholder')
    ).toBeInTheDocument();
  });

  it('should render clone button', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByText('repository.clone.cloneButton')).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should update URL on input', () => {
    render(<CloneDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    fireEvent.change(input, { target: { value: 'https://github.com/user/repo.git' } });

    expect(input).toHaveValue('https://github.com/user/repo.git');
  });

  it('should disable clone button when URL is empty', () => {
    render(<CloneDialog {...defaultProps} />);

    const cloneButton = screen.getByText('repository.clone.cloneButton');
    expect(cloneButton).toBeDisabled();
  });

  it('should enable clone button when URL and path are filled', () => {
    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/path/to/repo' } });

    const cloneButton = screen.getByText('repository.clone.cloneButton');
    expect(cloneButton).not.toBeDisabled();
  });

  it('should render URL hint', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByText('repository.clone.urlHint')).toBeInTheDocument();
  });

  it('should auto-fill path from URL with .git extension', async () => {
    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    await act(async () => {
      fireEvent.change(urlInput, { target: { value: 'https://github.com/user/my-repo.git' } });
    });

    await waitFor(() => {
      const value = (pathInput as HTMLInputElement).value;
      expect(value).toContain('my-repo');
    });
  });

  it('should auto-fill path from URL without .git extension', async () => {
    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    await act(async () => {
      fireEvent.change(urlInput, { target: { value: 'https://github.com/user/another-repo' } });
    });

    await waitFor(() => {
      const value = (pathInput as HTMLInputElement).value;
      expect(value).toContain('another-repo');
    });
  });

  it('should not auto-fill path if path already has value', async () => {
    render(<CloneDialog {...defaultProps} />);

    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');
    fireEvent.change(pathInput, { target: { value: '/custom/path' } });

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });

    // Path should remain custom
    expect(pathInput).toHaveValue('/custom/path');
  });

  it('should open directory browser when browse button clicked', async () => {
    mockOpen.mockResolvedValueOnce('/selected/parent');
    render(<CloneDialog {...defaultProps} />);

    // Set URL first so repo name can be extracted
    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });

    // Find the browse button (button without text content, after inputs)
    const buttons = screen.getAllByRole('button');
    const browseButton = buttons.find((btn) => btn.textContent === '');

    await act(async () => {
      fireEvent.click(browseButton!);
    });

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
    });

    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');
    expect(pathInput).toHaveValue('/selected/parent/repo');
  });

  it('should set path without repo name when URL not set', async () => {
    mockOpen.mockResolvedValueOnce('/selected/parent');
    render(<CloneDialog {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const browseButton = buttons.find((btn) => btn.textContent === '');

    await act(async () => {
      fireEvent.click(browseButton!);
    });

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
    });

    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');
    expect(pathInput).toHaveValue('/selected/parent');
  });

  it('should not update path when browse dialog cancelled', async () => {
    mockOpen.mockResolvedValueOnce(null);
    render(<CloneDialog {...defaultProps} />);

    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');
    fireEvent.change(pathInput, { target: { value: '/existing/path' } });

    const buttons = screen.getAllByRole('button');
    const browseButton = buttons.find((btn) => btn.textContent === '');

    await act(async () => {
      fireEvent.click(browseButton!);
    });

    expect(pathInput).toHaveValue('/existing/path');
  });

  it('should clone repository successfully', async () => {
    mockClone.mockResolvedValueOnce({ path: '/cloned/repo', name: 'repo' });
    mockFindTabByPath.mockReturnValue(null);

    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/cloned/repo' } });

    const cloneButton = screen.getByText('repository.clone.cloneButton');

    await act(async () => {
      fireEvent.click(cloneButton);
    });

    await waitFor(() => {
      expect(mockClone).toHaveBeenCalled();
    });

    expect(mockLoadRecentRepositories).toHaveBeenCalled();
    expect(mockAddTab).toHaveBeenCalledWith({
      type: 'repository',
      path: '/cloned/repo',
      name: 'repo',
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should use existing tab when repository already open', async () => {
    mockClone.mockResolvedValueOnce({ path: '/cloned/repo', name: 'repo' });
    mockFindTabByPath.mockReturnValue({ id: 'existing-tab' });

    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/cloned/repo' } });

    const cloneButton = screen.getByText('repository.clone.cloneButton');

    await act(async () => {
      fireEvent.click(cloneButton);
    });

    await waitFor(() => {
      expect(mockSetActiveTab).toHaveBeenCalledWith('existing-tab');
    });

    expect(mockAddTab).not.toHaveBeenCalled();
  });

  it('should show error when clone fails', async () => {
    mockClone.mockRejectedValueOnce(new Error('Clone failed'));

    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/cloned/repo' } });

    const cloneButton = screen.getByText('repository.clone.cloneButton');

    await act(async () => {
      fireEvent.click(cloneButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Clone failed')).toBeInTheDocument();
    });
  });

  it('should handle Enter key to submit', async () => {
    mockClone.mockResolvedValueOnce({ path: '/cloned/repo', name: 'repo' });
    mockFindTabByPath.mockReturnValue(null);

    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/cloned/repo' } });

    await act(async () => {
      fireEvent.keyDown(urlInput, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(mockClone).toHaveBeenCalled();
    });
  });

  it('should show loading state during clone', async () => {
    let resolveClone: (value: unknown) => void;
    mockClone.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveClone = resolve;
      })
    );
    mockFindTabByPath.mockReturnValue(null);

    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/cloned/repo' } });

    const cloneButton = screen.getByText('repository.clone.cloneButton');

    await act(async () => {
      fireEvent.click(cloneButton);
    });

    await waitFor(() => {
      expect(screen.getByText('repository.clone.cloning')).toBeInTheDocument();
      expect(screen.getByText('repository.clone.cloningMessage')).toBeInTheDocument();
    });

    // Resolve the promise
    await act(async () => {
      resolveClone!({ path: '/cloned/repo', name: 'repo' });
    });
  });

  it('should not submit when Enter pressed while loading', async () => {
    let resolveClone: (value: unknown) => void;
    mockClone.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveClone = resolve;
      })
    );
    mockFindTabByPath.mockReturnValue(null);

    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/cloned/repo' } });

    const cloneButton = screen.getByText('repository.clone.cloneButton');

    await act(async () => {
      fireEvent.click(cloneButton);
    });

    // During loading, pressing Enter should not start another clone
    fireEvent.keyDown(urlInput, { key: 'Enter' });

    expect(mockClone).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveClone!({ path: '/cloned/repo', name: 'repo' });
    });
  });

  it('should disable buttons during clone', async () => {
    let resolveClone: (value: unknown) => void;
    mockClone.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveClone = resolve;
      })
    );
    mockFindTabByPath.mockReturnValue(null);

    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/cloned/repo' } });

    const cloneButton = screen.getByText('repository.clone.cloneButton');

    await act(async () => {
      fireEvent.click(cloneButton);
    });

    await waitFor(() => {
      // Cancel button should be disabled
      expect(screen.getByText('common.cancel')).toBeDisabled();
      // Clone button should be disabled and show loading text
      expect(screen.getByText('repository.clone.cloning')).toBeDisabled();
    });

    await act(async () => {
      resolveClone!({ path: '/cloned/repo', name: 'repo' });
    });
  });
});
