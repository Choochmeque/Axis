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

const createMockState = () => ({
  recentRepositories: [] as RecentRepository[],
  loadRecentRepositories: mockLoadRecentRepositories,
  openRepository: mockOpenRepository,
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

vi.mock('./repository/CloneDialog', () => ({
  CloneDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="clone-dialog">Clone Dialog</div> : null,
}));

vi.mock('./repository/InitDialog', () => ({
  InitDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="init-dialog">Init Dialog</div> : null,
}));

vi.mock('./repository/RecentRepoContextMenu', () => ({
  RecentRepoContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import after mocks
import { WelcomeView } from './WelcomeView';

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

  it('should not show recent repositories section when empty', () => {
    mockState.recentRepositories = [];

    render(<WelcomeView />);

    expect(screen.queryByText('welcome.recentRepositories')).not.toBeInTheDocument();
  });

  it('should show recent repositories when available', () => {
    mockState.recentRepositories = [
      { name: 'project-one', path: '/path/to/project-one', lastOpened: '2024-01-01' },
      { name: 'project-two', path: '/path/to/project-two', lastOpened: '2024-01-02' },
    ];

    render(<WelcomeView />);

    expect(screen.getByText('welcome.recentRepositories')).toBeInTheDocument();
    expect(screen.getByText('project-one')).toBeInTheDocument();
    expect(screen.getByText('project-two')).toBeInTheDocument();
  });

  it('should display repository paths', () => {
    mockState.recentRepositories = [
      { name: 'my-repo', path: '/Users/test/my-repo', lastOpened: '2024-01-01' },
    ];

    render(<WelcomeView />);

    expect(screen.getByText('/Users/test/my-repo')).toBeInTheDocument();
  });

  it('should display formatted time ago', () => {
    mockState.recentRepositories = [{ name: 'my-repo', path: '/path', lastOpened: '2024-01-01' }];

    render(<WelcomeView />);

    expect(screen.getByText('2024-01-01 ago')).toBeInTheDocument();
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
});
