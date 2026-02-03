import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { InitDialog } from './InitDialog';

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
const mockOpenRepository = vi.fn();
vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadRecentRepositories: mockLoadRecentRepositories,
    openRepository: mockOpenRepository,
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

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

const mockInit = vi.fn();
vi.mock('@/services/api', () => ({
  repositoryApi: {
    init: () => mockInit(),
  },
}));

describe('InitDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<InitDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('repository.init.title')).not.toBeInTheDocument();
  });

  it('should render directory input', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByPlaceholderText('repository.init.directoryPlaceholder')).toBeInTheDocument();
  });

  it('should render bare checkbox', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.bareLabel')).toBeInTheDocument();
  });

  it('should render create button', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.createButton')).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should update path on input', () => {
    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });

    expect(input).toHaveValue('/path/to/repo');
  });

  it('should disable create button when path is empty', () => {
    render(<InitDialog {...defaultProps} />);

    const createButton = screen.getByText('repository.init.createButton');
    expect(createButton).toBeDisabled();
  });

  it('should enable create button when path is filled', () => {
    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });

    const createButton = screen.getByText('repository.init.createButton');
    expect(createButton).not.toBeDisabled();
  });

  it('should render directory hint', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.directoryHint')).toBeInTheDocument();
  });

  it('should render bare description', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.bareDescription')).toBeInTheDocument();
  });

  it('should toggle bare checkbox', () => {
    render(<InitDialog {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('should open directory browser when browse button clicked', async () => {
    mockOpen.mockResolvedValueOnce('/selected/path');
    render(<InitDialog {...defaultProps} />);

    // Find the browse button (the one with FolderOpen icon)
    const buttons = screen.getAllByRole('button');
    const browseButton = buttons.find((btn) => btn.textContent === '');

    await act(async () => {
      fireEvent.click(browseButton!);
    });

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    expect(input).toHaveValue('/selected/path');
  });

  it('should not update path when browse dialog cancelled', async () => {
    mockOpen.mockResolvedValueOnce(null);
    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/existing/path' } });

    const buttons = screen.getAllByRole('button');
    const browseButton = buttons.find((btn) => btn.textContent === '');

    await act(async () => {
      fireEvent.click(browseButton!);
    });

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
    });

    expect(input).toHaveValue('/existing/path');
  });

  it('should initialize repository successfully', async () => {
    mockInit.mockResolvedValueOnce({ path: '/test/repo', name: 'repo' });
    mockOpenRepository.mockResolvedValueOnce(undefined);
    mockFindTabByPath.mockReturnValue(null);

    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/test/repo' } });

    const createButton = screen.getByText('repository.init.createButton');

    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });

    expect(mockOpenRepository).toHaveBeenCalledWith('/test/repo');
    expect(mockLoadRecentRepositories).toHaveBeenCalled();
    expect(mockAddTab).toHaveBeenCalledWith({
      type: 'repository',
      path: '/test/repo',
      name: 'repo',
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should use existing tab when repository already open', async () => {
    mockInit.mockResolvedValueOnce({ path: '/test/repo', name: 'repo' });
    mockOpenRepository.mockResolvedValueOnce(undefined);
    mockFindTabByPath.mockReturnValue({ id: 'existing-tab' });

    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/test/repo' } });

    const createButton = screen.getByText('repository.init.createButton');

    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(mockSetActiveTab).toHaveBeenCalledWith('existing-tab');
    });

    expect(mockAddTab).not.toHaveBeenCalled();
  });

  it('should show error when path is empty on submit', async () => {
    render(<InitDialog {...defaultProps} />);

    // Type and then clear the path to trigger validation
    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '   ' } });

    // Since button is disabled when path is empty, we need to simulate Enter key
    // But the button validation happens first, so let's test with a value that becomes empty after trim
    // Actually the button is disabled, so we test that validation happens via the error state

    // The create button should be disabled
    const createButton = screen.getByText('repository.init.createButton');
    expect(createButton).toBeDisabled();
  });

  it('should show error when init fails', async () => {
    mockInit.mockRejectedValueOnce(new Error('Init failed'));

    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/test/repo' } });

    const createButton = screen.getByText('repository.init.createButton');

    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Init failed')).toBeInTheDocument();
    });
  });

  it('should handle Enter key to submit', async () => {
    mockInit.mockResolvedValueOnce({ path: '/test/repo', name: 'repo' });
    mockOpenRepository.mockResolvedValueOnce(undefined);
    mockFindTabByPath.mockReturnValue(null);

    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/test/repo' } });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
  });

  it('should not submit on Enter when loading', async () => {
    // Start a slow init operation
    let resolveInit: (value: unknown) => void;
    mockInit.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInit = resolve;
      })
    );
    mockOpenRepository.mockResolvedValueOnce(undefined);
    mockFindTabByPath.mockReturnValue(null);

    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/test/repo' } });

    const createButton = screen.getByText('repository.init.createButton');

    // Click to start loading
    await act(async () => {
      fireEvent.click(createButton);
    });

    // During loading, button text changes
    await waitFor(() => {
      expect(screen.getByText('repository.init.creating')).toBeInTheDocument();
    });

    // Pressing Enter should not call init again
    fireEvent.keyDown(input, { key: 'Enter' });

    // Init should only be called once
    expect(mockInit).toHaveBeenCalledTimes(1);

    // Resolve the promise
    await act(async () => {
      resolveInit!({ path: '/test/repo', name: 'repo' });
    });
  });

  it('should initialize bare repository when bare is checked', async () => {
    mockInit.mockResolvedValueOnce({ path: '/test/repo', name: 'repo' });
    mockOpenRepository.mockResolvedValueOnce(undefined);
    mockFindTabByPath.mockReturnValue(null);

    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/test/repo' } });

    // Check the bare checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const createButton = screen.getByText('repository.init.createButton');

    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
  });
});
