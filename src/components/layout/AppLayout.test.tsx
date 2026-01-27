import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppLayout } from './AppLayout';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel-group">{children}</div>
  ),
  PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));

vi.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('./Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar">Toolbar</div>,
}));

vi.mock('./StatusBar', () => ({
  StatusBar: () => <div data-testid="status-bar">StatusBar</div>,
}));

// Track dialog render props
let checkoutConflictDialogProps: Record<string, unknown> | null = null;
let tagDialogProps: Record<string, unknown> | null = null;
let createBranchDialogProps: Record<string, unknown> | null = null;
let cherryPickDialogProps: Record<string, unknown> | null = null;
let resetConfirmDialogProps: Record<string, unknown> | null = null;
let revertCommitDialogProps: Record<string, unknown> | null = null;
let rebaseDialogProps: Record<string, unknown> | null = null;
let mergeDialogProps: Record<string, unknown> | null = null;
let archiveDialogProps: Record<string, unknown> | null = null;
let patchDialogProps: Record<string, unknown> | null = null;
let bisectDialogProps: Record<string, unknown> | null = null;
let discardConfirmDialogProps: Record<string, unknown> | null = null;

// Mock all dialog components
vi.mock('../branches', () => ({
  CheckoutConflictDialog: (props: Record<string, unknown>) => {
    checkoutConflictDialogProps = props;
    return props.isOpen ? <div data-testid="checkout-conflict-dialog">CheckoutConflict</div> : null;
  },
  CreateBranchDialog: (props: Record<string, unknown>) => {
    createBranchDialogProps = props;
    return props.open ? <div data-testid="create-branch-dialog">CreateBranch</div> : null;
  },
  CheckoutBranchDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="checkout-branch-dialog">CheckoutBranch</div> : null,
  DeleteBranchDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="delete-branch-dialog">DeleteBranch</div> : null,
  RenameBranchDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="rename-branch-dialog">RenameBranch</div> : null,
}));

vi.mock('../branches/BranchCompareDialog', () => ({
  BranchCompareDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="branch-compare-dialog">BranchCompare</div> : null,
}));

vi.mock('../merge', () => ({
  CherryPickDialog: (props: Record<string, unknown>) => {
    cherryPickDialogProps = props;
    return props.isOpen ? <div data-testid="cherry-pick-dialog">CherryPick</div> : null;
  },
  InteractiveRebaseDialog: () => <div data-testid="interactive-rebase-dialog" />,
  MergeDialog: (props: Record<string, unknown>) => {
    mergeDialogProps = props;
    return props.isOpen ? <div data-testid="merge-dialog">Merge</div> : null;
  },
  RebaseDialog: (props: Record<string, unknown>) => {
    rebaseDialogProps = props;
    return props.isOpen ? <div data-testid="rebase-dialog">Rebase</div> : null;
  },
  ResetConfirmDialog: (props: Record<string, unknown>) => {
    resetConfirmDialogProps = props;
    return props.isOpen ? <div data-testid="reset-confirm-dialog">ResetConfirm</div> : null;
  },
  RevertCommitDialog: (props: Record<string, unknown>) => {
    revertCommitDialogProps = props;
    return props.isOpen ? <div data-testid="revert-commit-dialog">RevertCommit</div> : null;
  },
}));

vi.mock('../custom-actions', () => ({
  ActionConfirmDialog: () => <div data-testid="action-confirm-dialog" />,
  ActionOutputDialog: () => <div data-testid="action-output-dialog" />,
}));

vi.mock('../tags/TagDialog', () => ({
  TagDialog: (props: Record<string, unknown>) => {
    tagDialogProps = props;
    return props.isOpen ? <div data-testid="tag-dialog">TagDialog</div> : null;
  },
}));

vi.mock('../history/ArchiveDialog', () => ({
  ArchiveDialog: (props: Record<string, unknown>) => {
    archiveDialogProps = props;
    return props.isOpen ? <div data-testid="archive-dialog">Archive</div> : null;
  },
}));

