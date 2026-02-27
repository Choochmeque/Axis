import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Commit, GraphCommit } from '@/types';
import { RefType, SigningFormat } from '@/types';
import { CommitInfo } from './CommitInfo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    selectCommit: vi.fn(),
  }),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatFullDateTime: (date: string) => `Formatted: ${date}`,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn(),
}));

const mockUseSignatureVerification = vi.fn();
vi.mock('@/hooks', () => ({
  useSignatureVerification: (...args: unknown[]) => mockUseSignatureVerification(...args),
}));

describe('CommitInfo', () => {
  const mockCommit: Commit = {
    oid: 'abc123def456789',
    shortOid: 'abc123d',
    summary: 'Test commit message',
    message: 'Test commit message\n\nWith a longer body',
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
  };

  beforeEach(() => {
    mockUseSignatureVerification.mockReturnValue({
      verification: null,
      isVerifying: false,
    });
  });

  it('should render commit SHA', () => {
    render(<CommitInfo commit={mockCommit} />);

    expect(screen.getByText(mockCommit.oid)).toBeInTheDocument();
  });

  it('should render commit title', () => {
    render(<CommitInfo commit={mockCommit} />);

    expect(screen.getByText('history.commitInfo.title')).toBeInTheDocument();
  });

  it('should render author name and email', () => {
    render(<CommitInfo commit={mockCommit} />);

    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('<author@example.com>')).toBeInTheDocument();
  });

  it('should render formatted date', () => {
    render(<CommitInfo commit={mockCommit} />);

    expect(screen.getByText(/Formatted:/)).toBeInTheDocument();
  });

  it('should render commit message', () => {
    render(<CommitInfo commit={mockCommit} />);

    expect(screen.getByText(/Test commit message/)).toBeInTheDocument();
  });

  it('should render copy SHA button', () => {
    render(<CommitInfo commit={mockCommit} />);

    const copyButton = screen.getByTitle('history.commitInfo.copySha');
    expect(copyButton).toBeInTheDocument();
  });

  it('should copy SHA on button click', async () => {
    const { copyToClipboard } = await import('@/lib/actions');

    render(<CommitInfo commit={mockCommit} />);

    const copyButton = screen.getByTitle('history.commitInfo.copySha');
    fireEvent.click(copyButton);

    expect(copyToClipboard).toHaveBeenCalledWith(mockCommit.oid);
  });

  it('should render parent commits when present', () => {
    const commitWithParents: Commit = {
      ...mockCommit,
      parentOids: ['parent123', 'parent456'],
    };

    render(<CommitInfo commit={commitWithParents} />);

    expect(screen.getByText('history.commitInfo.parents')).toBeInTheDocument();
    expect(screen.getByText('parent1')).toBeInTheDocument();
    expect(screen.getByText('parent4')).toBeInTheDocument();
  });

  it('should render single parent label', () => {
    const commitWithOneParent: Commit = {
      ...mockCommit,
      parentOids: ['parent123'],
    };

    render(<CommitInfo commit={commitWithOneParent} />);

    expect(screen.getByText('history.commitInfo.parent')).toBeInTheDocument();
  });

  it('should handle parent click', () => {
    const onScrollToCommit = vi.fn();
    const commitWithParent: Commit = {
      ...mockCommit,
      parentOids: ['parent123456'],
    };

    render(<CommitInfo commit={commitWithParent} onScrollToCommit={onScrollToCommit} />);

    const parentButton = screen.getByText('parent1');
    fireEvent.click(parentButton);

    expect(onScrollToCommit).toHaveBeenCalledWith('parent123456');
  });

  it('should call useSignatureVerification with format when signature present', () => {
    const signedCommit: Commit = {
      ...mockCommit,
      signature: {
        format: SigningFormat.Gpg,
      },
    };

    render(<CommitInfo commit={signedCommit} />);

    expect(mockUseSignatureVerification).toHaveBeenCalledWith(signedCommit.oid, SigningFormat.Gpg);
  });

  it('should call useSignatureVerification with null when no signature', () => {
    render(<CommitInfo commit={mockCommit} />);

    expect(mockUseSignatureVerification).toHaveBeenCalledWith(mockCommit.oid, null);
  });

  it('should show skeleton while verifying signature', () => {
    mockUseSignatureVerification.mockReturnValue({
      verification: null,
      isVerifying: true,
    });

    const signedCommit: Commit = {
      ...mockCommit,
      signature: {
        format: SigningFormat.Gpg,
      },
    };

    render(<CommitInfo commit={signedCommit} />);

    expect(screen.getByText('history.commitInfo.signed')).toBeInTheDocument();
    // Skeleton is rendered (no verification badge yet)
    expect(screen.queryByText(/history.commitInfo.verified/)).not.toBeInTheDocument();
    expect(screen.queryByText(/history.commitInfo.unverified/)).not.toBeInTheDocument();
  });

  it('should show verified status for verified signature', () => {
    mockUseSignatureVerification.mockReturnValue({
      verification: { verified: true, signer: 'Test Signer' },
      isVerifying: false,
    });

    const signedCommit: Commit = {
      ...mockCommit,
      signature: {
        format: SigningFormat.Gpg,
      },
    };

    render(<CommitInfo commit={signedCommit} />);

    expect(screen.getByText(/GPG/)).toBeInTheDocument();
    expect(screen.getByText(/history.commitInfo.verified/)).toBeInTheDocument();
    expect(screen.getByText('Test Signer')).toBeInTheDocument();
  });

  it('should show unverified status for unverified signature', () => {
    mockUseSignatureVerification.mockReturnValue({
      verification: { verified: false, signer: null },
      isVerifying: false,
    });

    const signedCommit: Commit = {
      ...mockCommit,
      signature: {
        format: SigningFormat.Ssh,
      },
    };

    render(<CommitInfo commit={signedCommit} />);

    expect(screen.getByText(/SSH/)).toBeInTheDocument();
    expect(screen.getByText(/history.commitInfo.unverified/)).toBeInTheDocument();
  });

  it('should not render signature section when no signature', () => {
    render(<CommitInfo commit={mockCommit} />);

    expect(screen.queryByText('history.commitInfo.signed')).not.toBeInTheDocument();
  });

  it('should render refs when present in GraphCommit', () => {
    const graphCommit: GraphCommit = {
      ...mockCommit,
      lane: 0,
      parentEdges: [],
      refs: [
        { name: 'main', refType: RefType.LocalBranch, isHead: true },
        { name: 'v1.0.0', refType: RefType.Tag, isHead: false },
      ],
    };

    render(<CommitInfo commit={graphCommit} />);

    expect(screen.getByText('history.commitInfo.refs')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });
});
