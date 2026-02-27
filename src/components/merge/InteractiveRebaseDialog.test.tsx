import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InteractiveRebaseEntry, InteractiveRebasePreview } from '@/types';
import { InteractiveRebaseDialog } from './InteractiveRebaseDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

const mockTrackOperation = vi.fn();

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  useOperation: () => ({
    trackOperation: mockTrackOperation,
  }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/services/api', () => ({
  rebaseApi: {
    interactiveRebase: vi.fn(),
  },
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: {
    getState: () => ({
      loadCommits: vi.fn(),
      loadBranches: vi.fn(),
    }),
  },
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: {
    getState: () => ({
      loadStatus: vi.fn(),
    }),
  },
}));

const mockEntries: InteractiveRebaseEntry[] = [
  {
    oid: 'abc123',
    shortOid: 'abc123',
    summary: 'First commit',
    action: 'Pick',
    originalIndex: 0,
  },
  {
    oid: 'def456',
    shortOid: 'def456',
    summary: 'Second commit',
    action: 'Pick',
    originalIndex: 1,
  },
];

const mockSignature = {
  name: 'Test Author',
  email: 'test@example.com',
  timestamp: new Date().toISOString(),
};

const mockCommits = [
  {
    oid: 'abc123',
    shortOid: 'abc123',
    message: 'First commit',
    summary: 'First commit',
    author: mockSignature,
    committer: mockSignature,
    parentOids: [],
    timestamp: new Date().toISOString(),
    isMerge: false,
    signature: null,
  },
  {
    oid: 'def456',
    shortOid: 'def456',
    message: 'Second commit',
    summary: 'Second commit',
    author: mockSignature,
    committer: mockSignature,
    parentOids: [],
    timestamp: new Date().toISOString(),
    isMerge: false,
    signature: null,
  },
];

const mockPreview: InteractiveRebasePreview = {
  preview: {
    commitsToRebase: mockCommits,
    mergeBase: {
      oid: '789abc',
      shortOid: '789abc',
      message: 'Merge base commit message',
      summary: 'Merge base commit',
      author: mockSignature,
      committer: mockSignature,
      parentOids: [],
      timestamp: new Date().toISOString(),
      isMerge: false,
      signature: null,
    },
    target: { name: 'main', oid: '789abc', shortOid: '789abc', summary: 'Target commit' },
    targetCommitsAhead: 1,
  },
  entries: mockEntries,
};

let mockStoreState = {
  isOpen: false,
  entries: [] as InteractiveRebaseEntry[],
  onto: 'HEAD~2',
  preview: null as InteractiveRebasePreview | null,
  isLoading: false,
  error: null as string | null,
  close: vi.fn(),
  setEntryAction: vi.fn(),
  moveEntry: vi.fn(),
  reset: vi.fn(),
};

vi.mock('@/store/interactiveRebaseStore', () => ({
  useInteractiveRebaseStore: () => mockStoreState,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 88,
    getVirtualItems: () =>
      mockStoreState.entries.map((_entry, index) => ({
        key: index,
        index,
        size: 44,
        start: index * 44,
      })),
  }),
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
      data-testid="action-select"
    >
      {children}
    </select>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('InteractiveRebaseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      isOpen: false,
      entries: [],
      onto: 'HEAD~2',
      preview: null,
      isLoading: false,
      error: null,
      close: vi.fn(),
      setEntryAction: vi.fn(),
      moveEntry: vi.fn(),
      reset: vi.fn(),
    };
  });

  it('should not render when closed', () => {
    mockStoreState.isOpen = false;

    render(<InteractiveRebaseDialog />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = mockEntries;

    render(<InteractiveRebaseDialog />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('merge.interactiveRebase.title')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockStoreState.isOpen = true;
    mockStoreState.isLoading = true;

    render(<InteractiveRebaseDialog />);

    expect(screen.getByText('merge.interactiveRebase.loadingCommits')).toBeInTheDocument();
  });

  it('should show error alert', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = mockEntries;
    mockStoreState.error = 'Something went wrong';

    render(<InteractiveRebaseDialog />);

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should display rebasing info', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = mockEntries;
    mockStoreState.onto = 'main';

    render(<InteractiveRebaseDialog />);

    expect(
      screen.getByText('merge.interactiveRebase.rebasing {"count":2,"target":"main"}')
    ).toBeInTheDocument();
  });

  it('should render rebase entries', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = mockEntries;

    render(<InteractiveRebaseDialog />);

    expect(screen.getByText('First commit')).toBeInTheDocument();
    expect(screen.getByText('Second commit')).toBeInTheDocument();
  });

  it('should render action legend', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = mockEntries;

    render(<InteractiveRebaseDialog />);

    expect(screen.getByText('merge.interactiveRebase.actions.pick')).toBeInTheDocument();
    expect(screen.getByText('merge.interactiveRebase.actions.reword')).toBeInTheDocument();
    expect(screen.getByText('merge.interactiveRebase.actions.squash')).toBeInTheDocument();
    expect(screen.getByText('merge.interactiveRebase.actions.fixup')).toBeInTheDocument();
    expect(screen.getByText('merge.interactiveRebase.actions.drop')).toBeInTheDocument();
  });

  it('should render cancel and start buttons', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = mockEntries;

    render(<InteractiveRebaseDialog />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('merge.interactiveRebase.startButton')).toBeInTheDocument();
  });

  it('should disable start button when no entries', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = [];

    render(<InteractiveRebaseDialog />);

    const startButton = screen.getByText('merge.interactiveRebase.startButton');
    expect(startButton).toBeDisabled();
  });

  it('should show history warning when preview has commits', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = mockEntries;
    mockStoreState.preview = mockPreview;

    render(<InteractiveRebaseDialog />);

    expect(screen.getByText('merge.interactiveRebase.historyWarning')).toBeInTheDocument();
  });

  it('should show dropped count when some entries are dropped', () => {
    mockStoreState.isOpen = true;
    mockStoreState.entries = [
      ...mockEntries,
      {
        oid: 'ghi789',
        shortOid: 'ghi789',
        summary: 'Dropped commit',
        action: 'Drop',
        originalIndex: 2,
      },
    ];

    render(<InteractiveRebaseDialog />);

    expect(
      screen.getByText('merge.interactiveRebase.willBeDropped {"count":1}')
    ).toBeInTheDocument();
  });
});
