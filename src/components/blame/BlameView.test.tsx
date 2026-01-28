import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlameView } from './BlameView';
import type { BlameLine } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatRelativeTime: (date: string) => `${date} ago`,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 100,
    getVirtualItems: () => [],
  }),
}));

describe('BlameView', () => {
  const mockLines: BlameLine[] = [
    {
      lineNumber: 1,
      content: 'const foo = 1;',
      commitOid: 'abc123',
      shortOid: 'abc123',
      author: 'Test Author',
      timestamp: '2024-01-15T10:30:00Z',
      isGroupStart: true,
      originalLine: 1,
    },
    {
      lineNumber: 2,
      content: 'const bar = 2;',
      commitOid: 'abc123',
      shortOid: 'abc123',
      author: 'Test Author',
      timestamp: '2024-01-15T10:30:00Z',
      isGroupStart: false,
      originalLine: 2,
    },
  ];

  const defaultProps = {
    lines: mockLines,
    isLoading: false,
    error: null,
    hoveredCommitOid: null,
    onHoverCommit: vi.fn(),
  };

  it('should show loading state', () => {
    render(<BlameView {...defaultProps} isLoading={true} lines={[]} />);

    expect(screen.getByText('blame.loading')).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<BlameView {...defaultProps} error="Failed to load" lines={[]} />);

    expect(screen.getByText('blame.errorLoading')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should show empty state', () => {
    render(<BlameView {...defaultProps} lines={[]} />);

    expect(screen.getByText('blame.noContent')).toBeInTheDocument();
  });

  it('should render header when content is present', () => {
    render(<BlameView {...defaultProps} />);

    expect(screen.getByText('blame.header.line')).toBeInTheDocument();
    expect(screen.getByText('blame.header.commit')).toBeInTheDocument();
    expect(screen.getByText('blame.header.author')).toBeInTheDocument();
    expect(screen.getByText('blame.header.date')).toBeInTheDocument();
    expect(screen.getByText('blame.header.content')).toBeInTheDocument();
  });

  it('should accept onClickCommit callback', () => {
    const onClickCommit = vi.fn();

    render(<BlameView {...defaultProps} onClickCommit={onClickCommit} />);

    expect(screen.getByText('blame.header.line')).toBeInTheDocument();
  });

  it('should handle hovered commit', () => {
    render(<BlameView {...defaultProps} hoveredCommitOid="abc123" />);

    expect(screen.getByText('blame.header.line')).toBeInTheDocument();
  });
});
