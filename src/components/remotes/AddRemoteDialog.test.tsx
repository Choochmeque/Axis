import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddRemoteDialog } from './AddRemoteDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockAdd = vi.fn();
const mockLoadBranches = vi.fn();

vi.mock('../../services/api', () => ({
  remoteApi: {
    add: (name: string, url: string) => mockAdd(name, url),
  },
}));

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { loadBranches: mockLoadBranches };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

describe('AddRemoteDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<AddRemoteDialog {...defaultProps} />);

    expect(screen.getByText('remotes.add.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<AddRemoteDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('remotes.add.title')).not.toBeInTheDocument();
  });

  it('should have name input field', () => {
    render(<AddRemoteDialog {...defaultProps} />);

    expect(screen.getByText('remotes.add.nameLabel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('remotes.add.namePlaceholder')).toBeInTheDocument();
  });

  it('should have URL input field', () => {
    render(<AddRemoteDialog {...defaultProps} />);

    expect(screen.getByText('remotes.add.urlLabel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('remotes.add.urlPlaceholder')).toBeInTheDocument();
  });

  it('should have cancel and add buttons', () => {
    render(<AddRemoteDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('remotes.add.addButton')).toBeInTheDocument();
  });

  it('should disable add button when fields are empty', () => {
    render(<AddRemoteDialog {...defaultProps} />);

    const addButton = screen.getByText('remotes.add.addButton');
    expect(addButton.closest('button')).toBeDisabled();
  });

  it('should enable add button when both fields filled', () => {
    render(<AddRemoteDialog {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('remotes.add.namePlaceholder');
    const urlInput = screen.getByPlaceholderText('remotes.add.urlPlaceholder');

    fireEvent.change(nameInput, { target: { value: 'origin' } });
    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });

    const addButton = screen.getByText('remotes.add.addButton');
    expect(addButton.closest('button')).not.toBeDisabled();
  });

  it('should call remoteApi.add with correct values', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);

    render(<AddRemoteDialog {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('remotes.add.namePlaceholder');
    const urlInput = screen.getByPlaceholderText('remotes.add.urlPlaceholder');

    fireEvent.change(nameInput, { target: { value: 'upstream' } });
    fireEvent.change(urlInput, { target: { value: 'https://github.com/org/repo.git' } });

    const addButton = screen.getByText('remotes.add.addButton');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith('upstream', 'https://github.com/org/repo.git');
    });
  });

  it('should reload branches and close after successful add', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);

    render(<AddRemoteDialog {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('remotes.add.namePlaceholder');
    const urlInput = screen.getByPlaceholderText('remotes.add.urlPlaceholder');

    fireEvent.change(nameInput, { target: { value: 'origin' } });
    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });

    const addButton = screen.getByText('remotes.add.addButton');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockLoadBranches).toHaveBeenCalled();
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should show error when add fails', async () => {
    mockAdd.mockRejectedValue(new Error('Failed to add remote'));

    render(<AddRemoteDialog {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('remotes.add.namePlaceholder');
    const urlInput = screen.getByPlaceholderText('remotes.add.urlPlaceholder');

    fireEvent.change(nameInput, { target: { value: 'origin' } });
    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });

    const addButton = screen.getByText('remotes.add.addButton');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to add remote')).toBeInTheDocument();
    });
  });

  it('should show error when name is empty', async () => {
    render(<AddRemoteDialog {...defaultProps} />);

    // Add button should be disabled, but test validation message if somehow triggered
    const urlInput = screen.getByPlaceholderText('remotes.add.urlPlaceholder');
    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });

    // Button still disabled because name empty
    const addButton = screen.getByText('remotes.add.addButton');
    expect(addButton.closest('button')).toBeDisabled();
  });

  it('should clear fields when dialog reopens', () => {
    const { rerender } = render(<AddRemoteDialog {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('remotes.add.namePlaceholder');
    const urlInput = screen.getByPlaceholderText('remotes.add.urlPlaceholder');

    fireEvent.change(nameInput, { target: { value: 'origin' } });
    fireEvent.change(urlInput, { target: { value: 'https://github.com' } });

    // Close and reopen
    rerender(<AddRemoteDialog {...defaultProps} open={false} />);
    rerender(<AddRemoteDialog {...defaultProps} open={true} />);

    expect(screen.getByPlaceholderText('remotes.add.namePlaceholder')).toHaveValue('');
    expect(screen.getByPlaceholderText('remotes.add.urlPlaceholder')).toHaveValue('');
  });
});
