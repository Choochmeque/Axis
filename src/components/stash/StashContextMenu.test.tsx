import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StashContextMenu } from './StashContextMenu';
import type { StashEntry } from '@/types';
import { stashApi } from '@/services/api';
import { toast } from '@/hooks';
import { copyToClipboard } from '@/lib/actions';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockApplyStash = vi.fn();
const mockPopStash = vi.fn();
const mockLoadStashes = vi.fn();
const mockClearStashSelection = vi.fn();
const mockRefreshRepository = vi.fn();

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    applyStash: mockApplyStash,
    popStash: mockPopStash,
    loadStashes: mockLoadStashes,
    clearStashSelection: mockClearStashSelection,
    refreshRepository: mockRefreshRepository,
  }),
}));

vi.mock('@/services/api', () => ({
  stashApi: {
    drop: vi.fn(),
    branch: vi.fn(),
  },
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
}));

vi.mock('@/components/custom-actions', () => ({
  CustomActionsMenuSection: () => null,
}));

// Mock ContextMenu to make testing easier - render children directly with menu items visible
vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual('@/components/ui');
  return {
    ...actual,
    ContextMenu: ({
      children,
      trigger,
    }: {
      children: React.ReactNode;
      trigger: React.ReactNode;
    }) => (
      <div data-testid="context-menu">
        <div data-testid="trigger">{trigger}</div>
        <div data-testid="menu-content">{children}</div>
      </div>
    ),
    MenuItem: ({
      children,
      onSelect,
      icon: Icon,
      danger,
    }: {
      children: React.ReactNode;
      onSelect?: () => void;
      icon?: React.ComponentType<{ size?: number }>;
      hint?: string;
      danger?: boolean;
    }) => (
      <button
        data-testid={`menu-item-${String(children).toLowerCase().replace(/\s+/g, '-')}`}
        onClick={onSelect}
        className={danger ? 'danger' : ''}
      >
        {Icon && <Icon size={14} />}
        {children}
      </button>
    ),
    MenuSeparator: () => <hr data-testid="menu-separator" />,
    ContextMenuSub: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="context-menu-sub">{children}</div>
    ),
    ContextMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="sub-trigger">{children}</div>
    ),
    ContextMenuPortal: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="sub-portal">{children}</div>
    ),
    ContextMenuSubContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="sub-content">{children}</div>
    ),
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Button: ({
      children,
      onClick,
      disabled,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      variant?: string;
      className?: string;
    }) => (
      <button onClick={onClick} disabled={disabled} data-testid="create-branch-button">
        {children}
      </button>
    ),
  };
});

