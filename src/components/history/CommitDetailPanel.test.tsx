import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommitDetailPanel } from './CommitDetailPanel';
import type { Commit } from '@/types';

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

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    selectedCommitFiles: [],
    selectedCommitFile: null,
    isLoadingCommitFiles: false,
    selectCommitFile: vi.fn(),
  }),
}));

vi.mock('./CommitInfo', () => ({
  CommitInfo: () => <div data-testid="commit-info">Commit Info</div>,
}));

vi.mock('./CommitFileList', () => ({
  CommitFileList: () => <div data-testid="commit-file-list">Commit File List</div>,
}));

vi.mock('../diff', () => ({
  DiffView: () => <div data-testid="diff-view">Diff View</div>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('CommitDetailPanel', () => {
  const mockCommit: Commit = {
    oid: 'abc123',
    shortOid: 'abc123',
    summary: 'Test commit summary',
    body: 'Test commit body',
    author: { name: 'Test Author', email: 'test@example.com', timestamp: new Date().toISOString() },
    committer: {
      name: 'Test Committer',
      email: 'committer@example.com',
      timestamp: new Date().toISOString(),
    },
    parentOids: ['parent1'],
    signature: null,
    gpgVerification: null,
  };

  it('should render commit summary in header', () => {
    render(<CommitDetailPanel commit={mockCommit} onClose={vi.fn()} />);

    expect(screen.getByText('Test commit summary')).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(<CommitDetailPanel commit={mockCommit} onClose={vi.fn()} />);

    expect(screen.getByTitle('common.close')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();

    render(<CommitDetailPanel commit={mockCommit} onClose={onClose} />);

    fireEvent.click(screen.getByTitle('common.close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should render CommitInfo component', () => {
    render(<CommitDetailPanel commit={mockCommit} onClose={vi.fn()} />);

    expect(screen.getByTestId('commit-info')).toBeInTheDocument();
  });

  it('should render CommitFileList component', () => {
    render(<CommitDetailPanel commit={mockCommit} onClose={vi.fn()} />);

    expect(screen.getByTestId('commit-file-list')).toBeInTheDocument();
  });

  it('should render DiffView component', () => {
    render(<CommitDetailPanel commit={mockCommit} onClose={vi.fn()} />);

    expect(screen.getByTestId('diff-view')).toBeInTheDocument();
  });

  it('should render resizable panels', () => {
    render(<CommitDetailPanel commit={mockCommit} onClose={vi.fn()} />);

    expect(screen.getAllByTestId('panel-group').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('panel').length).toBeGreaterThan(0);
  });

  it('should pass onScrollToCommit callback', () => {
    const onScrollToCommit = vi.fn();

    render(
      <CommitDetailPanel
        commit={mockCommit}
        onClose={vi.fn()}
        onScrollToCommit={onScrollToCommit}
      />
    );

    expect(screen.getByTestId('commit-info')).toBeInTheDocument();
  });

  it('should handle commit without parents', () => {
    const rootCommit: Commit = {
      ...mockCommit,
      parentOids: [],
    };

    render(<CommitDetailPanel commit={rootCommit} onClose={vi.fn()} />);

    expect(screen.getByText('Test commit summary')).toBeInTheDocument();
  });
});
