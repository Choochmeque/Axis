import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { RecentRepository } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockLoadRecentRepositories = vi.fn();
const mockOpenRepository = vi.fn();
const mockPinRepository = vi.fn();
const mockUnpinRepository = vi.fn();

const createMockState = () => ({
  recentRepositories: [] as RecentRepository[],
  loadRecentRepositories: mockLoadRecentRepositories,
  openRepository: mockOpenRepository,
  pinRepository: mockPinRepository,
  unpinRepository: mockUnpinRepository,
});

let mockState = createMockState();

vi.mock('../store/repositoryStore', () => ({
  useRepositoryStore: Object.assign(
    (selector?: (state: ReturnType<typeof createMockState>) => unknown) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    },
    {
      getState: () => mockState,
    }
  ),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatTimeAgo: (date: string) => `${date} ago`,
}));

vi.mock('@/lib/pathUtils', () => ({
  truncatePath: (path: string) => path,
}));

vi.mock('./repository/CloneDialog', () => ({
  CloneDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="clone-dialog">Clone Dialog</div> : null,
}));

vi.mock('./repository/InitDialog', () => ({
  InitDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="init-dialog">Init Dialog</div> : null,
}));

vi.mock('./repository/RecentRepoContextMenu', () => ({
  RecentRepoContextMenu: () => null,
}));

vi.mock('./repository/RepoCard', () => ({
  RepoCard: ({ repo, onClick }: { repo: RecentRepository; onClick: (path: string) => void }) => (
    <button
      data-testid={`repo-card-${repo.name}`}
      onClick={() => onClick(repo.path)}
      disabled={!repo.exists}
    >
      <span>{repo.name}</span>
      {repo.currentBranch && <span data-testid={`branch-${repo.name}`}>{repo.currentBranch}</span>}
      {!repo.exists && <span data-testid={`missing-${repo.name}`}>missing</span>}
      <span>{repo.displayPath}</span>
    </button>
  ),
}));

vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/ui');
  return {
    ...actual,
    ContextMenuRoot: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ContextMenuPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-content">{children}</div>
    ),
    VirtualList: <T,>({
      items,
      children,
      getItemKey,
      emptyMessage,
    }: {
      items: T[];
      children: (item: T, index: number) => React.ReactNode;
      getItemKey: (item: T, index: number) => string | number;
      emptyMessage?: string;
    }) => (
      <div data-testid="virtual-list">
        {items.length === 0 && emptyMessage && <div>{emptyMessage}</div>}
        {items.map((item, index) => (
          <div key={getItemKey(item, index)}>{children(item, index)}</div>
        ))}
      </div>
    ),
  };
});

// Import after mocks
import { WelcomeView } from './WelcomeView';

function makeRepo(
  overrides: Partial<RecentRepository> & { name: string; path: string }
): RecentRepository {
  return {
    lastOpened: '2024-01-01',
    exists: true,
    currentBranch: 'main',
    isPinned: false,
    displayPath: overrides.path,
    ...overrides,
  };
}

