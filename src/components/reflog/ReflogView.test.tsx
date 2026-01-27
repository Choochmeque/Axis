import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReflogView } from './ReflogView';
import { ReflogAction } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatTimestamp: (timestamp: number) => `formatted-${timestamp}`,
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn(),
}));

const mockList = vi.fn();
const mockCount = vi.fn();
const mockRefs = vi.fn();
const mockCheckout = vi.fn();

vi.mock('@/services/api', () => ({
  reflogApi: {
    list: (opts: unknown) => mockList(opts),
    count: (ref: string) => mockCount(ref),
    refs: () => mockRefs(),
    checkout: (ref: string) => mockCheckout(ref),
  },
  branchApi: {
    create: vi.fn(),
  },
}));

const mockLoadBranches = vi.fn();
const mockLoadCommits = vi.fn();

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadBranches: mockLoadBranches,
    loadCommits: mockLoadCommits,
  }),
}));

vi.mock('@/components/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  VirtualList: ({
    items,
    children,
    isLoading,
    emptyMessage,
  }: {
    items: unknown[];
    children: (item: unknown) => React.ReactNode;
    isLoading: boolean;
    emptyMessage: string;
  }) => {
    if (isLoading) return <div data-testid="loading">Loading...</div>;
    if (items.length === 0) return <div data-testid="empty">{emptyMessage}</div>;
    return (
      <div data-testid="virtual-list">
        {items.map((item, i) => (
          <div key={i} data-testid="reflog-entry">
            {children(item)}
          </div>
        ))}
      </div>
    );
  },
}));

describe('ReflogView', () => {
  const mockEntries = [
    {
      reflogRef: 'HEAD@{0}',
      newOid: 'abc123456789',
      shortNewOid: 'abc1234',
      oldOid: 'def123456789',
      action: ReflogAction.Commit,
      message: 'Add new feature',
      committerName: 'John Doe',
      timestamp: 1705328400,
    },
    {
      reflogRef: 'HEAD@{1}',
      newOid: 'def123456789',
      shortNewOid: 'def1234',
      oldOid: 'ghi123456789',
      action: ReflogAction.Checkout,
      message: 'checkout: moving from main to feature',
      committerName: 'Jane Smith',
      timestamp: 1705324800,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(mockEntries);
    mockCount.mockResolvedValue(2);
    mockRefs.mockResolvedValue(['HEAD', 'refs/heads/main', 'refs/heads/feature']);
  });

  it('should render reflog title', async () => {
    render(<ReflogView />);

    await waitFor(() => {
      expect(screen.getByText('reflog.title')).toBeInTheDocument();
    });
  });

  it('should load and display reflog entries', async () => {
    render(<ReflogView />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });

  it('should display entry count', async () => {
    render(<ReflogView />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should render ref selector', async () => {
    render(<ReflogView />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  it('should load available refs', async () => {
    render(<ReflogView />);

    await waitFor(() => {
      expect(mockRefs).toHaveBeenCalled();
    });
  });

  it('should change ref when selector changes', async () => {
    render(<ReflogView />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'refs/heads/main' },
    });

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ refname: 'refs/heads/main' })
      );
    });
  });

  it('should show empty message when no entries', async () => {
    mockList.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    render(<ReflogView />);

    await waitFor(() => {
      expect(screen.getByTestId('empty')).toBeInTheDocument();
      expect(screen.getByText('reflog.noEntries')).toBeInTheDocument();
    });
  });

  it('should refresh when refresh button clicked', async () => {
    render(<ReflogView />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    const callCountBefore = mockList.mock.calls.length;

    fireEvent.click(screen.getByTitle('common.refresh'));

    await waitFor(() => {
      expect(mockList.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  it('should render reflog entries', async () => {
    render(<ReflogView />);

    await waitFor(() => {
      const entries = screen.getAllByTestId('reflog-entry');
      expect(entries).toHaveLength(2);
    });
  });

  it('should show loading state initially', async () => {
    mockList.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockEntries), 100))
    );

    render(<ReflogView />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });
});
