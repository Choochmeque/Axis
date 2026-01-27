import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StagingView } from './StagingView';
import { StatusType } from '@/types';
import type { FileStatus } from '@/types';

interface WorkingStatus {
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: FileStatus[];
  conflicted: FileStatus[];
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  naturalCompare: (a: string, b: string) => a.localeCompare(b),
}));

vi.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel-group">{children}</div>
  ),
  PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));

const mockLoadStatus = vi.fn();
const mockSelectFile = vi.fn();
const mockStageFile = vi.fn();
const mockStageAll = vi.fn();
const mockUnstageFile = vi.fn();
const mockUnstageAll = vi.fn();
const mockDiscardFile = vi.fn();
const mockClearError = vi.fn();

let mockStagingState: {
  status: WorkingStatus | null;
  isLoadingStatus: boolean;
  selectedFile: string | null;
  error: string | null;
};

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: () => ({
    ...mockStagingState,
    loadStatus: mockLoadStatus,
    selectFile: mockSelectFile,
    stageFile: mockStageFile,
    stageAll: mockStageAll,
    unstageFile: mockUnstageFile,
    unstageAll: mockUnstageAll,
    discardFile: mockDiscardFile,
    clearError: mockClearError,
  }),
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: { confirmBeforeDiscard: false },
  }),
}));

const mockOpenDiscardConfirmDialog = vi.fn();

vi.mock('@/store/dialogStore', () => ({
  useDialogStore: () => ({
    openDiscardConfirmDialog: mockOpenDiscardConfirmDialog,
  }),
}));

vi.mock('@/components/ui', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean | 'indeterminate';
    onCheckedChange: (value: boolean | 'indeterminate') => void;
  }) => (
    <input
      type="checkbox"
      data-testid="checkbox"
      checked={checked === true}
      data-indeterminate={checked === 'indeterminate'}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
  Alert: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button data-testid="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('./FileStatusList', () => ({
  FileStatusList: ({
    files,
    title,
    onSelectFile,
    onStage,
    onUnstage,
    onDiscard,
  }: {
    files: FileStatus[];
    title?: string;
    selectedFile: string | null;
    onSelectFile: (path: string) => void;
    onStage?: (path: string) => void;
    onUnstage?: (path: string) => void;
    onDiscard?: (path: string) => void;
  }) => (
    <div data-testid="file-status-list" data-title={title}>
      {files.map((f) => (
        <div
          key={f.path}
          data-testid={`file-${f.path}`}
          onClick={() => onSelectFile(f.path)}
          onDoubleClick={() => onStage?.(f.path)}
        >
          {f.path}
          {onUnstage && (
            <button onClick={() => onUnstage(f.path)} data-testid={`unstage-${f.path}`}>
              unstage
            </button>
          )}
          {onDiscard && (
            <button onClick={() => onDiscard(f.path)} data-testid={`discard-${f.path}`}>
              discard
            </button>
          )}
        </div>
      ))}
    </div>
  ),
  FluidFileList: ({ files }: { files: unknown[] }) => (
    <div data-testid="fluid-file-list">{files.length} files</div>
  ),
}));

vi.mock('./StagingFilters', () => ({
  StagingFilters: () => <div data-testid="staging-filters" />,
  StagingSortBy: {
    Path: 'path',
    PathReversed: 'path-reversed',
    Filename: 'filename',
    FilenameReversed: 'filename-reversed',
    Status: 'status',
    Checked: 'checked',
  },
  StagingShowOnly: {
    All: 'all',
    Pending: 'pending',
    Conflicts: 'conflicts',
    Untracked: 'untracked',
    Modified: 'modified',
    Ignored: 'ignored',
    Clean: 'clean',
  },
  StagingViewMode: {
    FlatSingle: 'flat-single',
    FlatMulti: 'flat-multi',
    Tree: 'tree',
  },
  StagingMode: {
    SplitView: 'split-view',
    FluidView: 'fluid-view',
  },
}));

function createFileStatus(path: string, status: StatusType, isStaged: boolean): FileStatus {
  return {
    path,
    status,
    stagedStatus: isStaged ? status : null,
    unstagedStatus: isStaged ? null : status,
    isConflict: status === StatusType.Conflicted,
    oldPath: null,
  };
}

describe('StagingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStagingState = {
      status: null,
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };
  });

  it('should show loading state when loading without status', () => {
    mockStagingState = {
      status: null,
      isLoadingStatus: true,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    expect(screen.getByText('staging.loadingStatus')).toBeInTheDocument();
  });

  it('should show error state with dismiss button', () => {
    mockStagingState = {
      status: null,
      isLoadingStatus: false,
      selectedFile: null,
      error: 'Something went wrong',
    };

    render(<StagingView />);

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('staging.dismiss')).toBeInTheDocument();
  });

  it('should call clearError when dismiss button is clicked', () => {
    mockStagingState = {
      status: null,
      isLoadingStatus: false,
      selectedFile: null,
      error: 'Something went wrong',
    };

    render(<StagingView />);

    fireEvent.click(screen.getByText('staging.dismiss'));

    expect(mockClearError).toHaveBeenCalled();
  });

  it('should call loadStatus on mount', () => {
    mockStagingState = {
      status: {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      },
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    expect(mockLoadStatus).toHaveBeenCalled();
  });

  it('should render staged files section', () => {
    mockStagingState = {
      status: {
        staged: [createFileStatus('src/file1.ts', StatusType.Modified, true)],
        unstaged: [],
        untracked: [],
        conflicted: [],
      },
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    // Should render staged section
    expect(screen.getByText('staging.stagedFiles')).toBeInTheDocument();
  });

  it('should render unstaged files section', () => {
    mockStagingState = {
      status: {
        staged: [],
        unstaged: [createFileStatus('src/file2.ts', StatusType.Modified, false)],
        untracked: [],
        conflicted: [],
      },
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    // Should render unstaged section
    expect(screen.getByText('staging.unstagedFiles')).toBeInTheDocument();
  });

  it('should render conflicted files section when there are conflicts', () => {
    mockStagingState = {
      status: {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [createFileStatus('src/conflict.ts', StatusType.Conflicted, false)],
      },
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    // Should render conflicts section
    expect(screen.getByText('staging.conflicts')).toBeInTheDocument();
  });

  it('should render no changes message in sections when empty', () => {
    mockStagingState = {
      status: {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      },
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    // Should show empty messages
    expect(screen.getByText('staging.noStagedChanges')).toBeInTheDocument();
    expect(screen.getByText('staging.noUnstagedChanges')).toBeInTheDocument();
  });

  it('should render both sections when there are staged and unstaged files', () => {
    mockStagingState = {
      status: {
        staged: [createFileStatus('src/staged.ts', StatusType.Modified, true)],
        unstaged: [createFileStatus('src/unstaged.ts', StatusType.Modified, false)],
        untracked: [],
        conflicted: [],
      },
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    // Both sections should be rendered
    expect(screen.getByText('staging.stagedFiles')).toBeInTheDocument();
    expect(screen.getByText('staging.unstagedFiles')).toBeInTheDocument();
  });

  it('should render staging filters', () => {
    mockStagingState = {
      status: {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      },
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    expect(screen.getByTestId('staging-filters')).toBeInTheDocument();
  });

  it('should render panel group for resizable layout', () => {
    mockStagingState = {
      status: {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      },
      isLoadingStatus: false,
      selectedFile: null,
      error: null,
    };

    render(<StagingView />);

    expect(screen.getByTestId('panel-group')).toBeInTheDocument();
  });
});
