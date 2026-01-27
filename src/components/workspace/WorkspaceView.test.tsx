import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceView } from './WorkspaceView';
import { StatusType } from '@/types';

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

vi.mock('../staging', () => ({
  StagingView: () => <div data-testid="staging-view">StagingView</div>,
}));

vi.mock('../staging/CommitForm', () => ({
  CommitForm: () => <div data-testid="commit-form">CommitForm</div>,
}));

vi.mock('../diff', () => ({
  DiffView: ({ mode }: { mode: string }) => (
    <div data-testid="diff-view" data-mode={mode}>
      DiffView
    </div>
  ),
}));

vi.mock('../stash', () => ({
  StashDiffView: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="stash-diff-view">
      StashDiffView
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockStagingStore = {
  selectedFile: null as { path: string; status: StatusType } | null,
  selectedFileDiff: null,
  isLoadingDiff: false,
  isSelectedFileStaged: false,
  stageHunk: vi.fn(),
  unstageHunk: vi.fn(),
  discardHunk: vi.fn(),
};

const mockRepositoryStore = {
  selectedStash: null as { stashRef: string; message: string } | null,
  selectedStashFiles: [],
  isLoadingStashFiles: false,
  clearStashSelection: vi.fn(),
  commits: [{ oid: 'abc123' }],
};

vi.mock('../../store/stagingStore', () => ({
  useStagingStore: () => mockStagingStore,
}));

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: () => mockRepositoryStore,
}));

describe('WorkspaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStagingStore.selectedFile = null;
    mockStagingStore.selectedFileDiff = null;
    mockStagingStore.isLoadingDiff = false;
    mockStagingStore.isSelectedFileStaged = false;
    mockRepositoryStore.selectedStash = null;
    mockRepositoryStore.selectedStashFiles = [];
    mockRepositoryStore.isLoadingStashFiles = false;
  });

  it('should render workspace layout', () => {
    render(<WorkspaceView />);

    expect(screen.getByTestId('staging-view')).toBeInTheDocument();
    expect(screen.getByTestId('diff-view')).toBeInTheDocument();
    expect(screen.getByTestId('commit-form')).toBeInTheDocument();
  });

  it('should render panel groups', () => {
    render(<WorkspaceView />);

    const panelGroups = screen.getAllByTestId('panel-group');
    expect(panelGroups.length).toBeGreaterThanOrEqual(1);
  });

  it('should render resize handles', () => {
    render(<WorkspaceView />);

    const resizeHandles = screen.getAllByTestId('resize-handle');
    expect(resizeHandles.length).toBeGreaterThanOrEqual(2);
  });

  it('should show diff view in workdir mode when file is not staged', () => {
    mockStagingStore.isSelectedFileStaged = false;

    render(<WorkspaceView />);

    expect(screen.getByTestId('diff-view')).toHaveAttribute('data-mode', 'workdir');
  });

  it('should show diff view in staged mode when file is staged', () => {
    mockStagingStore.isSelectedFileStaged = true;

    render(<WorkspaceView />);

    expect(screen.getByTestId('diff-view')).toHaveAttribute('data-mode', 'staged');
  });

  it('should show stash diff view when stash is selected', () => {
    mockRepositoryStore.selectedStash = {
      stashRef: 'stash@{0}',
      message: 'WIP on main',
    };

    render(<WorkspaceView />);

    expect(screen.getByTestId('stash-diff-view')).toBeInTheDocument();
    expect(screen.queryByTestId('staging-view')).not.toBeInTheDocument();
  });

  it('should not show staging view when stash is selected', () => {
    mockRepositoryStore.selectedStash = {
      stashRef: 'stash@{0}',
      message: 'WIP on main',
    };

    render(<WorkspaceView />);

    expect(screen.queryByTestId('staging-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('commit-form')).not.toBeInTheDocument();
  });

  it('should render multiple panels', () => {
    render(<WorkspaceView />);

    const panels = screen.getAllByTestId('panel');
    expect(panels.length).toBeGreaterThanOrEqual(3);
  });
});
