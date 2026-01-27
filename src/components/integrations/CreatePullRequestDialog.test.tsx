import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreatePullRequestDialog } from './CreatePullRequestDialog';

// Mock hooks
vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock repository store
const mockLoadBranches = vi.fn();
const mockBranches = [
  { name: 'main', branchType: 'Local', isHead: false, upstream: 'origin/main' },
  { name: 'feature-branch', branchType: 'Local', isHead: true, upstream: 'origin/feature-branch' },
  { name: 'unpushed-branch', branchType: 'Local', isHead: false, upstream: null },
  { name: 'develop', branchType: 'Local', isHead: false, upstream: 'origin/develop' },
];

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    branches: mockBranches,
    loadBranches: mockLoadBranches,
  }),
}));

// Mock integration store
const mockCreatePullRequest = vi.fn();
vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: () => ({
    createPullRequest: mockCreatePullRequest,
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
  FormField: ({ children, label, error }: any) => (
    <div>
      <label>{label}</label>
      {children}
      {error && <span data-testid="field-error">{error}</span>}
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
  Select: ({ id, value, onValueChange, children }: any) => (
    <select id={id} data-testid={id} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">Select...</option>
      {children}
    </select>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CheckboxField: ({ id, label, checked, onCheckedChange }: any) => (
    <div>
      <input
        type="checkbox"
        id={id}
        data-testid={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
}));

describe('CreatePullRequestDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <CreatePullRequestDialog isOpen={false} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent(
      'integrations.pullRequests.create.title'
    );
    expect(screen.getByTestId('pr-source')).toBeInTheDocument();
    expect(screen.getByTestId('pr-target')).toBeInTheDocument();
    expect(screen.getByTestId('pr-title')).toBeInTheDocument();
    expect(screen.getByTestId('pr-body')).toBeInTheDocument();
    expect(screen.getByTestId('pr-draft')).toBeInTheDocument();
  });

  it('should load branches when dialog opens', () => {
    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    expect(mockLoadBranches).toHaveBeenCalled();
  });

  it('should disable create button when fields are empty', () => {
    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    expect(screen.getByText('integrations.pullRequests.create.createButton')).toBeDisabled();
  });

  it('should create pull request successfully', async () => {
    mockCreatePullRequest.mockResolvedValue({ number: 1 });

    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: 'feature-branch' } });
    fireEvent.change(screen.getByTestId('pr-target'), { target: { value: 'main' } });
    fireEvent.change(screen.getByTestId('pr-title'), { target: { value: 'My PR Title' } });
    fireEvent.change(screen.getByTestId('pr-body'), { target: { value: 'PR description' } });

    fireEvent.click(screen.getByText('integrations.pullRequests.create.createButton'));

    await waitFor(() => {
      expect(mockCreatePullRequest).toHaveBeenCalledWith({
        title: 'My PR Title',
        body: 'PR description',
        sourceBranch: 'feature-branch',
        targetBranch: 'main',
        draft: false,
      });
      expect(mockOnCreated).toHaveBeenCalled();
    });
  });

  it('should create draft pull request', async () => {
    mockCreatePullRequest.mockResolvedValue({ number: 1 });

    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: 'feature-branch' } });
    fireEvent.change(screen.getByTestId('pr-target'), { target: { value: 'main' } });
    fireEvent.change(screen.getByTestId('pr-title'), { target: { value: 'My PR Title' } });
    fireEvent.click(screen.getByTestId('pr-draft'));

    fireEvent.click(screen.getByText('integrations.pullRequests.create.createButton'));

    await waitFor(() => {
      expect(mockCreatePullRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: true,
        })
      );
    });
  });

  it('should handle create error', async () => {
    mockCreatePullRequest.mockRejectedValue(new Error('API error'));

    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: 'feature-branch' } });
    fireEvent.change(screen.getByTestId('pr-target'), { target: { value: 'main' } });
    fireEvent.change(screen.getByTestId('pr-title'), { target: { value: 'My PR Title' } });

    fireEvent.click(screen.getByText('integrations.pullRequests.create.createButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('API error');
      expect(mockOnCreated).not.toHaveBeenCalled();
    });
  });

  it('should show warning when source branch is not pushed', () => {
    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: 'unpushed-branch' } });

    expect(screen.getByTestId('field-error')).toHaveTextContent(
      'integrations.pullRequests.create.notPushed'
    );
  });

  it('should send null body when description is empty', async () => {
    mockCreatePullRequest.mockResolvedValue({ number: 1 });

    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: 'feature-branch' } });
    fireEvent.change(screen.getByTestId('pr-target'), { target: { value: 'main' } });
    fireEvent.change(screen.getByTestId('pr-title'), { target: { value: 'My PR Title' } });

    fireEvent.click(screen.getByText('integrations.pullRequests.create.createButton'));

    await waitFor(() => {
      expect(mockCreatePullRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: null,
        })
      );
    });
  });
});
