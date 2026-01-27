import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RebasePreviewDiagram } from './RebasePreviewDiagram';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

// Use partial types for testing - the component only uses oid and shortOid
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockRebasePreview = any;

describe('RebasePreviewDiagram', () => {
  const mockPreview: MockRebasePreview = {
    commitsToRebase: [
      { oid: 'abc123', shortOid: 'abc123' },
      { oid: 'def456', shortOid: 'def456' },
    ],
    mergeBase: { oid: 'base123', shortOid: 'base12' },
    target: { name: 'main', oid: 'target123', shortOid: 'target', summary: '' },
    targetCommitsAhead: 2,
  };

  it('should render before and after panels', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    expect(screen.getByText('merge.rebasePreview.before')).toBeInTheDocument();
    expect(screen.getByText('merge.rebasePreview.after')).toBeInTheDocument();
  });

  it('should display current branch name', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    const branchNames = screen.getAllByText('feature');
    expect(branchNames).toHaveLength(2); // Before and after
  });

  it('should display target branch name', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    const targetNames = screen.getAllByText('main');
    expect(targetNames.length).toBeGreaterThanOrEqual(1);
  });

  it('should display commit short OIDs', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('def456')).toBeInTheDocument();
  });

  it('should display merge base short OID', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    expect(screen.getByText('base12')).toBeInTheDocument();
  });

  it('should display rebased commits with prime notation', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    // After rebase, commits have prime notation
    expect(screen.getByText("abc123'")).toBeInTheDocument();
    expect(screen.getByText("def456'")).toBeInTheDocument();
  });

  it('should render SVG diagrams', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2); // Before and after (plus arrow icon)
  });

  it('should render circles for commits', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    const circles = document.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(0);
  });

  it('should render lines connecting commits', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    const lines = document.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should show empty state when no commits to rebase', () => {
    const emptyPreview: MockRebasePreview = {
      ...mockPreview,
      commitsToRebase: [],
    };

    render(<RebasePreviewDiagram preview={emptyPreview} currentBranch="feature" />);

    expect(screen.getByText('merge.rebasePreview.noCommits')).toBeInTheDocument();
  });

  it('should show "more" indicator when many commits', () => {
    const manyCommitsPreview: MockRebasePreview = {
      ...mockPreview,
      commitsToRebase: [
        { oid: '1', shortOid: 'c1' },
        { oid: '2', shortOid: 'c2' },
        { oid: '3', shortOid: 'c3' },
        { oid: '4', shortOid: 'c4' },
        { oid: '5', shortOid: 'c5' },
        { oid: '6', shortOid: 'c6' },
      ],
    };

    render(<RebasePreviewDiagram preview={manyCommitsPreview} currentBranch="feature" />);

    // Should show "more" indicator with count (appears in both before and after diagrams)
    const moreIndicators = screen.getAllByText('merge.rebasePreview.more {"count":2}');
    expect(moreIndicators.length).toBeGreaterThanOrEqual(1);
  });

  it('should render arrow between panels', () => {
    render(<RebasePreviewDiagram preview={mockPreview} currentBranch="feature" />);

    const arrowContainer = document.querySelector('.rebase-preview-arrow');
    expect(arrowContainer).toBeInTheDocument();
  });
});
