import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Branch } from '@/types';
import { BranchContextMenu } from './BranchContextMenu';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    branches: [
      { name: 'main', isHead: true, fullName: 'refs/heads/main' },
      { name: 'feature', isHead: false, fullName: 'refs/heads/feature' },
    ],
    loadBranches: vi.fn(),
    loadCommits: vi.fn(),
    refreshRepository: vi.fn(),
  }),
}));

vi.mock('@/store/dialogStore', () => ({
  useDialogStore: () => ({
    openRenameBranchDialog: vi.fn(),
    openDeleteBranchDialog: vi.fn(),
    openPullDialog: vi.fn(),
    openPushDialog: vi.fn(),
    openBranchCompareDialog: vi.fn(),
    openMergeDialog: vi.fn(),
  }),
}));

vi.mock('@/services/api', () => ({
  remoteApi: {
    list: vi.fn().mockResolvedValue([]),
    push: vi.fn(),
  },
  branchApi: {
    list: vi.fn().mockResolvedValue([]),
    setUpstream: vi.fn(),
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/components/custom-actions', () => ({
  CustomActionsMenuSection: () => null,
}));

describe('BranchContextMenu', () => {
  const mockBranch: Branch = {
    name: 'feature',
    fullName: 'refs/heads/feature',
    branchType: 'Local',
    isHead: false,
    upstream: null,
    ahead: 0,
    behind: 0,
    targetOid: 'abc123',
    lastCommitSummary: 'Initial commit',
    lastCommitTime: '2024-01-15T10:30:00Z',
  };

  it('should render trigger element', () => {
    render(
      <BranchContextMenu branch={mockBranch}>
        <button>Branch Button</button>
      </BranchContextMenu>
    );

    expect(screen.getByText('Branch Button')).toBeInTheDocument();
  });

  it('should render with current branch', () => {
    const currentBranch: Branch = {
      ...mockBranch,
      name: 'main',
      fullName: 'refs/heads/main',
      isHead: true,
    };

    render(
      <BranchContextMenu branch={currentBranch}>
        <span>Current Branch</span>
      </BranchContextMenu>
    );

    expect(screen.getByText('Current Branch')).toBeInTheDocument();
  });

  it('should render with upstream branch', () => {
    const branchWithUpstream: Branch = {
      ...mockBranch,
      upstream: 'origin/feature',
    };

    render(
      <BranchContextMenu branch={branchWithUpstream}>
        <span>Branch with Upstream</span>
      </BranchContextMenu>
    );

    expect(screen.getByText('Branch with Upstream')).toBeInTheDocument();
  });

  it('should accept onCheckout callback', () => {
    const onCheckout = vi.fn();

    render(
      <BranchContextMenu branch={mockBranch} onCheckout={onCheckout}>
        <button>Checkout Branch</button>
      </BranchContextMenu>
    );

    expect(screen.getByText('Checkout Branch')).toBeInTheDocument();
  });

  it('should render with different branch data', () => {
    const remoteBranch: Branch = {
      name: 'origin/main',
      fullName: 'refs/remotes/origin/main',
      branchType: 'Remote',
      isHead: false,
      upstream: null,
      ahead: 5,
      behind: 2,
      targetOid: 'def456',
      lastCommitSummary: 'Remote commit',
      lastCommitTime: '2024-01-16T12:00:00Z',
    };

    render(
      <BranchContextMenu branch={remoteBranch}>
        <div>Remote Branch</div>
      </BranchContextMenu>
    );

    expect(screen.getByText('Remote Branch')).toBeInTheDocument();
  });
});
