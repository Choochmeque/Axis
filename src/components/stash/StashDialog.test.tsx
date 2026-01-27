import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StashDialog } from './StashDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockSave = vi.fn();
const mockRefreshRepository = vi.fn();
const mockLoadStashes = vi.fn();
const mockTrackOperation = vi.fn();

vi.mock('../../services/api', () => ({
  stashApi: {
    save: (...args: unknown[]) => mockSave(...args),
  },
}));

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    refreshRepository: mockRefreshRepository,
    loadStashes: mockLoadStashes,
  }),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useOperation: () => ({
    trackOperation: async (_opts: Record<string, unknown>, fn: () => Promise<void>) => {
      mockTrackOperation();
      await fn();
    },
  }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/components/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  FormField: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="message-input"
    />
  ),
  CheckboxField: ({
    label,
    checked,
    onCheckedChange,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        data-testid="keep-staged-checkbox"
      />
      {label}
    </label>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('StashDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<StashDialog isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('stash.dialog.title')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('stash.dialog.description')).toBeInTheDocument();
  });

  it('should render message input', () => {
    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('should render keep staged checkbox', () => {
    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('stash.dialog.keepStaged')).toBeInTheDocument();
  });

  it('should render cancel and stash buttons', () => {
    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('stash.dialog.stashButton')).toBeInTheDocument();
  });

  it('should call stashApi.save when stash button clicked', async () => {
    mockSave.mockResolvedValue(undefined);
    mockLoadStashes.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('stash.dialog.stashButton'));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        message: null,
        keepIndex: false,
        includeUntracked: true,
        includeIgnored: false,
      });
    });
  });

  it('should pass message when provided', async () => {
    mockSave.mockResolvedValue(undefined);
    mockLoadStashes.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'WIP: feature' } });
    fireEvent.click(screen.getByText('stash.dialog.stashButton'));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        message: 'WIP: feature',
        keepIndex: false,
        includeUntracked: true,
        includeIgnored: false,
      });
    });
  });

  it('should pass keepIndex when checkbox checked', async () => {
    mockSave.mockResolvedValue(undefined);
    mockLoadStashes.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('keep-staged-checkbox'));
    fireEvent.click(screen.getByText('stash.dialog.stashButton'));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        message: null,
        keepIndex: true,
        includeUntracked: true,
        includeIgnored: false,
      });
    });
  });

  it('should close dialog after successful stash', async () => {
    mockSave.mockResolvedValue(undefined);
    mockLoadStashes.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<StashDialog isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText('stash.dialog.stashButton'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should show error when stash fails', async () => {
    mockSave.mockRejectedValue(new Error('Stash failed'));

    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('stash.dialog.stashButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  it('should track operation', async () => {
    mockSave.mockResolvedValue(undefined);
    mockLoadStashes.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<StashDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('stash.dialog.stashButton'));

    await waitFor(() => {
      expect(mockTrackOperation).toHaveBeenCalled();
    });
  });
});
