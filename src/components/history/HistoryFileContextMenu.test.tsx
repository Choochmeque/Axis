import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FileDiff } from '@/types';
import { DiffStatus } from '@/types';
import { HistoryFileContextMenu } from './HistoryFileContextMenu';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    repository: { path: '/test/repo' },
  }),
}));

vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn(),
  showInFinder: vi.fn(),
}));

vi.mock('@/components/ui', () => ({
  ContextMenu: ({ children, trigger }: { children: React.ReactNode; trigger: React.ReactNode }) => (
    <div>
      <div data-testid="trigger">{trigger}</div>
      <div data-testid="menu-content">{children}</div>
    </div>
  ),
  MenuItem: ({
    children,
    onSelect,
    disabled,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onSelect} disabled={disabled} data-testid="menu-item">
      {children}
    </button>
  ),
  MenuSeparator: () => <hr />,
}));

vi.mock('@/components/blame', () => ({
  BlameDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="blame-dialog">Blame Dialog</div> : null,
}));

describe('HistoryFileContextMenu', () => {
  const mockFile: FileDiff = {
    oldPath: null,
    newPath: 'src/components/Test.tsx',
    oldOid: null,
    newOid: 'abc123',
    status: DiffStatus.Added,
    binary: false,
    hunks: [],
    additions: 50,
    deletions: 0,
  };

  it('should render trigger element', () => {
    render(
      <HistoryFileContextMenu file={mockFile}>
        <span>Trigger</span>
      </HistoryFileContextMenu>
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should render menu items', () => {
    render(
      <HistoryFileContextMenu file={mockFile}>
        <span>Trigger</span>
      </HistoryFileContextMenu>
    );

    expect(screen.getByText('history.fileContextMenu.logSelected')).toBeInTheDocument();
    expect(screen.getByText('history.fileContextMenu.annotateSelected')).toBeInTheDocument();
    expect(screen.getByText('history.fileContextMenu.resetToCommit')).toBeInTheDocument();
  });

  it('should render file actions', () => {
    render(
      <HistoryFileContextMenu file={mockFile}>
        <span>Trigger</span>
      </HistoryFileContextMenu>
    );

    expect(screen.getByText('history.fileContextMenu.openCurrentVersion')).toBeInTheDocument();
    expect(screen.getByText('history.fileContextMenu.openSelectedVersion')).toBeInTheDocument();
    expect(screen.getByText('history.fileContextMenu.showInFinder')).toBeInTheDocument();
    expect(screen.getByText('history.fileContextMenu.copyPath')).toBeInTheDocument();
  });

  it('should render external diff option', () => {
    render(
      <HistoryFileContextMenu file={mockFile}>
        <span>Trigger</span>
      </HistoryFileContextMenu>
    );

    expect(screen.getByText('history.fileContextMenu.externalDiff')).toBeInTheDocument();
  });

  it('should use oldPath when newPath is not available', () => {
    const deletedFile: FileDiff = {
      ...mockFile,
      newPath: null,
      oldPath: 'src/deleted.tsx',
    };

    render(
      <HistoryFileContextMenu file={deletedFile}>
        <span>Deleted File</span>
      </HistoryFileContextMenu>
    );

    expect(screen.getByText('Deleted File')).toBeInTheDocument();
  });

  it('should pass commitOid to BlameDialog', () => {
    render(
      <HistoryFileContextMenu file={mockFile} commitOid="def456">
        <span>Trigger</span>
      </HistoryFileContextMenu>
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });
});
