import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorktreeContextMenu } from './WorktreeContextMenu';
import type { Worktree } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockLock = vi.fn();
const mockUnlock = vi.fn();
const mockLoadWorktrees = vi.fn();

vi.mock('@/services/api', () => ({
  worktreeApi: {
    lock: (...args: unknown[]) => mockLock(...args),
    unlock: (...args: unknown[]) => mockUnlock(...args),
  },
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadWorktrees: mockLoadWorktrees,
  }),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn(),
  showInFinder: vi.fn(),
}));

vi.mock('@/components/ui', () => ({
  ContextMenu: ({ children, trigger }: { children: React.ReactNode; trigger: React.ReactNode }) => (
    <div>
      <div data-testid="trigger">{trigger}</div>
      <div data-testid="menu-content">{children}</div>
    </div>
  ),
  MenuItem: ({
    children,
    onSelect,
    danger,
    disabled,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <button onClick={onSelect} disabled={disabled} data-danger={danger} data-testid="menu-item">
      {children}
    </button>
  ),
  MenuSeparator: () => <hr />,
}));

vi.mock('./RemoveWorktreeDialog', () => ({
  RemoveWorktreeDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="remove-dialog">Remove Dialog</div> : null,
}));

describe('WorktreeContextMenu', () => {
  const mockWorktree: Worktree = {
    path: '/path/to/worktree',
    branch: 'feature-branch',
    headOid: 'abc123',
    shortOid: 'abc123',
    isMain: false,
    isLocked: false,
    lockReason: null,
    isPrunable: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger element', () => {
    render(
      <WorktreeContextMenu worktree={mockWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should render switch option for non-main worktrees', () => {
    render(
      <WorktreeContextMenu worktree={mockWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.getByText('worktrees.contextMenu.switch')).toBeInTheDocument();
  });

  it('should not render switch option for main worktree', () => {
    const mainWorktree: Worktree = { ...mockWorktree, isMain: true };

    render(
      <WorktreeContextMenu worktree={mainWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.queryByText('worktrees.contextMenu.switch')).toBeNull();
  });

  it('should render open in finder option', () => {
    render(
      <WorktreeContextMenu worktree={mockWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.getByText('worktrees.contextMenu.openInFinder')).toBeInTheDocument();
  });

  it('should render copy path option', () => {
    render(
      <WorktreeContextMenu worktree={mockWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.getByText('worktrees.contextMenu.copyPath')).toBeInTheDocument();
  });

  it('should render lock option for unlocked worktree', () => {
    render(
      <WorktreeContextMenu worktree={mockWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.getByText('worktrees.contextMenu.lock')).toBeInTheDocument();
  });

  it('should render unlock option for locked worktree', () => {
    const lockedWorktree: Worktree = { ...mockWorktree, isLocked: true };

    render(
      <WorktreeContextMenu worktree={lockedWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.getByText('worktrees.contextMenu.unlock')).toBeInTheDocument();
  });

  it('should render remove option for non-main unlocked worktrees', () => {
    render(
      <WorktreeContextMenu worktree={mockWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.getByText('worktrees.contextMenu.remove')).toBeInTheDocument();
  });

  it('should not render remove option for main worktree', () => {
    const mainWorktree: Worktree = { ...mockWorktree, isMain: true };

    render(
      <WorktreeContextMenu worktree={mainWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.queryByText('worktrees.contextMenu.remove')).toBeNull();
  });

  it('should not render remove option for locked worktree', () => {
    const lockedWorktree: Worktree = { ...mockWorktree, isLocked: true };

    render(
      <WorktreeContextMenu worktree={lockedWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    expect(screen.queryByText('worktrees.contextMenu.remove')).toBeNull();
  });

  it('should call onSwitch when switch is clicked', () => {
    const onSwitch = vi.fn();

    render(
      <WorktreeContextMenu worktree={mockWorktree} onSwitch={onSwitch}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    fireEvent.click(screen.getByText('worktrees.contextMenu.switch'));

    expect(onSwitch).toHaveBeenCalled();
  });

  it('should call lock API when lock is clicked', async () => {
    mockLock.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(
      <WorktreeContextMenu worktree={mockWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    fireEvent.click(screen.getByText('worktrees.contextMenu.lock'));

    await waitFor(() => {
      expect(mockLock).toHaveBeenCalledWith('/path/to/worktree');
    });
  });

  it('should call unlock API when unlock is clicked', async () => {
    const lockedWorktree: Worktree = { ...mockWorktree, isLocked: true };
    mockUnlock.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(
      <WorktreeContextMenu worktree={lockedWorktree}>
        <span>Trigger</span>
      </WorktreeContextMenu>
    );

    fireEvent.click(screen.getByText('worktrees.contextMenu.unlock'));

    await waitFor(() => {
      expect(mockUnlock).toHaveBeenCalledWith('/path/to/worktree');
    });
  });
});
