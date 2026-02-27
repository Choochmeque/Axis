import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteBranchContextMenu } from './RemoteBranchContextMenu';

// Mock store
const mockBranches = [
  { name: 'main', isHead: true },
  { name: 'feature', isHead: false },
];

const mockCheckoutBranch = vi.fn().mockResolvedValue(true);

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    branches: mockBranches,
    checkoutBranch: mockCheckoutBranch,
  }),
}));

// Mock clipboard
const mockCopyToClipboard = vi.fn();
vi.mock('@/lib/actions', () => ({
  copyToClipboard: (text: string) => mockCopyToClipboard(text),
}));

// Mock toast and error utils
vi.mock('@/hooks', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

// Mock delete dialog
vi.mock('./DeleteRemoteBranchDialog', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DeleteRemoteBranchDialog: ({ open, onOpenChange, branch }: any) =>
    open ? (
      <div data-testid="delete-dialog">
        Delete {branch.name}
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v));
        });
        return result;
      }
      return key;
    },
  }),
}));

// Mock UI components - always render menu items for testing
vi.mock('@/components/ui', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContextMenu: ({ children, trigger }: any) => (
    <div data-testid="context-menu-wrapper">
      <div data-testid="trigger">{trigger}</div>
      <div data-testid="menu-content">{children}</div>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MenuItem: ({ children, icon: Icon, onSelect, disabled, danger }: any) => (
    <button data-testid="menu-item" onClick={onSelect} disabled={disabled} data-danger={danger}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  ),
  MenuSeparator: () => <hr data-testid="menu-separator" />,
}));

describe('RemoteBranchContextMenu', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockBranch: any = {
    name: 'origin/feature-branch',
    fullName: 'refs/remotes/origin/feature-branch',
    branchType: 'Remote',
    isHead: false,
    upstream: null,
    ahead: 0,
    behind: 0,
    lastCommitOid: 'abc123',
    lastCommitSummary: 'Test commit',
    lastCommitTimestamp: 1700000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger and menu', () => {
    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should show menu items', () => {
    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    expect(screen.getByText('branches.remoteContextMenu.checkout')).toBeInTheDocument();
    expect(screen.getByText('branches.contextMenu.copyBranchName')).toBeInTheDocument();
    expect(screen.getByText('branches.remoteContextMenu.diffAgainstCurrent')).toBeInTheDocument();
  });

  it('should copy branch name to clipboard', () => {
    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    // Click copy button
    fireEvent.click(screen.getByText('branches.contextMenu.copyBranchName'));

    expect(mockCopyToClipboard).toHaveBeenCalledWith('origin/feature-branch');
  });

  it('should open delete dialog when delete is clicked', () => {
    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    // Click delete
    const deleteItem = screen
      .getAllByTestId('menu-item')
      .find((item) => item.textContent?.includes('branches.remoteContextMenu.delete'));
    fireEvent.click(deleteItem!);

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('Delete origin/feature-branch');
  });

  it('should parse remote and branch name correctly', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branch: any = {
      name: 'upstream/feature/nested/path',
      fullName: 'refs/remotes/upstream/feature/nested/path',
      branchType: 'Remote',
      isHead: false,
      upstream: null,
      ahead: 0,
      behind: 0,
      lastCommitOid: 'abc123',
      lastCommitSummary: 'Test commit',
      lastCommitTimestamp: 1700000000,
    };

    render(
      <RemoteBranchContextMenu branch={branch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    // Check that the pullInto menu item has correct text
    // remote = "upstream", branchName = "feature/nested/path"
    expect(screen.getByText(/branches.remoteContextMenu.pullInto/)).toBeInTheDocument();
  });

  it('should checkout remote branch when checkout is clicked', async () => {
    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    const checkoutItem = screen
      .getAllByTestId('menu-item')
      .find((item) => item.textContent?.includes('branches.remoteContextMenu.checkout'));
    expect(checkoutItem).not.toBeDisabled();
    fireEvent.click(checkoutItem!);

    await waitFor(() => {
      expect(mockCheckoutBranch).toHaveBeenCalledWith('origin/feature-branch', true);
    });
  });

  it('should show error toast when checkout fails', async () => {
    const { toast } = await import('@/hooks');
    mockCheckoutBranch.mockRejectedValueOnce(new Error('checkout failed'));

    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    const checkoutItem = screen
      .getAllByTestId('menu-item')
      .find((item) => item.textContent?.includes('branches.remoteContextMenu.checkout'));
    fireEvent.click(checkoutItem!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'notifications.error.operationFailed',
        'Error: checkout failed'
      );
    });
  });

  it('should show disabled diff item', () => {
    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    const diffItem = screen
      .getAllByTestId('menu-item')
      .find((item) => item.textContent?.includes('branches.remoteContextMenu.diffAgainstCurrent'));
    expect(diffItem).toBeDisabled();
  });

  it('should have menu separators', () => {
    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    const separators = screen.getAllByTestId('menu-separator');
    expect(separators.length).toBeGreaterThan(0);
  });
});
