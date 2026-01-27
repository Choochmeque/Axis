import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MergeDialog } from './MergeDialog';
import { BranchType } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockMerge = vi.fn();
const mockAbort = vi.fn();
const mockList = vi.fn();
const mockTrackOperation = vi.fn();
const mockSetCurrentView = vi.fn();
const mockLoadCommits = vi.fn();
const mockLoadStatus = vi.fn();

vi.mock('../../services/api', () => ({
  mergeApi: {
    merge: (...args: unknown[]) => mockMerge(...args),
    abort: () => mockAbort(),
  },
  branchApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      setCurrentView: mockSetCurrentView,
      loadCommits: mockLoadCommits,
      loadStatus: mockLoadStatus,
    }),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useOperation: () => ({
    trackOperation: async (_opts: Record<string, unknown>, fn: () => Promise<unknown>) => {
      mockTrackOperation();
      return fn();
    },
  }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
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
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="branch-select"
    >
      <option value="">{''}</option>
      {children}
    </select>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  Textarea: ({
    value,
    onChange,
    placeholder,
    id,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    id?: string;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid={id || 'textarea'}
    />
  ),
  CheckboxField: ({
    label,
    checked,
    onCheckedChange,
    id,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id?: string;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        data-testid={id || 'checkbox'}
      />
      {label}
    </label>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('MergeDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentBranch: 'main',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([
      {
        name: 'feature-branch',
        fullName: 'feature-branch',
        branchType: BranchType.Local,
        isHead: false,
      },
      { name: 'develop', fullName: 'develop', branchType: BranchType.Local, isHead: false },
    ]);
  });

  it('should not render when closed', () => {
    render(<MergeDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<MergeDialog {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('merge.dialog.title')).toBeInTheDocument();
  });

  it('should display current branch', () => {
    render(<MergeDialog {...defaultProps} />);

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('merge.dialog.mergeInto')).toBeInTheDocument();
  });

  it('should render branch select', async () => {
    render(<MergeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });
  });

  it('should render merge message textarea', () => {
    render(<MergeDialog {...defaultProps} />);

    expect(screen.getByText('merge.dialog.commitMessage')).toBeInTheDocument();
    expect(screen.getByTestId('merge-message')).toBeInTheDocument();
  });

  it('should render merge options', () => {
    render(<MergeDialog {...defaultProps} />);

    expect(screen.getByText('merge.dialog.noFastForward')).toBeInTheDocument();
    expect(screen.getByText('merge.dialog.squash')).toBeInTheDocument();
    expect(screen.getByText('merge.dialog.commitImmediately')).toBeInTheDocument();
  });

  it('should render cancel and merge buttons', () => {
    render(<MergeDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('merge.dialog.mergeButton')).toBeInTheDocument();
  });

  it('should disable merge button when no branch selected', () => {
    render(<MergeDialog {...defaultProps} />);

    const mergeButton = screen.getByText('merge.dialog.mergeButton');
    expect(mergeButton).toBeDisabled();
  });

  it('should call mergeApi.merge when merge button clicked', async () => {
    mockMerge.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<MergeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'feature-branch' } });
    fireEvent.click(screen.getByText('merge.dialog.mergeButton'));

    await waitFor(() => {
      expect(mockMerge).toHaveBeenCalledWith({
        branch: 'feature-branch',
        message: null,
        noFf: false,
        ffOnly: false,
        squash: false,
        noCommit: false,
      });
    });
  });

  it('should close dialog after successful merge', async () => {
    mockMerge.mockResolvedValue({ success: true, conflicts: [], message: '' });
    const onClose = vi.fn();

    render(<MergeDialog {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'feature-branch' } });
    fireEvent.click(screen.getByText('merge.dialog.mergeButton'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should show error when merge fails', async () => {
    mockMerge.mockRejectedValue(new Error('Merge failed'));

    render(<MergeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'feature-branch' } });
    fireEvent.click(screen.getByText('merge.dialog.mergeButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  it('should track operation', async () => {
    mockMerge.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<MergeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'feature-branch' } });
    fireEvent.click(screen.getByText('merge.dialog.mergeButton'));

    await waitFor(() => {
      expect(mockTrackOperation).toHaveBeenCalled();
    });
  });

  it('should pre-select source branch when provided', async () => {
    render(<MergeDialog {...defaultProps} sourceBranch="feature-branch" />);

    await waitFor(() => {
      const select = screen.getByTestId('branch-select') as HTMLSelectElement;
      expect(select.value).toBe('feature-branch');
    });
  });

  it('should load branches when dialog opens', async () => {
    render(<MergeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(true, true);
    });
  });
});
