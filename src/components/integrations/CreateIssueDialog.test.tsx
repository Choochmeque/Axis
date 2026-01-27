import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateIssueDialog } from './CreateIssueDialog';

// Mock hooks
vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock store
const mockCreateIssue = vi.fn();
vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: () => ({
    createIssue: mockCreateIssue,
  }),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogClose: ({ children }: any) => children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FormField: ({ children, label }: any) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input: ({ id, value, onChange, placeholder }: any) => (
    <input id={id} data-testid={id} value={value} onChange={onChange} placeholder={placeholder} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Textarea: ({ id, value, onChange, placeholder }: any) => (
    <textarea
      id={id}
      data-testid={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
}));

describe('CreateIssueDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<CreateIssueDialog isOpen={false} onClose={mockOnClose} onCreated={mockOnCreated} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent(
      'integrations.issues.create.title'
    );
    expect(screen.getByTestId('issue-title')).toBeInTheDocument();
    expect(screen.getByTestId('issue-body')).toBeInTheDocument();
    expect(screen.getByTestId('issue-labels')).toBeInTheDocument();
  });

  it('should disable create button when title is empty', () => {
    render(<CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />);

    expect(screen.getByText('integrations.issues.create.createButton')).toBeDisabled();
  });

  it('should enable create button when title is provided', () => {
    render(<CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByTestId('issue-title'), { target: { value: 'Test Issue' } });

    expect(screen.getByText('integrations.issues.create.createButton')).not.toBeDisabled();
  });

  it('should create issue successfully', async () => {
    mockCreateIssue.mockResolvedValue({ number: 1 });

    render(<CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByTestId('issue-title'), { target: { value: 'Test Issue' } });
    fireEvent.change(screen.getByTestId('issue-body'), { target: { value: 'Issue description' } });
    fireEvent.change(screen.getByTestId('issue-labels'), { target: { value: 'bug, enhancement' } });

    fireEvent.click(screen.getByText('integrations.issues.create.createButton'));

    await waitFor(() => {
      expect(mockCreateIssue).toHaveBeenCalledWith({
        title: 'Test Issue',
        body: 'Issue description',
        labels: ['bug', 'enhancement'],
        assignees: [],
      });
      expect(mockOnCreated).toHaveBeenCalled();
    });
  });

  it('should create issue with empty body as null', async () => {
    mockCreateIssue.mockResolvedValue({ number: 1 });

    render(<CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByTestId('issue-title'), { target: { value: 'Test Issue' } });

    fireEvent.click(screen.getByText('integrations.issues.create.createButton'));

    await waitFor(() => {
      expect(mockCreateIssue).toHaveBeenCalledWith({
        title: 'Test Issue',
        body: null,
        labels: [],
        assignees: [],
      });
    });
  });

  it('should handle create error', async () => {
    mockCreateIssue.mockRejectedValue(new Error('API error'));

    render(<CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByTestId('issue-title'), { target: { value: 'Test Issue' } });
    fireEvent.click(screen.getByText('integrations.issues.create.createButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('API error');
      expect(mockOnCreated).not.toHaveBeenCalled();
    });
  });

  it('should parse labels from comma-separated string', async () => {
    mockCreateIssue.mockResolvedValue({ number: 1 });

    render(<CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByTestId('issue-title'), { target: { value: 'Test Issue' } });
    fireEvent.change(screen.getByTestId('issue-labels'), {
      target: { value: '  bug  ,  feature  , , docs ' },
    });

    fireEvent.click(screen.getByText('integrations.issues.create.createButton'));

    await waitFor(() => {
      expect(mockCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: ['bug', 'feature', 'docs'],
        })
      );
    });
  });

  it('should reset form when dialog opens', () => {
    const { rerender } = render(
      <CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('issue-title'), { target: { value: 'Test Issue' } });
    fireEvent.change(screen.getByTestId('issue-body'), { target: { value: 'Description' } });

    // Close and reopen
    rerender(<CreateIssueDialog isOpen={false} onClose={mockOnClose} onCreated={mockOnCreated} />);
    rerender(<CreateIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />);

    expect(screen.getByTestId('issue-title')).toHaveValue('');
    expect(screen.getByTestId('issue-body')).toHaveValue('');
  });
});
