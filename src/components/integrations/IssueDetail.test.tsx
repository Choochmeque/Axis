import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IssueDetail as IssueDetailType } from '@/bindings/api';
import { IssueDetail } from './IssueDetail';

// Mock shellApi
const mockOpenUrl = vi.fn();
vi.mock('@/services/api', () => ({
  shellApi: {
    openUrl: (url: string) => mockOpenUrl(url),
  },
}));

// Mock dateUtils
vi.mock('@/lib/dateUtils', () => ({
  formatDateTime: (_date: string) => 'Jan 15, 2024',
}));

// Mock react-markdown and related
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock('rehype-raw', () => ({
  default: () => {},
}));

vi.mock('remark-gfm', () => ({
  default: () => {},
}));

vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre data-testid="code-block">{children}</pre>,
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key}: ${Object.values(params).join(', ')}`;
      }
      return key;
    },
  }),
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, title }: any) => (
    <button onClick={onClick} title={title}>
      {children}
    </button>
  ),
}));

describe('IssueDetail', () => {
  const mockOnClose = vi.fn();

  const mockIssueDetail: IssueDetailType = {
    number: 1,
    title: 'Test Issue',
    state: 'Open',
    provider: 'GitHub',
    author: {
      login: 'testuser',
      avatarUrl: 'https://example.com/avatar.png',
      url: 'https://github.com/testuser',
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-16T11:00:00Z',
    commentsCount: 5,
    url: 'https://github.com/test/repo/issues/1',
    labels: [
      { name: 'bug', color: 'FF0000', description: 'Bug label' },
      { name: 'priority', color: '00FF00', description: 'Priority label' },
    ],
    body: 'This is the issue description',
    assignees: [
      {
        login: 'assignee1',
        avatarUrl: 'https://example.com/a1.png',
        url: 'https://github.com/assignee1',
      },
    ],
    milestone: 'v1.0.0',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show select issue message when no issue is provided', () => {
    render(<IssueDetail issueDetail={null} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.issues.selectIssue')).toBeInTheDocument();
  });

  it('should render issue details', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    expect(screen.getByText('Test Issue')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should show open state badge for open issues', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.issues.state.open')).toBeInTheDocument();
  });

  it('should show closed state badge for closed issues', () => {
    const closedIssue = { ...mockIssueDetail, state: 'Closed' as const };

    render(<IssueDetail issueDetail={closedIssue} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.issues.state.closed')).toBeInTheDocument();
  });

  it('should render labels', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('priority')).toBeInTheDocument();
  });

  it('should render assignees', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    expect(screen.getByText('assignee1')).toBeInTheDocument();
  });

  it('should render milestone', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    expect(screen.getByText(/v1.0.0/)).toBeInTheDocument();
  });

  it('should render issue body', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    expect(screen.getByTestId('markdown')).toHaveTextContent('This is the issue description');
  });

  it('should open URL in browser when external link is clicked', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTitle('common.openInBrowser'));

    expect(mockOpenUrl).toHaveBeenCalledWith('https://github.com/test/repo/issues/1');
  });

  it('should call onClose when close button is clicked', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTitle('common.close'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show comments count', () => {
    render(<IssueDetail issueDetail={mockIssueDetail} onClose={mockOnClose} />);

    expect(screen.getByText(/integrations.issues.detail.comments: 5/)).toBeInTheDocument();
  });

  it('should not render labels section when no labels', () => {
    const issueWithoutLabels = { ...mockIssueDetail, labels: [] };

    render(<IssueDetail issueDetail={issueWithoutLabels} onClose={mockOnClose} />);

    expect(screen.queryByText('integrations.issues.detail.labels')).not.toBeInTheDocument();
  });

  it('should not render assignees section when no assignees', () => {
    const issueWithoutAssignees = { ...mockIssueDetail, assignees: [] };

    render(<IssueDetail issueDetail={issueWithoutAssignees} onClose={mockOnClose} />);

    expect(screen.queryByText('integrations.issues.detail.assignees')).not.toBeInTheDocument();
  });

  it('should not render milestone when not set', () => {
    const issueWithoutMilestone = { ...mockIssueDetail, milestone: null };

    render(<IssueDetail issueDetail={issueWithoutMilestone} onClose={mockOnClose} />);

    expect(screen.queryByText(/integrations.issues.detail.milestone/)).not.toBeInTheDocument();
  });

  it('should not render body when not set', () => {
    const issueWithoutBody = { ...mockIssueDetail, body: null };

    render(<IssueDetail issueDetail={issueWithoutBody} onClose={mockOnClose} />);

    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
  });
});