vi.mock('../history/PatchDialog', () => ({
  PatchDialog: (props: Record<string, unknown>) => {
    patchDialogProps = props;
    return props.isOpen ? <div data-testid="patch-dialog">Patch</div> : null;
  },
}));

vi.mock('../merge/BisectDialog', () => ({
  BisectDialog: (props: Record<string, unknown>) => {
    bisectDialogProps = props;
    return props.isOpen ? <div data-testid="bisect-dialog">Bisect</div> : null;
  },
}));

vi.mock('../remotes', () => ({
  FetchDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="fetch-dialog">Fetch</div> : null,
  PushDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="push-dialog">Push</div> : null,
  PullDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="pull-dialog">Pull</div> : null,
}));

vi.mock('../stash/StashDialog', () => ({
  StashDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="stash-dialog">Stash</div> : null,
}));

vi.mock('../staging/DiscardConfirmDialog', () => ({
  DiscardConfirmDialog: (props: Record<string, unknown>) => {
    discardConfirmDialogProps = props;
    return props.isOpen ? <div data-testid="discard-confirm-dialog">DiscardConfirm</div> : null;
  },
}));

vi.mock('../settings/SettingsDialog', () => ({
  SettingsDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="settings-dialog">Settings</div> : null,
}));

vi.mock('../settings/RepositorySettingsDialog', () => ({
  RepositorySettingsDialog: (props: Record<string, unknown>) =>
    props.isOpen ? <div data-testid="repository-settings-dialog">RepoSettings</div> : null,
}));

vi.mock('../../hooks', () => ({
  useFileWatcher: vi.fn(),
  useGitProgress: vi.fn(),
}));

const mockLoadTags = vi.fn().mockResolvedValue(undefined);
const mockLoadCommits = vi.fn().mockResolvedValue(undefined);
const mockLoadStatus = vi.fn().mockResolvedValue(undefined);
const mockLoadBranches = vi.fn().mockResolvedValue(undefined);
const mockStashAndCheckout = vi.fn();
const mockDiscardAndCheckout = vi.fn();
const mockClearCheckoutConflict = vi.fn();

let mockRepositoryStore = {
  checkoutConflict: null as { targetBranch: string; files: string[] } | null,
  stashAndCheckout: mockStashAndCheckout,
  discardAndCheckout: mockDiscardAndCheckout,
  clearCheckoutConflict: mockClearCheckoutConflict,
  loadTags: mockLoadTags,
  loadCommits: mockLoadCommits,
  loadStatus: mockLoadStatus,
  loadBranches: mockLoadBranches,
  repository: { currentBranch: 'main' },
};

const mockCloseTagDialog = vi.fn();
const mockCloseCreateBranchDialog = vi.fn();
const mockCloseCherryPickDialog = vi.fn();
const mockCloseResetConfirmDialog = vi.fn();
const mockCloseRevertCommitDialog = vi.fn();
const mockCloseRebaseDialog = vi.fn();
const mockCloseMergeDialog = vi.fn();
const mockCloseArchiveDialog = vi.fn();
const mockClosePatchDialog = vi.fn();
const mockCloseBisectDialog = vi.fn();
const mockCloseFetchDialog = vi.fn();
const mockClosePushDialog = vi.fn();
const mockClosePullDialog = vi.fn();
const mockCloseCheckoutBranchDialog = vi.fn();
const mockCloseDeleteBranchDialog = vi.fn();
const mockCloseRenameBranchDialog = vi.fn();
const mockCloseBranchCompareDialog = vi.fn();
const mockCloseStashDialog = vi.fn();
const mockCloseDiscardConfirmDialog = vi.fn();
const mockCloseSettingsDialog = vi.fn();
const mockCloseRepositorySettingsDialog = vi.fn();

