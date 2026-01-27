import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StagingFileContextMenu } from './StagingFileContextMenu';
import { StatusType } from '@/types';
import type { FileStatus } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn(),
  showInFinder: vi.fn(),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      repository: { path: '/test/repo' },
      setCurrentView: vi.fn(),
    };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  },
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      deleteFile: vi.fn(),
      loadStatus: vi.fn(),
      selectFile: vi.fn(),
    };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  },
}));

vi.mock('@/services/api', () => ({
  conflictApi: {
    resolveConflict: vi.fn(),
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

vi.mock('@/components/custom-actions', () => ({
  CustomActionsMenuSection: () => null,
}));

vi.mock('../history/FileLogDialog', () => ({
  FileLogDialog: () => null,
}));

vi.mock('../blame', () => ({
  BlameDialog: () => null,
}));

vi.mock('./IgnoreDialog', () => ({
  IgnoreDialog: () => null,
}));

vi.mock('./DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => null,
}));

describe('StagingFileContextMenu', () => {
  const mockFile: FileStatus = {
    path: 'src/test.ts',
    status: StatusType.Modified,
    stagedStatus: StatusType.Modified,
    unstagedStatus: null,
  };

  const defaultProps = {
    file: mockFile,
    children: <button>Trigger</button>,
    isStaged: false,
  };

  it('should render trigger element', () => {
    render(<StagingFileContextMenu {...defaultProps} />);

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should render with staged file', () => {
    render(
      <StagingFileContextMenu file={mockFile} isStaged={true}>
        <span>Staged File</span>
      </StagingFileContextMenu>
    );

    expect(screen.getByText('Staged File')).toBeInTheDocument();
  });

  it('should render with untracked file', () => {
    const untrackedFile: FileStatus = {
      ...mockFile,
      status: StatusType.Untracked,
    };

    render(
      <StagingFileContextMenu file={untrackedFile} isStaged={false}>
        <span>Untracked File</span>
      </StagingFileContextMenu>
    );

    expect(screen.getByText('Untracked File')).toBeInTheDocument();
  });

  it('should render with conflicted file', () => {
    const conflictedFile: FileStatus = {
      ...mockFile,
      status: StatusType.Conflicted,
    };

    render(
      <StagingFileContextMenu file={conflictedFile} isStaged={false}>
        <span>Conflicted File</span>
      </StagingFileContextMenu>
    );

    expect(screen.getByText('Conflicted File')).toBeInTheDocument();
  });

  it('should render with tree view mode', () => {
    render(
      <StagingFileContextMenu {...defaultProps} isTreeView={true}>
        <span>Tree Item</span>
      </StagingFileContextMenu>
    );

    expect(screen.getByText('Tree Item')).toBeInTheDocument();
  });

  it('should accept onStage callback', () => {
    const onStage = vi.fn();

    render(
      <StagingFileContextMenu {...defaultProps} onStage={onStage}>
        <span>Stage Button</span>
      </StagingFileContextMenu>
    );

    expect(screen.getByText('Stage Button')).toBeInTheDocument();
  });

  it('should accept onUnstage callback', () => {
    const onUnstage = vi.fn();

    render(
      <StagingFileContextMenu {...defaultProps} isStaged={true} onUnstage={onUnstage}>
        <span>Unstage Button</span>
      </StagingFileContextMenu>
    );

    expect(screen.getByText('Unstage Button')).toBeInTheDocument();
  });

  it('should accept onDiscard callback', () => {
    const onDiscard = vi.fn();

    render(
      <StagingFileContextMenu {...defaultProps} onDiscard={onDiscard}>
        <span>Discard Button</span>
      </StagingFileContextMenu>
    );

    expect(screen.getByText('Discard Button')).toBeInTheDocument();
  });
});
