import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { BranchType } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  naturalCompare: (a: string, b: string) => a.localeCompare(b),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  testId: (id: string) => ({ 'aria-label': id, 'data-testid': id }),
}));

const mockRepositoryStore = {
  repository: { path: '/test/repo', name: 'test-repo', isUnborn: false },
  branches: [
    {
      name: 'main',
      branchType: BranchType.Local,
      isHead: true,
      targetOid: 'abc123',
      ahead: 0,
      behind: 0,
    },
    {
      name: 'feature',
      branchType: BranchType.Local,
      isHead: false,
      targetOid: 'def456',
      ahead: 2,
      behind: 1,
    },
    { name: 'origin/main', branchType: BranchType.Remote, isHead: false, targetOid: 'abc123' },
  ],
  tags: [{ name: 'v1.0.0', targetOid: 'tag123' }],
  stashes: [{ stashRef: 'stash@{0}', message: 'WIP changes', index: 0 }],
  remotes: [{ name: 'origin', url: 'https://github.com/test/repo' }],
  submodules: [{ name: 'sub1', path: 'libs/sub1', status: 'Current' }],
  worktrees: [
    { path: '/test/repo', branch: 'main', isMain: true, shortOid: 'abc1234', isLocked: false },
  ],
  status: { staged: [], unstaged: ['file.ts'], untracked: ['new.ts'] },
  currentView: 'file-status',
  selectedStash: null,
  setCurrentView: vi.fn(),
  selectCommit: vi.fn(),
  setScrollTarget: vi.fn(),
  selectStash: vi.fn(),
  clearStashSelection: vi.fn(),
  loadTags: vi.fn(),
  loadBranches: vi.fn(),
  loadCommits: vi.fn(),
  loadStatus: vi.fn(),
  checkoutBranch: vi.fn(),
  switchRepository: vi.fn(),
};

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: () => mockRepositoryStore,
}));

vi.mock('../../store/stagingStore', () => ({
  useStagingStore: {
    getState: () => ({ reset: vi.fn() }),
  },
}));

vi.mock('../../store/lfsStore', () => ({
  useLfsStore: Object.assign(
    () => ({ status: { isInstalled: true, isInitialized: true, lfsFilesCount: 3 } }),
    { getState: () => ({ loadStatus: vi.fn(), reset: vi.fn() }) }
  ),
}));

vi.mock('../../store/integrationStore', () => ({
  useIntegrationStore: Object.assign(
    () => ({
      detectedProvider: null,
      connectionStatus: null,
      pullRequests: [],
      issues: [],
      ciRuns: [],
      unreadCount: 0,
      isLoadingPrs: false,
      isLoadingIssues: false,
      isLoadingCiRuns: false,
      isLoadingNotifications: false,
      reloadPullRequests: vi.fn(),
      reloadIssues: vi.fn(),
      reloadCiRuns: vi.fn(),
      reloadNotifications: vi.fn(),
    }),
    {
      getState: () => ({
        detectProvider: vi.fn(),
        reset: vi.fn(),
        clearPrView: vi.fn(),
        clearIssueView: vi.fn(),
        clearCiView: vi.fn(),
      }),
      setState: vi.fn(),
    }
  ),
  initIntegrationListeners: vi.fn(),
}));

vi.mock('../../store/dialogStore', () => ({
  useDialogStore: () => ({
    openTagDialog: vi.fn(),
    openCreateBranchDialog: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  tagApi: { push: vi.fn(), delete: vi.fn() },
  branchApi: { checkout: vi.fn() },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: Error) => err.message,
}));

vi.mock('@radix-ui/react-scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui', () => ({
  TreeView: ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (props: unknown) => React.ReactNode;
  }) => (
    <div data-testid="tree-view">
      {data.map((node, i) => (
        <div key={i}>
          {renderItem({ node, depth: 0, isExpanded: false, toggleExpand: vi.fn() })}
        </div>
      ))}
    </div>
  ),
  buildTreeFromPaths: () => [],
  ContextMenuRoot: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuPortal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-menu">{children}</div>
  ),
  MenuItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button onClick={onSelect}>{children}</button>
  ),
}));

vi.mock('../branches', () => ({
  BranchContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RemoteBranchContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../tags/TagContextMenu', () => ({
  TagContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../remotes/AddRemoteDialog', () => ({
  AddRemoteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-remote-dialog">Add Remote</div> : null,
}));

