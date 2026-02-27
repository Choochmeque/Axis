import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphCommit } from '@/types';
import { CommitContextMenu } from './CommitContextMenu';

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
    repository: { path: '/test/repo', currentBranch: 'main' },
    loadBranches: vi.fn(),
    loadCommits: vi.fn(),
    loadStatus: vi.fn(),
    reloadRepositoryInfo: vi.fn(),
  }),
}));

vi.mock('@/store/dialogStore', () => ({
  useDialogStore: () => ({
    openTagDialog: vi.fn(),
    openCreateBranchDialog: vi.fn(),
    openCherryPickDialog: vi.fn(),
    openResetConfirmDialog: vi.fn(),
    openRevertCommitDialog: vi.fn(),
    openRebaseDialog: vi.fn(),
    openArchiveDialog: vi.fn(),
    openPatchDialog: vi.fn(),
    openBisectDialog: vi.fn(),
    openMergeDialog: vi.fn(),
  }),
}));

vi.mock('@/services/api', () => ({
  branchApi: {
    checkout: vi.fn(),
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

describe('CommitContextMenu', () => {
  const mockCommit: GraphCommit = {
    oid: 'abc123def456789',
    shortOid: 'abc123d',
    summary: 'Test commit message',
    message: 'Test commit message',
    author: {
      name: 'Test Author',
      email: 'author@example.com',
      timestamp: '2024-01-15T10:30:00Z',
    },
    committer: {
      name: 'Test Committer',
      email: 'committer@example.com',
      timestamp: '2024-01-15T10:30:00Z',
    },
    timestamp: '2024-01-15T10:30:00Z',
    parentOids: [],
    isMerge: false,
    signature: null,
    lane: 0,
    parentEdges: [],
    refs: [],
  };

  it('should render trigger element when children provided', () => {
    render(
      <CommitContextMenu commit={mockCommit}>
        <button>Trigger</button>
      </CommitContextMenu>
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should accept onCheckout callback', () => {
    const onCheckout = vi.fn();

    render(
      <CommitContextMenu commit={mockCommit} onCheckout={onCheckout}>
        <button>Checkout</button>
      </CommitContextMenu>
    );

    expect(screen.getByText('Checkout')).toBeInTheDocument();
  });

  it('should accept onMerge callback', () => {
    const onMerge = vi.fn();

    render(
      <CommitContextMenu commit={mockCommit} onMerge={onMerge}>
        <button>Merge</button>
      </CommitContextMenu>
    );

    expect(screen.getByText('Merge')).toBeInTheDocument();
  });

  it('should render with commit refs', () => {
    const commitWithRefs: GraphCommit = {
      ...mockCommit,
      refs: [
        { name: 'main', refType: 'LocalBranch' as const, isHead: true },
        { name: 'feature', refType: 'LocalBranch' as const, isHead: false },
      ],
    };

    render(
      <CommitContextMenu commit={commitWithRefs}>
        <button>Trigger</button>
      </CommitContextMenu>
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should render with merge commit', () => {
    const mergeCommit: GraphCommit = {
      ...mockCommit,
      parentOids: ['parent1', 'parent2'],
      isMerge: true,
    };

    render(
      <CommitContextMenu commit={mergeCommit}>
        <button>Merge Commit</button>
      </CommitContextMenu>
    );

    expect(screen.getByText('Merge Commit')).toBeInTheDocument();
  });

  it('should render with different commit data', () => {
    const differentCommit: GraphCommit = {
      ...mockCommit,
      oid: 'xyz789abc123',
      shortOid: 'xyz789a',
      summary: 'Different commit',
    };

    render(
      <CommitContextMenu commit={differentCommit}>
        <span>Different Trigger</span>
      </CommitContextMenu>
    );

    expect(screen.getByText('Different Trigger')).toBeInTheDocument();
  });
});
