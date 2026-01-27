import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RemoteBranchContextMenu } from './RemoteBranchContextMenu';

// Mock store
const mockBranches = [
  { name: 'main', isHead: true },
  { name: 'feature', isHead: false },
];

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    branches: mockBranches,
  }),
}));

// Mock clipboard
const mockCopyToClipboard = vi.fn();
vi.mock('@/lib/actions', () => ({
  copyToClipboard: (text: string) => mockCopyToClipboard(text),
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

  it('should show disabled checkout item', () => {
    render(
      <RemoteBranchContextMenu branch={mockBranch}>
        <span>Trigger</span>
      </RemoteBranchContextMenu>
    );

    const checkoutItem = screen
      .getAllByTestId('menu-item')
      .find((item) => item.textContent?.includes('branches.remoteContextMenu.checkout'));
    expect(checkoutItem).toBeDisabled();
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