let mockDialogStore = {
  tagDialog: {
    isOpen: false,
    onTagCreated: null as ((result: unknown) => void) | null,
    targetCommit: null as string | null,
    targetCommitSummary: null as string | null,
  },
  closeTagDialog: mockCloseTagDialog,
  createBranchDialog: { isOpen: false, startPoint: null as string | null },
  closeCreateBranchDialog: mockCloseCreateBranchDialog,
  cherryPickDialog: {
    isOpen: false,
    onCherryPickComplete: null as ((result: unknown) => void) | null,
    commits: [] as string[],
  },
  closeCherryPickDialog: mockCloseCherryPickDialog,
  resetConfirmDialog: {
    isOpen: false,
    commit: null as { oid: string; summary: string } | null,
    mode: 'soft' as 'soft' | 'mixed' | 'hard',
    currentBranch: 'main',
    onResetComplete: null as (() => void) | null,
  },
  closeResetConfirmDialog: mockCloseResetConfirmDialog,
  revertCommitDialog: {
    isOpen: false,
    onRevertComplete: null as ((result: unknown) => void) | null,
    commits: [] as string[],
  },
  closeRevertCommitDialog: mockCloseRevertCommitDialog,
  rebaseDialog: {
    isOpen: false,
    onRebaseComplete: null as ((result: unknown) => void) | null,
    currentBranch: 'main',
    targetCommit: null as string | null,
  },
  closeRebaseDialog: mockCloseRebaseDialog,
  mergeDialog: {
    isOpen: false,
    onMergeComplete: null as ((result: unknown) => void) | null,
    sourceBranch: null as string | null,
  },
  closeMergeDialog: mockCloseMergeDialog,
  archiveDialog: {
    isOpen: false,
    commitOid: null as string | null,
    commitSummary: null as string | null,
  },
  closeArchiveDialog: mockCloseArchiveDialog,
  patchDialog: {
    isOpen: false,
    mode: 'create' as 'create' | 'apply',
    commitOid: null as string | null,
    commitSummary: null as string | null,
    onSuccess: null as (() => void) | null,
  },
  closePatchDialog: mockClosePatchDialog,
  bisectDialog: {
    isOpen: false,
    onBisectComplete: null as ((result: unknown) => void) | null,
    badCommit: null as string | null,
    goodCommit: null as string | null,
  },
  closeBisectDialog: mockCloseBisectDialog,
  fetchDialog: { isOpen: false },
  closeFetchDialog: mockCloseFetchDialog,
  pushDialog: { isOpen: false },
  closePushDialog: mockClosePushDialog,
  pullDialog: { isOpen: false },
  closePullDialog: mockClosePullDialog,
  checkoutBranchDialog: { isOpen: false },
  closeCheckoutBranchDialog: mockCloseCheckoutBranchDialog,
  deleteBranchDialog: { isOpen: false, branch: null as string | null },
  closeDeleteBranchDialog: mockCloseDeleteBranchDialog,
  renameBranchDialog: { isOpen: false, branch: null as string | null },
  closeRenameBranchDialog: mockCloseRenameBranchDialog,
  branchCompareDialog: {
    isOpen: false,
    baseBranch: null as string | null,
    compareBranch: null as string | null,
  },
  closeBranchCompareDialog: mockCloseBranchCompareDialog,
  stashDialog: { isOpen: false },
  closeStashDialog: mockCloseStashDialog,
  discardConfirmDialog: {
    isOpen: false,
    mode: 'file' as 'file' | 'all',
    filePath: null as string | null,
    onConfirm: null as (() => void) | null,
  },
  closeDiscardConfirmDialog: mockCloseDiscardConfirmDialog,
  settingsDialog: { isOpen: false },
  closeSettingsDialog: mockCloseSettingsDialog,
  repositorySettingsDialog: { isOpen: false },
  closeRepositorySettingsDialog: mockCloseRepositorySettingsDialog,
};

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: () => mockRepositoryStore,
}));

