import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecentRepository } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  WebviewWindow: vi.fn().mockImplementation(() => ({
    once: vi.fn(),
  })),
}));

const mockPinRepository = vi.fn();
const mockUnpinRepository = vi.fn();
const mockLoadRecentRepositories = vi.fn();

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadRecentRepositories: mockLoadRecentRepositories,
    pinRepository: mockPinRepository,
    unpinRepository: mockUnpinRepository,
  }),
}));

vi.mock('@/services/api', () => ({
  repositoryApi: {
    removeRecentRepository: vi.fn().mockResolvedValue(undefined),
  },
  shellApi: {
    showInFolder: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

// Mock ContextMenu to render items directly for testing
vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/ui');
  return {
    ...actual,
    ContextMenu: ({
      children,
      trigger,
    }: {
      children: React.ReactNode;
      trigger: React.ReactNode;
    }) => (
      <div>
        <div data-testid="context-trigger">{trigger}</div>
        <div data-testid="context-menu">{children}</div>
      </div>
    ),
    MenuItem: ({
      children,
      onSelect,
      disabled,
      danger,
    }: {
      children: React.ReactNode;
      onSelect?: () => void;
      disabled?: boolean;
      danger?: boolean;
    }) => (
      <button
        onClick={onSelect}
        disabled={disabled}
        data-danger={danger || undefined}
        data-testid={`menu-item-${String(children)}`}
      >
        {children}
      </button>
    ),
    MenuSeparator: () => <hr />,
  };
});

import { RecentRepoContextMenu } from './RecentRepoContextMenu';

function makeRepo(overrides: Partial<RecentRepository> = {}): RecentRepository {
  return {
    name: 'test-repo',
    path: '/home/user/test-repo',
    lastOpened: '2024-06-15',
    exists: true,
    currentBranch: 'main',
    isPinned: false,
    displayPath: '~/test-repo',
    ...overrides,
  };
}

describe('RecentRepoContextMenu', () => {
  const mockOnOpenInTab = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger children', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo()} onOpenInTab={mockOnOpenInTab}>
        <div data-testid="trigger">Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('trigger')).toBeInTheDocument();
  });

  it('should render open menu item', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo()} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-repository.contextMenu.open')).toBeInTheDocument();
  });

  it('should render open in new window menu item', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo()} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(
      screen.getByTestId('menu-item-repository.contextMenu.openInNewWindow')
    ).toBeInTheDocument();
  });

  it('should render show in finder menu item', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo()} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-repository.contextMenu.showInFinder')).toBeInTheDocument();
  });

  it('should render pin menu item for unpinned repo', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ isPinned: false })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-welcome.pin')).toBeInTheDocument();
  });

  it('should render unpin menu item for pinned repo', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ isPinned: true })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-welcome.unpin')).toBeInTheDocument();
  });

  it('should render remove from recent menu item', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo()} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(
      screen.getByTestId('menu-item-repository.contextMenu.removeFromRecent')
    ).toBeInTheDocument();
  });

  it('should disable open when repo does not exist', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ exists: false })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-repository.contextMenu.open')).toBeDisabled();
  });

  it('should disable open in new window when repo does not exist', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ exists: false })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-repository.contextMenu.openInNewWindow')).toBeDisabled();
  });

  it('should disable show in finder when repo does not exist', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ exists: false })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-repository.contextMenu.showInFinder')).toBeDisabled();
  });

  it('should enable open when repo exists', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ exists: true })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-repository.contextMenu.open')).toBeEnabled();
  });

  it('should enable open in new window when repo exists', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ exists: true })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-repository.contextMenu.openInNewWindow')).toBeEnabled();
  });

  it('should mark remove as danger', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo()} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    const removeItem = screen.getByTestId('menu-item-repository.contextMenu.removeFromRecent');
    expect(removeItem).toHaveAttribute('data-danger', 'true');
  });

  it('should not disable pin/unpin when repo does not exist', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ exists: false })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-welcome.pin')).toBeEnabled();
  });

  it('should not disable remove when repo does not exist', () => {
    render(
      <RecentRepoContextMenu repo={makeRepo({ exists: false })} onOpenInTab={mockOnOpenInTab}>
        <div>Trigger</div>
      </RecentRepoContextMenu>
    );

    expect(screen.getByTestId('menu-item-repository.contextMenu.removeFromRecent')).toBeEnabled();
  });
});
