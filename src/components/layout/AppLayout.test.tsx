import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// Mock all dialog components
vi.mock('../branches', () => ({
  CheckoutConflictDialog: () => null,
  CreateBranchDialog: () => null,
  CheckoutBranchDialog: () => null,
  DeleteBranchDialog: () => null,
  RenameBranchDialog: () => null,
}));

vi.mock('../branches/BranchCompareDialog', () => ({
  BranchCompareDialog: () => null,
}));

vi.mock('../merge', () => ({
  CherryPickDialog: () => null,
  InteractiveRebaseDialog: () => null,
  MergeDialog: () => null,
  RebaseDialog: () => null,
  ResetConfirmDialog: () => null,
  RevertCommitDialog: () => null,
}));

vi.mock('../custom-actions', () => ({
  ActionConfirmDialog: () => null,
  ActionOutputDialog: () => null,
}));

vi.mock('../tags/TagDialog', () => ({
  TagDialog: () => null,
}));

vi.mock('../history/ArchiveDialog', () => ({
  ArchiveDialog: () => null,
}));

vi.mock('../history/PatchDialog', () => ({
  PatchDialog: () => null,
}));

vi.mock('../merge/BisectDialog', () => ({
  BisectDialog: () => null,
}));

vi.mock('../remotes', () => ({
  FetchDialog: () => null,
  PushDialog: () => null,
  PullDialog: () => null,
}));

vi.mock('../stash/StashDialog', () => ({
  StashDialog: () => null,
}));

vi.mock('../staging/DiscardConfirmDialog', () => ({
  DiscardConfirmDialog: () => null,
}));

vi.mock('../settings/SettingsDialog', () => ({
  SettingsDialog: () => null,
}));

vi.mock('../settings/RepositorySettingsDialog', () => ({
  RepositorySettingsDialog: () => null,
}));

vi.mock('../../hooks', () => ({
  useFileWatcher: vi.fn(),
  useGitProgress: vi.fn(),
}));

const mockRepositoryStore = {
  checkoutConflict: null,
  stashAndCheckout: vi.fn(),
  discardAndCheckout: vi.fn(),
  clearCheckoutConflict: vi.fn(),
  loadTags: vi.fn(),
  loadCommits: vi.fn(),
  loadStatus: vi.fn(),
  loadBranches: vi.fn(),
  repository: { currentBranch: 'main' },
};

const mockDialogStore = {
  tagDialog: { isOpen: false, onTagCreated: null, targetCommit: null, targetCommitSummary: null },
  closeTagDialog: vi.fn(),
  createBranchDialog: { isOpen: false, startPoint: null },
  closeCreateBranchDialog: vi.fn(),
  cherryPickDialog: { isOpen: false, onCherryPickComplete: null, commits: [] },
  closeCherryPickDialog: vi.fn(),
  resetConfirmDialog: {
    isOpen: false,
    commit: null,
    mode: 'soft',
    currentBranch: 'main',
    onResetComplete: null,
  },
  closeResetConfirmDialog: vi.fn(),
  revertCommitDialog: { isOpen: false, onRevertComplete: null, commits: [] },
  closeRevertCommitDialog: vi.fn(),
  rebaseDialog: {
    isOpen: false,
    onRebaseComplete: null,
    currentBranch: 'main',
    targetCommit: null,
  },
  closeRebaseDialog: vi.fn(),
  archiveDialog: { isOpen: false, commitOid: null, commitSummary: null },
  closeArchiveDialog: vi.fn(),
  patchDialog: {
    isOpen: false,
    mode: 'create',
    commitOid: null,
    commitSummary: null,
    onSuccess: null,
  },
  closePatchDialog: vi.fn(),
  bisectDialog: { isOpen: false, onBisectComplete: null, badCommit: null, goodCommit: null },
  closeBisectDialog: vi.fn(),
  fetchDialog: { isOpen: false },
  closeFetchDialog: vi.fn(),
  pushDialog: { isOpen: false },
  closePushDialog: vi.fn(),
  pullDialog: { isOpen: false },
  closePullDialog: vi.fn(),
  checkoutBranchDialog: { isOpen: false },
  closeCheckoutBranchDialog: vi.fn(),
  deleteBranchDialog: { isOpen: false, branch: null },
  closeDeleteBranchDialog: vi.fn(),
  renameBranchDialog: { isOpen: false, branch: null },
  closeRenameBranchDialog: vi.fn(),
  branchCompareDialog: { isOpen: false, baseBranch: null, compareBranch: null },
  closeBranchCompareDialog: vi.fn(),
  stashDialog: { isOpen: false },
  closeStashDialog: vi.fn(),
  discardConfirmDialog: { isOpen: false, mode: 'file', filePath: null, onConfirm: null },
  closeDiscardConfirmDialog: vi.fn(),
  settingsDialog: { isOpen: false },
  closeSettingsDialog: vi.fn(),
  repositorySettingsDialog: { isOpen: false },
  closeRepositorySettingsDialog: vi.fn(),
  mergeDialog: { isOpen: false, onMergeComplete: null, sourceBranch: null },
  closeMergeDialog: vi.fn(),
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
});