vi.mock('../submodules/AddSubmoduleDialog', () => ({
  AddSubmoduleDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-submodule-dialog">Add Submodule</div> : null,
}));

vi.mock('../stash', () => ({
  StashContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../worktrees', () => ({
  AddWorktreeDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-worktree-dialog">Add Worktree</div> : null,
  WorktreeContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepositoryStore.repository = { path: '/test/repo', name: 'test-repo', isUnborn: false };
    mockRepositoryStore.currentView = 'file-status';
    mockRepositoryStore.selectedStash = null;
  });

  it('should render workspace section', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.sections.workspace')).toBeInTheDocument();
  });

  it('should render file status view item', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.views.fileStatus')).toBeInTheDocument();
  });

  it('should render history view item', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.views.history')).toBeInTheDocument();
  });

  it('should render search view item', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.views.search')).toBeInTheDocument();
  });

  it('should render reflog view item', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.views.reflog')).toBeInTheDocument();
  });

  it('should render branches section', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.sections.branches')).toBeInTheDocument();
  });

  it('should display local branch names', () => {
    render(<Sidebar />);

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('should show ahead/behind badges for branches', () => {
    render(<Sidebar />);

    expect(screen.getByText('2↑')).toBeInTheDocument();
    expect(screen.getByText('1↓')).toBeInTheDocument();
  });

  it('should render tags section', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.sections.tags')).toBeInTheDocument();
  });

  it('should render stashes section', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.sections.stashes')).toBeInTheDocument();
  });

  it('should render worktrees section', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.sections.worktrees')).toBeInTheDocument();
  });

  it('should render submodules section', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.sections.submodules')).toBeInTheDocument();
  });

  it('should display changes count badge', () => {
    render(<Sidebar />);

    // unstaged: 1, untracked: 1 = 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should change view when clicking file status', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByText('sidebar.views.fileStatus'));

    expect(mockRepositoryStore.setCurrentView).toHaveBeenCalledWith('file-status');
  });

  it('should change view when clicking history', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByText('sidebar.views.history'));

    expect(mockRepositoryStore.setCurrentView).toHaveBeenCalledWith('history');
  });

  it('should change view when clicking search', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByText('sidebar.views.search'));

    expect(mockRepositoryStore.setCurrentView).toHaveBeenCalledWith('search');
  });

  it('should show no repository message when repository is null', () => {
    mockRepositoryStore.repository = null as never;

    render(<Sidebar />);

    expect(screen.getByText('sidebar.noRepository')).toBeInTheDocument();
    expect(screen.getByText('sidebar.noRepositoryHint')).toBeInTheDocument();
  });

  it('should display stash message when expanded', () => {
    render(<Sidebar />);

    // Expand stashes section (collapsed by default)
    fireEvent.click(screen.getByText('sidebar.sections.stashes'));

    expect(screen.getByText('WIP changes')).toBeInTheDocument();
  });

  it('should select stash when clicking it', () => {
    render(<Sidebar />);

    // Expand stashes section first
    fireEvent.click(screen.getByText('sidebar.sections.stashes'));
    fireEvent.click(screen.getByText('WIP changes'));

    expect(mockRepositoryStore.selectStash).toHaveBeenCalled();
  });

  it('should show LFS view item', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.views.gitLfs')).toBeInTheDocument();
  });

  it('should render remotes section', () => {
    render(<Sidebar />);

    expect(screen.getByText('sidebar.sections.remotes')).toBeInTheDocument();
  });

  it('should display submodule name when expanded', () => {
    render(<Sidebar />);

    // Expand submodules section (collapsed by default)
    fireEvent.click(screen.getByText('sidebar.sections.submodules'));

    expect(screen.getByText('sub1')).toBeInTheDocument();
  });

  it('should display worktree branch name when expanded', () => {
    render(<Sidebar />);

    // Expand worktrees section (collapsed by default)
    fireEvent.click(screen.getByText('sidebar.sections.worktrees'));

    // Should show main branch in both branches and worktrees sections
    expect(screen.getAllByText('main').length).toBeGreaterThanOrEqual(2);
  });

  it('should clear stash selection when changing view', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByText('sidebar.views.history'));

    expect(mockRepositoryStore.clearStashSelection).toHaveBeenCalled();
  });
});
