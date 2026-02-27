import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
const mockLoadLabels = vi.fn();
const mockAvailableLabels = [
  { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
  { name: 'enhancement', color: 'a2eeef', description: 'New feature' },
];

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: () => ({
    createPullRequest: mockCreatePullRequest,
    availableLabels: mockAvailableLabels,
    loadLabels: mockLoadLabels,
  }),
}));

// Mock settings store
const mockSettings = { aiEnabled: true };
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: mockSettings,
  }),
}));

// Mock AI API
const mockGeneratePrDescription = vi.fn();
vi.mock('@/services/api', () => ({
  aiApi: {
    generatePrDescription: (...args: unknown[]) => mockGeneratePrDescription(...args),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock LabelSelector
vi.mock('@/components/integrations/LabelSelector', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  LabelSelector: ({ selectedLabels, onSelectionChange, disabled }: any) => (
    <div data-testid="label-selector" data-disabled={disabled}>
      <span data-testid="selected-labels-count">{selectedLabels.length}</span>
      <button
        data-testid="select-bug-label"
        onClick={() =>
          onSelectionChange([{ name: 'bug', color: 'd73a4a', description: 'Something is broken' }])
        }
      >
        Select bug
      </button>
    </div>
  ),
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
  Button: ({ children, onClick, disabled, title }: any) => (
    <button onClick={onClick} disabled={disabled} title={title}>
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
  MarkdownEditor: ({ id, value, onChange, placeholder, disabled }: any) => (
    <textarea
      id={id}
      data-testid={id}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
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
    expect(screen.getByTestId('label-selector')).toBeInTheDocument();
  });

  it('should load branches and labels when dialog opens', () => {
    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    expect(mockLoadBranches).toHaveBeenCalled();
    expect(mockLoadLabels).toHaveBeenCalled();
  });

  it('should disable create button when fields are empty', () => {
    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    expect(screen.getByText('integrations.pullRequests.create.createButton')).toBeDisabled();
  });

  it('should create pull request with labels successfully', async () => {
    mockCreatePullRequest.mockResolvedValue({ number: 1 });

    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: 'feature-branch' } });
    fireEvent.change(screen.getByTestId('pr-target'), { target: { value: 'main' } });
    fireEvent.change(screen.getByTestId('pr-title'), { target: { value: 'My PR Title' } });
    fireEvent.change(screen.getByTestId('pr-body'), { target: { value: 'PR description' } });

    // Select a label
    fireEvent.click(screen.getByTestId('select-bug-label'));

    fireEvent.click(screen.getByText('integrations.pullRequests.create.createButton'));

    await waitFor(() => {
      expect(mockCreatePullRequest).toHaveBeenCalledWith({
        title: 'My PR Title',
        body: 'PR description',
        sourceBranch: 'feature-branch',
        targetBranch: 'main',
        draft: false,
        labels: ['bug'],
      });
      expect(mockOnCreated).toHaveBeenCalled();
    });
  });

  it('should create pull request without labels', async () => {
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
          labels: [],
        })
      );
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

  it('should render generate with AI button', () => {
    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    expect(
      screen.getByTitle('integrations.pullRequests.create.generateWithAi')
    ).toBeInTheDocument();
  });

  it('should disable AI button when branches are not selected', () => {
    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    // Clear source branch to test disabled state
    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: '' } });

    const aiButton = screen.getByTitle('integrations.pullRequests.create.generateWithAi');
    expect(aiButton).toBeDisabled();
  });

  it('should generate PR description with AI and set labels', async () => {
    mockGeneratePrDescription.mockResolvedValue({
      title: 'Generated Title',
      body: 'Generated body content',
      labels: ['bug'],
      modelUsed: 'gpt-4o-mini',
    });

    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: 'feature-branch' } });
    fireEvent.change(screen.getByTestId('pr-target'), { target: { value: 'main' } });

    fireEvent.click(screen.getByTitle('integrations.pullRequests.create.generateWithAi'));

    await waitFor(() => {
      expect(mockGeneratePrDescription).toHaveBeenCalledWith('feature-branch', 'main', true, [
        'bug',
        'enhancement',
      ]);
      expect(screen.getByTestId('pr-title')).toHaveValue('Generated Title');
      expect(screen.getByTestId('pr-body')).toHaveValue('Generated body content');
      // AI response had 'bug' label, so 1 label should be selected
      expect(screen.getByTestId('selected-labels-count')).toHaveTextContent('1');
    });
  });

  it('should show error when AI generation fails', async () => {
    mockGeneratePrDescription.mockRejectedValue(new Error('AI service error'));

    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    fireEvent.change(screen.getByTestId('pr-source'), { target: { value: 'feature-branch' } });
    fireEvent.change(screen.getByTestId('pr-target'), { target: { value: 'main' } });

    fireEvent.click(screen.getByTitle('integrations.pullRequests.create.generateWithAi'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('AI service error');
    });
  });

  it('should disable AI button when AI is not enabled', () => {
    mockSettings.aiEnabled = false;

    render(
      <CreatePullRequestDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />
    );

    const aiButton = screen.getByTitle('integrations.pullRequests.create.generateWithAi');
    expect(aiButton).toBeDisabled();

    // Restore
    mockSettings.aiEnabled = true;
  });
});