vi.mock('../../store/dialogStore', () => ({
  useDialogStore: () => mockDialogStore,
}));

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock stores to default state
    mockRepositoryStore = {
      checkoutConflict: null,
      stashAndCheckout: mockStashAndCheckout,
      discardAndCheckout: mockDiscardAndCheckout,
      clearCheckoutConflict: mockClearCheckoutConflict,
      loadTags: mockLoadTags,
      loadCommits: mockLoadCommits,
      loadStatus: mockLoadStatus,
      loadBranches: mockLoadBranches,
      repository: { currentBranch: 'main' },
    };
    mockDialogStore = {
      tagDialog: {
        isOpen: false,
        onTagCreated: null,
        targetCommit: null,
        targetCommitSummary: null,
      },
      closeTagDialog: mockCloseTagDialog,
      createBranchDialog: { isOpen: false, startPoint: null },
      closeCreateBranchDialog: mockCloseCreateBranchDialog,
      cherryPickDialog: { isOpen: false, onCherryPickComplete: null, commits: [] },
      closeCherryPickDialog: mockCloseCherryPickDialog,
      resetConfirmDialog: {
        isOpen: false,
        commit: null,
        mode: 'soft',
        currentBranch: 'main',
        onResetComplete: null,
      },
      closeResetConfirmDialog: mockCloseResetConfirmDialog,
      revertCommitDialog: { isOpen: false, onRevertComplete: null, commits: [] },
      closeRevertCommitDialog: mockCloseRevertCommitDialog,
      rebaseDialog: {
        isOpen: false,
        onRebaseComplete: null,
        currentBranch: 'main',
        targetCommit: null,
      },
      closeRebaseDialog: mockCloseRebaseDialog,
      mergeDialog: { isOpen: false, onMergeComplete: null, sourceBranch: null },
      closeMergeDialog: mockCloseMergeDialog,
      archiveDialog: { isOpen: false, commitOid: null, commitSummary: null },
      closeArchiveDialog: mockCloseArchiveDialog,
      patchDialog: {
        isOpen: false,
        mode: 'create',
        commitOid: null,
        commitSummary: null,
        onSuccess: null,
      },
      closePatchDialog: mockClosePatchDialog,
      bisectDialog: { isOpen: false, onBisectComplete: null, badCommit: null, goodCommit: null },
      closeBisectDialog: mockCloseBisectDialog,
      fetchDialog: { isOpen: false },
      closeFetchDialog: mockCloseFetchDialog,
      pushDialog: { isOpen: false },
      closePushDialog: mockClosePushDialog,
      pullDialog: { isOpen: false },
      closePullDialog: mockClosePullDialog,
      checkoutBranchDialog: { isOpen: false },
      closeCheckoutBranchDialog: mockCloseCheckoutBranchDialog,
      deleteBranchDialog: { isOpen: false, branch: null },
      closeDeleteBranchDialog: mockCloseDeleteBranchDialog,
      renameBranchDialog: { isOpen: false, branch: null },
      closeRenameBranchDialog: mockCloseRenameBranchDialog,
      branchCompareDialog: { isOpen: false, baseBranch: null, compareBranch: null },
      closeBranchCompareDialog: mockCloseBranchCompareDialog,
      stashDialog: { isOpen: false },
      closeStashDialog: mockCloseStashDialog,
      discardConfirmDialog: { isOpen: false, mode: 'file', filePath: null, onConfirm: null },
      closeDiscardConfirmDialog: mockCloseDiscardConfirmDialog,
      settingsDialog: { isOpen: false },
      closeSettingsDialog: mockCloseSettingsDialog,
      repositorySettingsDialog: { isOpen: false },
      closeRepositorySettingsDialog: mockCloseRepositorySettingsDialog,
    };
    // Reset captured props
    checkoutConflictDialogProps = null;
    tagDialogProps = null;
    createBranchDialogProps = null;
    cherryPickDialogProps = null;
    resetConfirmDialogProps = null;
    revertCommitDialogProps = null;
    rebaseDialogProps = null;
    mergeDialogProps = null;
    archiveDialogProps = null;
    patchDialogProps = null;
    bisectDialogProps = null;
    discardConfirmDialogProps = null;
  });

  it('should render main layout structure', () => {
    render(
      <AppLayout>
        <div data-testid="content">Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should render children in main content area', () => {
    render(
      <AppLayout>
        <div data-testid="test-child">Test Child Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  it('should render panel group for layout', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('panel-group')).toBeInTheDocument();
  });

  it('should render resize handle between sidebar and content', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('resize-handle')).toBeInTheDocument();
  });

  it('should render multiple panels', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    const panels = screen.getAllByTestId('panel');
    expect(panels.length).toBe(2);
  });

  it('should render InteractiveRebaseDialog always', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('interactive-rebase-dialog')).toBeInTheDocument();
  });

  it('should render ActionConfirmDialog always', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('action-confirm-dialog')).toBeInTheDocument();
  });

  it('should render ActionOutputDialog always', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('action-output-dialog')).toBeInTheDocument();
  });
});