describe('StashContextMenu', () => {
  const mockStash: StashEntry = {
    index: 0,
    stashRef: 'stash@{0}',
    message: 'WIP: Test stash',
    commitOid: 'abc123',
    shortOid: 'abc123',
    branch: 'main',
    author: 'Test User',
    timestamp: new Date().toISOString(),
  };

  const defaultProps = {
    stash: mockStash,
    children: <button>Trigger</button>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger element', () => {
    render(<StashContextMenu {...defaultProps} />);

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should render with stash data', () => {
    render(
      <StashContextMenu stash={mockStash}>
        <span>Stash Item</span>
      </StashContextMenu>
    );

    expect(screen.getByText('Stash Item')).toBeInTheDocument();
  });

  it('should render with different stash index', () => {
    const anotherStash: StashEntry = {
      ...mockStash,
      index: 2,
      message: 'Another stash',
    };

    render(
      <StashContextMenu stash={anotherStash}>
        <div>Second Stash</div>
      </StashContextMenu>
    );

    expect(screen.getByText('Second Stash')).toBeInTheDocument();
  });

  it('should render apply menu item', () => {
    render(<StashContextMenu {...defaultProps} />);

    expect(screen.getByTestId('menu-item-stash.apply')).toBeInTheDocument();
  });

  it('should render pop menu item', () => {
    render(<StashContextMenu {...defaultProps} />);

    expect(screen.getByTestId('menu-item-stash.pop')).toBeInTheDocument();
  });

  it('should render drop menu item', () => {
    render(<StashContextMenu {...defaultProps} />);

    expect(screen.getByTestId('menu-item-stash.contextmenu.dropstash')).toBeInTheDocument();
  });

  it('should render copy message menu item', () => {
    render(<StashContextMenu {...defaultProps} />);

    expect(screen.getByTestId('menu-item-stash.contextmenu.copymessage')).toBeInTheDocument();
  });

  it('should call applyStash when apply is clicked', () => {
    render(<StashContextMenu {...defaultProps} />);

    fireEvent.click(screen.getByTestId('menu-item-stash.apply'));

    expect(mockApplyStash).toHaveBeenCalledWith(0);
  });

  it('should call popStash when pop is clicked', () => {
    render(<StashContextMenu {...defaultProps} />);

    fireEvent.click(screen.getByTestId('menu-item-stash.pop'));

    expect(mockPopStash).toHaveBeenCalledWith(0);
  });

  it('should call copyToClipboard when copy message is clicked', () => {
    render(<StashContextMenu {...defaultProps} />);

    fireEvent.click(screen.getByTestId('menu-item-stash.contextmenu.copymessage'));

    expect(copyToClipboard).toHaveBeenCalledWith('WIP: Test stash');
  });

  it('should drop stash and show success toast', async () => {
    vi.mocked(stashApi.drop).mockResolvedValue({
      message: 'Stash dropped',
      filesAffected: 0,
      conflicts: [],
    });
    vi.mocked(mockLoadStashes).mockResolvedValue(undefined);

    render(<StashContextMenu {...defaultProps} />);

    fireEvent.click(screen.getByTestId('menu-item-stash.contextmenu.dropstash'));

    await waitFor(() => {
      expect(stashApi.drop).toHaveBeenCalledWith(0);
    });

    await waitFor(() => {
      expect(mockClearStashSelection).toHaveBeenCalled();
      expect(mockLoadStashes).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('stash.dropSuccess');
    });
  });

  it('should show error toast when drop fails', async () => {
    vi.mocked(stashApi.drop).mockRejectedValue(new Error('Drop failed'));

    render(<StashContextMenu {...defaultProps} />);

    fireEvent.click(screen.getByTestId('menu-item-stash.contextmenu.dropstash'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'stash.contextMenu.dropFailed',
        'Error: Drop failed'
      );
    });
  });

  it('should render create branch submenu', () => {
    render(<StashContextMenu {...defaultProps} />);

    expect(screen.getByTestId('sub-trigger')).toBeInTheDocument();
    expect(screen.getByText('stash.contextMenu.createBranch')).toBeInTheDocument();
  });

  it('should render branch name input', () => {
    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');
    expect(input).toBeInTheDocument();
  });

  it('should update branch name on input change', () => {
    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');
    fireEvent.change(input, { target: { value: 'new-branch' } });

    expect(input).toHaveValue('new-branch');
  });

  it('should create branch on Enter key press', async () => {
    vi.mocked(stashApi.branch).mockResolvedValue({
      message: 'Branch created',
      filesAffected: 0,
      conflicts: [],
    });
    vi.mocked(mockLoadStashes).mockResolvedValue(undefined);
    vi.mocked(mockRefreshRepository).mockResolvedValue(undefined);

    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');
    fireEvent.change(input, { target: { value: 'new-branch' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(stashApi.branch).toHaveBeenCalledWith('new-branch', 0);
    });

    await waitFor(() => {
      expect(mockClearStashSelection).toHaveBeenCalled();
      expect(mockLoadStashes).toHaveBeenCalled();
      expect(mockRefreshRepository).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('stash.contextMenu.branchSuccess');
    });
  });

  it('should create branch on button click', async () => {
    vi.mocked(stashApi.branch).mockResolvedValue({
      message: 'Branch created',
      filesAffected: 0,
      conflicts: [],
    });
    vi.mocked(mockLoadStashes).mockResolvedValue(undefined);
    vi.mocked(mockRefreshRepository).mockResolvedValue(undefined);

    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');
    fireEvent.change(input, { target: { value: 'feature-branch' } });

    const createButton = screen.getByTestId('create-branch-button');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(stashApi.branch).toHaveBeenCalledWith('feature-branch', 0);
    });
  });

  it('should disable create branch button when name is empty', () => {
    render(<StashContextMenu {...defaultProps} />);

    const createButton = screen.getByTestId('create-branch-button');
    expect(createButton).toBeDisabled();
  });

  it('should not create branch with empty name', async () => {
    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait a bit to ensure no async operations happened
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(stashApi.branch).not.toHaveBeenCalled();
  });

  it('should not create branch with whitespace-only name', async () => {
    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait a bit to ensure no async operations happened
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(stashApi.branch).not.toHaveBeenCalled();
  });

  it('should show error toast when branch creation fails', async () => {
    vi.mocked(stashApi.branch).mockRejectedValue(new Error('Branch exists'));

    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');
    fireEvent.change(input, { target: { value: 'existing-branch' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'stash.contextMenu.branchFailed',
        'Error: Branch exists'
      );
    });
  });

  it('should stop propagation on input click', () => {
    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    input.dispatchEvent(clickEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('should stop propagation on input keydown', () => {
    render(<StashContextMenu {...defaultProps} />);

    const input = screen.getByPlaceholderText('stash.contextMenu.branchPlaceholder');

    // Use a non-Enter key to test stopPropagation without triggering branch creation
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    const stopPropagationSpy = vi.spyOn(keydownEvent, 'stopPropagation');

    input.dispatchEvent(keydownEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});

describe('StashContextMenu with different stash indexes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use correct index for stash at index 1', () => {
    const stash: StashEntry = {
      index: 1,
      stashRef: 'stash@{1}',
      message: 'Second stash',
      commitOid: 'def456',
      shortOid: 'def456',
      branch: 'feature',
      author: 'Test User',
      timestamp: new Date().toISOString(),
    };

    render(
      <StashContextMenu stash={stash}>
        <span>Trigger</span>
      </StashContextMenu>
    );

    fireEvent.click(screen.getByTestId('menu-item-stash.apply'));

    expect(mockApplyStash).toHaveBeenCalledWith(1);
  });

  it('should use correct index for stash at index 5', () => {
    const stash: StashEntry = {
      index: 5,
      stashRef: 'stash@{5}',
      message: 'Fifth stash',
      commitOid: 'ghi789',
      shortOid: 'ghi789',
      branch: 'develop',
      author: 'Test User',
      timestamp: new Date().toISOString(),
    };

    render(
      <StashContextMenu stash={stash}>
        <span>Trigger</span>
      </StashContextMenu>
    );

    fireEvent.click(screen.getByTestId('menu-item-stash.pop'));

    expect(mockPopStash).toHaveBeenCalledWith(5);
  });
});