describe('WelcomeView', () => {
  beforeEach(() => {
    mockState = createMockState();
    vi.clearAllMocks();
  });

  it('should render welcome title', () => {
    render(<WelcomeView />);

    expect(screen.getByText('welcome.title')).toBeInTheDocument();
    expect(screen.getByText('welcome.subtitle')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(<WelcomeView />);

    expect(screen.getByText('welcome.newRepository')).toBeInTheDocument();
    expect(screen.getByText('welcome.openRepository')).toBeInTheDocument();
    expect(screen.getByText('welcome.cloneRepository')).toBeInTheDocument();
  });

  it('should load recent repositories on mount', () => {
    render(<WelcomeView />);

    expect(mockLoadRecentRepositories).toHaveBeenCalled();
  });

  it('should not show repository sections when empty', () => {
    mockState.recentRepositories = [];

    render(<WelcomeView />);

    expect(screen.queryByText('welcome.recentRepositories')).not.toBeInTheDocument();
    expect(screen.queryByText('welcome.pinnedRepositories')).not.toBeInTheDocument();
    expect(screen.getByText('welcome.noRecentRepositories')).toBeInTheDocument();
  });

  it('should show recent repositories when available', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'project-one', path: '/path/to/project-one', lastOpened: '2024-01-01' }),
      makeRepo({ name: 'project-two', path: '/path/to/project-two', lastOpened: '2024-01-02' }),
    ];

    render(<WelcomeView />);

    expect(screen.getByText('welcome.recentRepositories')).toBeInTheDocument();
    expect(screen.getByText('project-one')).toBeInTheDocument();
    expect(screen.getByText('project-two')).toBeInTheDocument();
  });

  it('should display repository paths', () => {
    mockState.recentRepositories = [makeRepo({ name: 'my-repo', path: '~/Projects/my-repo' })];

    render(<WelcomeView />);

    expect(screen.getByText('~/Projects/my-repo')).toBeInTheDocument();
  });

  it('should open init dialog when new repository clicked', async () => {
    render(<WelcomeView />);

    const newRepoButton = screen.getByText('welcome.newRepository');
    fireEvent.click(newRepoButton);

    await waitFor(() => {
      expect(screen.getByTestId('init-dialog')).toBeInTheDocument();
    });
  });

  it('should open clone dialog when clone repository clicked', async () => {
    render(<WelcomeView />);

    const cloneButton = screen.getByText('welcome.cloneRepository');
    fireEvent.click(cloneButton);

    await waitFor(() => {
      expect(screen.getByTestId('clone-dialog')).toBeInTheDocument();
    });
  });

  it('should show search input when repos exist', () => {
    mockState.recentRepositories = [makeRepo({ name: 'my-repo', path: '/path/my-repo' })];

    render(<WelcomeView />);

    expect(screen.getByPlaceholderText('welcome.searchPlaceholder')).toBeInTheDocument();
  });

  it('should filter repos by name via search', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'alpha-project', path: '/path/alpha' }),
      makeRepo({ name: 'beta-project', path: '/path/beta' }),
    ];

    render(<WelcomeView />);

    const searchInput = screen.getByPlaceholderText('welcome.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'alpha' } });

    expect(screen.getByText('alpha-project')).toBeInTheDocument();
    expect(screen.queryByText('beta-project')).not.toBeInTheDocument();
  });

  it('should filter repos by path via search', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'repo-a', path: '/home/user/work/repo-a', displayPath: '~/work/repo-a' }),
      makeRepo({
        name: 'repo-b',
        path: '/home/user/personal/repo-b',
        displayPath: '~/personal/repo-b',
      }),
    ];

    render(<WelcomeView />);

    const searchInput = screen.getByPlaceholderText('welcome.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'personal' } });

    expect(screen.queryByText('repo-a')).not.toBeInTheDocument();
    expect(screen.getByText('repo-b')).toBeInTheDocument();
  });

  it('should filter repos by branch via search', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'repo-a', path: '/path/a', currentBranch: 'feature/login' }),
      makeRepo({ name: 'repo-b', path: '/path/b', currentBranch: 'main' }),
    ];

    render(<WelcomeView />);

    const searchInput = screen.getByPlaceholderText('welcome.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'feature' } });

    expect(screen.getByText('repo-a')).toBeInTheDocument();
    expect(screen.queryByText('repo-b')).not.toBeInTheDocument();
  });

  it('should show no results message when search has no matches', () => {
    mockState.recentRepositories = [makeRepo({ name: 'my-repo', path: '/path/my-repo' })];

    render(<WelcomeView />);

    const searchInput = screen.getByPlaceholderText('welcome.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('welcome.noResults')).toBeInTheDocument();
  });

  it('should show pinned section when pinned repos exist', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'pinned-repo', path: '/path/pinned', isPinned: true }),
      makeRepo({ name: 'recent-repo', path: '/path/recent', isPinned: false }),
    ];

    render(<WelcomeView />);

    expect(screen.getByText('welcome.pinnedRepositories')).toBeInTheDocument();
    expect(screen.getByText('welcome.recentRepositories')).toBeInTheDocument();
  });

  it('should not show pinned section when no pinned repos', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'recent-repo', path: '/path/recent', isPinned: false }),
    ];

    render(<WelcomeView />);

    expect(screen.queryByText('welcome.pinnedRepositories')).not.toBeInTheDocument();
    expect(screen.getByText('welcome.recentRepositories')).toBeInTheDocument();
  });

  it('should separate pinned from recent repos', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'pinned-one', path: '/path/p1', isPinned: true }),
      makeRepo({ name: 'recent-one', path: '/path/r1', isPinned: false }),
    ];

    render(<WelcomeView />);

    expect(screen.getByTestId('repo-card-pinned-one')).toBeInTheDocument();
    expect(screen.getByTestId('repo-card-recent-one')).toBeInTheDocument();
  });

  it('should search across both pinned and recent repos', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'pinned-alpha', path: '/path/pa', isPinned: true }),
      makeRepo({ name: 'pinned-beta', path: '/path/pb', isPinned: true }),
      makeRepo({ name: 'recent-alpha', path: '/path/ra', isPinned: false }),
    ];

    render(<WelcomeView />);

    const searchInput = screen.getByPlaceholderText('welcome.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'alpha' } });

    expect(screen.getByText('pinned-alpha')).toBeInTheDocument();
    expect(screen.queryByText('pinned-beta')).not.toBeInTheDocument();
    expect(screen.getByText('recent-alpha')).toBeInTheDocument();
  });

  it('should hide pinned section when search filters out all pinned repos', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'pinned-repo', path: '/path/pinned', isPinned: true }),
      makeRepo({ name: 'matching-recent', path: '/path/matching', isPinned: false }),
    ];

    render(<WelcomeView />);

    const searchInput = screen.getByPlaceholderText('welcome.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'matching' } });

    expect(screen.queryByText('welcome.pinnedRepositories')).not.toBeInTheDocument();
    expect(screen.getByText('matching-recent')).toBeInTheDocument();
  });

  it('should sort repos by name', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'charlie', path: '/path/c', lastOpened: '2024-01-03' }),
      makeRepo({ name: 'alpha', path: '/path/a', lastOpened: '2024-01-01' }),
      makeRepo({ name: 'bravo', path: '/path/b', lastOpened: '2024-01-02' }),
    ];

    render(<WelcomeView />);

    // Change sort to name
    const sortSelect = screen.getByRole('combobox');
    fireEvent.click(sortSelect);
    const nameOption = screen.getByText('common.name');
    fireEvent.click(nameOption);

    const cards = screen.getAllByTestId(/^repo-card-/);
    expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-alpha');
    expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-bravo');
    expect(cards[2]).toHaveAttribute('data-testid', 'repo-card-charlie');
  });

  it('should sort repos by path', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'repo-c', path: '/z/path', displayPath: '~/z/path' }),
      makeRepo({ name: 'repo-a', path: '/a/path', displayPath: '~/a/path' }),
    ];

    render(<WelcomeView />);

    const sortSelect = screen.getByRole('combobox');
    fireEvent.click(sortSelect);
    const pathOption = screen.getByText('common.path');
    fireEvent.click(pathOption);

    const cards = screen.getAllByTestId(/^repo-card-/);
    expect(cards[0]).toHaveAttribute('data-testid', 'repo-card-repo-a');
    expect(cards[1]).toHaveAttribute('data-testid', 'repo-card-repo-c');
  });

  it('should show missing repos as disabled', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'missing-repo', path: '/path/gone', exists: false, currentBranch: null }),
    ];

    render(<WelcomeView />);

    const card = screen.getByTestId('repo-card-missing-repo');
    expect(card).toBeDisabled();
    expect(screen.getByTestId('missing-missing-repo')).toBeInTheDocument();
  });

  it('should show branch badge for existing repos', () => {
    mockState.recentRepositories = [
      makeRepo({ name: 'my-repo', path: '/path/repo', currentBranch: 'develop' }),
    ];

    render(<WelcomeView />);

    expect(screen.getByTestId('branch-my-repo')).toHaveTextContent('develop');
  });

  it('should use VirtualList for recent repos', () => {
    mockState.recentRepositories = [makeRepo({ name: 'repo-1', path: '/path/1', isPinned: false })];

    render(<WelcomeView />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });
});