describe('AppLayout dialogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render CheckoutConflictDialog when checkoutConflict is set', () => {
    mockRepositoryStore.checkoutConflict = {
      targetBranch: 'feature-branch',
      files: ['file1.ts', 'file2.ts'],
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('checkout-conflict-dialog')).toBeInTheDocument();
    expect(checkoutConflictDialogProps?.targetBranch).toBe('feature-branch');
    expect(checkoutConflictDialogProps?.conflictingFiles).toEqual(['file1.ts', 'file2.ts']);
  });

  it('should render TagDialog when tagDialog.isOpen is true', () => {
    mockDialogStore.tagDialog = {
      isOpen: true,
      onTagCreated: vi.fn(),
      targetCommit: 'abc123',
      targetCommitSummary: 'Test commit',
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('tag-dialog')).toBeInTheDocument();
    expect(tagDialogProps?.targetCommit).toBe('abc123');
    expect(tagDialogProps?.targetCommitSummary).toBe('Test commit');
  });

  it('should call loadTags and loadCommits when tag is created', async () => {
    const mockOnTagCreated = vi.fn();
    mockDialogStore.tagDialog = {
      isOpen: true,
      onTagCreated: mockOnTagCreated,
      targetCommit: 'abc123',
      targetCommitSummary: 'Test commit',
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Simulate calling the onTagCreated callback
    const onTagCreatedHandler = tagDialogProps?.onTagCreated as (result: unknown) => Promise<void>;
    await onTagCreatedHandler({ name: 'v1.0.0' });

    await waitFor(() => {
      expect(mockOnTagCreated).toHaveBeenCalledWith({ name: 'v1.0.0' });
      expect(mockLoadTags).toHaveBeenCalled();
      expect(mockLoadCommits).toHaveBeenCalled();
      expect(mockCloseTagDialog).toHaveBeenCalled();
    });
  });

  it('should render CreateBranchDialog when createBranchDialog.isOpen is true', () => {
    mockDialogStore.createBranchDialog = {
      isOpen: true,
      startPoint: 'abc123',
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('create-branch-dialog')).toBeInTheDocument();
    expect(createBranchDialogProps?.startPoint).toBe('abc123');
  });

  it('should render CherryPickDialog when cherryPickDialog.isOpen is true', () => {
    mockDialogStore.cherryPickDialog = {
      isOpen: true,
      onCherryPickComplete: vi.fn(),
      commits: ['abc123', 'def456'],
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('cherry-pick-dialog')).toBeInTheDocument();
    expect(cherryPickDialogProps?.commits).toEqual(['abc123', 'def456']);
  });

  it('should call loadCommits and loadStatus when cherry-pick completes', async () => {
    const mockOnComplete = vi.fn();
    mockDialogStore.cherryPickDialog = {
      isOpen: true,
      onCherryPickComplete: mockOnComplete,
      commits: ['abc123'],
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    const onCompleteHandler = cherryPickDialogProps?.onCherryPickComplete as (
      result: unknown
    ) => Promise<void>;
    await onCompleteHandler({ success: true });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({ success: true });
      expect(mockLoadCommits).toHaveBeenCalled();
      expect(mockLoadStatus).toHaveBeenCalled();
      expect(mockCloseCherryPickDialog).toHaveBeenCalled();
    });
  });

  it('should render ResetConfirmDialog when resetConfirmDialog has commit', () => {
    mockDialogStore.resetConfirmDialog = {
      isOpen: true,
      commit: { oid: 'abc123', summary: 'Test commit' },
      mode: 'hard',
      currentBranch: 'main',
      onResetComplete: vi.fn(),
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('reset-confirm-dialog')).toBeInTheDocument();
    expect(resetConfirmDialogProps?.mode).toBe('hard');
  });

  it('should call all reload functions when reset completes', async () => {
    const mockOnComplete = vi.fn();
    mockDialogStore.resetConfirmDialog = {
      isOpen: true,
      commit: { oid: 'abc123', summary: 'Test commit' },
      mode: 'hard',
      currentBranch: 'main',
      onResetComplete: mockOnComplete,
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    const onCompleteHandler = resetConfirmDialogProps?.onResetComplete as () => Promise<void>;
    await onCompleteHandler();

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockLoadCommits).toHaveBeenCalled();
      expect(mockLoadStatus).toHaveBeenCalled();
      expect(mockLoadBranches).toHaveBeenCalled();
      expect(mockCloseResetConfirmDialog).toHaveBeenCalled();
    });
  });

  it('should render RevertCommitDialog when revertCommitDialog.isOpen is true', () => {
    mockDialogStore.revertCommitDialog = {
      isOpen: true,
      onRevertComplete: vi.fn(),
      commits: ['abc123'],
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('revert-commit-dialog')).toBeInTheDocument();
    expect(revertCommitDialogProps?.commits).toEqual(['abc123']);
  });

  it('should render RebaseDialog when rebaseDialog.isOpen is true', () => {
    mockDialogStore.rebaseDialog = {
      isOpen: true,
      onRebaseComplete: vi.fn(),
      currentBranch: 'feature',
      targetCommit: 'abc123',
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('rebase-dialog')).toBeInTheDocument();
    expect(rebaseDialogProps?.targetCommit).toBe('abc123');
  });

  it('should render MergeDialog when mergeDialog.isOpen is true', () => {
    mockDialogStore.mergeDialog = {
      isOpen: true,
      onMergeComplete: vi.fn(),
      sourceBranch: 'feature',
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('merge-dialog')).toBeInTheDocument();
    expect(mergeDialogProps?.sourceBranch).toBe('feature');
  });

  it('should render ArchiveDialog when archiveDialog.isOpen is true', () => {
    mockDialogStore.archiveDialog = {
      isOpen: true,
      commitOid: 'abc123',
      commitSummary: 'Test commit',
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('archive-dialog')).toBeInTheDocument();
    expect(archiveDialogProps?.commitOid).toBe('abc123');
  });

  it('should render PatchDialog when patchDialog.isOpen is true', () => {
    mockDialogStore.patchDialog = {
      isOpen: true,
      mode: 'create',
      commitOid: 'abc123',
      commitSummary: 'Test commit',
      onSuccess: vi.fn(),
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('patch-dialog')).toBeInTheDocument();
    expect(patchDialogProps?.mode).toBe('create');
  });

  it('should call onSuccess and closePatchDialog when patch succeeds', () => {
    const mockOnSuccess = vi.fn();
    mockDialogStore.patchDialog = {
      isOpen: true,
      mode: 'create',
      commitOid: 'abc123',
      commitSummary: 'Test commit',
      onSuccess: mockOnSuccess,
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    const onSuccessHandler = patchDialogProps?.onSuccess as () => void;
    onSuccessHandler();

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockClosePatchDialog).toHaveBeenCalled();
  });

  it('should render BisectDialog when bisectDialog.isOpen is true', () => {
    mockDialogStore.bisectDialog = {
      isOpen: true,
      onBisectComplete: vi.fn(),
      badCommit: 'abc123',
      goodCommit: 'def456',
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('bisect-dialog')).toBeInTheDocument();
    expect(bisectDialogProps?.badCommit).toBe('abc123');
    expect(bisectDialogProps?.goodCommit).toBe('def456');
  });

  it('should render FetchDialog when fetchDialog.isOpen is true', () => {
    mockDialogStore.fetchDialog = { isOpen: true };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('fetch-dialog')).toBeInTheDocument();
  });

  it('should render PushDialog when pushDialog.isOpen is true', () => {
    mockDialogStore.pushDialog = { isOpen: true };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('push-dialog')).toBeInTheDocument();
  });

  it('should render PullDialog when pullDialog.isOpen is true', () => {
    mockDialogStore.pullDialog = { isOpen: true };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('pull-dialog')).toBeInTheDocument();
  });

  it('should render CheckoutBranchDialog when checkoutBranchDialog.isOpen is true', () => {
    mockDialogStore.checkoutBranchDialog = { isOpen: true };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('checkout-branch-dialog')).toBeInTheDocument();
  });

  it('should render DeleteBranchDialog when deleteBranchDialog.isOpen is true', () => {
    mockDialogStore.deleteBranchDialog = { isOpen: true, branch: 'feature' };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('delete-branch-dialog')).toBeInTheDocument();
  });

  it('should render RenameBranchDialog when renameBranchDialog.isOpen is true', () => {
    mockDialogStore.renameBranchDialog = { isOpen: true, branch: 'feature' };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('rename-branch-dialog')).toBeInTheDocument();
  });

  it('should render BranchCompareDialog when branchCompareDialog.isOpen is true', () => {
    mockDialogStore.branchCompareDialog = {
      isOpen: true,
      baseBranch: 'main',
      compareBranch: 'feature',
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('branch-compare-dialog')).toBeInTheDocument();
  });

  it('should render StashDialog when stashDialog.isOpen is true', () => {
    mockDialogStore.stashDialog = { isOpen: true };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('stash-dialog')).toBeInTheDocument();
  });

  it('should render DiscardConfirmDialog when discardConfirmDialog.isOpen is true', () => {
    mockDialogStore.discardConfirmDialog = {
      isOpen: true,
      mode: 'file',
      filePath: 'test.ts',
      onConfirm: vi.fn(),
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('discard-confirm-dialog')).toBeInTheDocument();
    expect(discardConfirmDialogProps?.filePath).toBe('test.ts');
  });

  it('should call onConfirm and close when discard is confirmed', () => {
    const mockOnConfirm = vi.fn();
    mockDialogStore.discardConfirmDialog = {
      isOpen: true,
      mode: 'file',
      filePath: 'test.ts',
      onConfirm: mockOnConfirm,
    };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    const onConfirmHandler = discardConfirmDialogProps?.onConfirm as () => void;
    onConfirmHandler();

    expect(mockOnConfirm).toHaveBeenCalled();
    expect(mockCloseDiscardConfirmDialog).toHaveBeenCalled();
  });

  it('should render SettingsDialog when settingsDialog.isOpen is true', () => {
    mockDialogStore.settingsDialog = { isOpen: true };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('settings-dialog')).toBeInTheDocument();
  });

  it('should render RepositorySettingsDialog when repositorySettingsDialog.isOpen is true', () => {
    mockDialogStore.repositorySettingsDialog = { isOpen: true };

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('repository-settings-dialog')).toBeInTheDocument();
  });
});
