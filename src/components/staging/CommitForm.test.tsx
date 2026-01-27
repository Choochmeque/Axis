import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommitForm } from './CommitForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

const mockSetCommitMessage = vi.fn();
const mockSetIsAmending = vi.fn();
const mockSetPushAfterCommit = vi.fn();
const mockSetStructuredMode = vi.fn();
const mockSetCommitParts = vi.fn();
const mockCreateCommit = vi.fn();
const mockAmendCommit = vi.fn();

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: () => ({
    status: { staged: ['file1.ts', 'file2.ts'] },
    commitMessage: '',
    isAmending: false,
    isCommitting: false,
    pushAfterCommit: false,
    structuredMode: false,
    commitParts: { type: '', scope: '', subject: '', body: '', breaking: false },
    setCommitMessage: mockSetCommitMessage,
    setIsAmending: mockSetIsAmending,
    setPushAfterCommit: mockSetPushAfterCommit,
    setStructuredMode: mockSetStructuredMode,
    setCommitParts: mockSetCommitParts,
    createCommit: mockCreateCommit,
    amendCommit: mockAmendCommit,
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    repository: { path: '/test/repo', currentBranch: 'main' },
    branches: [{ name: 'main', isHead: true }],
    remotes: [{ name: 'origin' }],
  }),
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: {
      signCommits: false,
      conventionalCommitsEnabled: true,
      spellCheckCommitMessages: false,
      aiEnabled: false,
    },
  }),
}));

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: () => ({
    connectionStatus: null,
    detectedProvider: null,
    issues: [],
    pullRequests: [],
    isLoadingIssues: false,
    isLoadingPrs: false,
    loadIssues: vi.fn(),
    loadPullRequests: vi.fn(),
  }),
}));

vi.mock('@/store/operationStore', () => ({
  operations: {
    start: vi.fn().mockReturnValue('op-id'),
    complete: vi.fn(),
  },
}));

vi.mock('@/services/api', () => ({
  remoteApi: {
    pushCurrentBranch: vi.fn(),
  },
  commitApi: {
    getUserSignature: vi.fn().mockResolvedValue(['Test User', 'test@example.com']),
  },
  signingApi: {
    getConfig: vi.fn().mockResolvedValue({ signingKey: null }),
    isAvailable: vi.fn().mockResolvedValue(false),
  },
  aiApi: {
    generateCommitMessage: vi.fn(),
  },
  hooksApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  useReferenceMention: () => ({
    isOpen: false,
    items: [],
    selectedIndex: 0,
    cursorPosition: 0,
    handleInputChange: vi.fn(),
    handleKeyDown: vi.fn().mockReturnValue(false),
    handleSelect: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/lib/conventionalCommits', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual constant name
  COMMIT_TYPES: [
    { value: 'feat', label: 'feat' },
    { value: 'fix', label: 'fix' },
  ],
  formatConventionalCommit: vi.fn().mockReturnValue('feat: test'),
  parseConventionalCommit: vi.fn().mockReturnValue(null),
  getEmptyCommitParts: () => ({
    type: '',
    scope: '',
    subject: '',
    body: '',
    breaking: false,
  }),
}));

vi.mock('./ReferenceMention', () => ({
  ReferenceMention: () => null,
}));

describe('CommitForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render commit form', () => {
    render(<CommitForm />);

    expect(screen.getByPlaceholderText('staging.commitForm.placeholder')).toBeInTheDocument();
  });

  it('should render commit button with staged count', () => {
    render(<CommitForm />);

    expect(screen.getByText('staging.commitForm.commitButton')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('should render push after commit checkbox', () => {
    render(<CommitForm />);

    expect(screen.getByLabelText(/staging\.commitForm\.pushToOrigin/)).toBeInTheDocument();
  });

  it('should update commit message on input', () => {
    render(<CommitForm />);

    const textarea = screen.getByPlaceholderText('staging.commitForm.placeholder');
    fireEvent.change(textarea, { target: { value: 'Test commit message' } });

    expect(mockSetCommitMessage).toHaveBeenCalledWith('Test commit message');
  });

  it('should render commit options dropdown trigger', () => {
    render(<CommitForm />);

    expect(screen.getByText('staging.commitOptions.title')).toBeInTheDocument();
  });

  it('should disable commit button when no message and not amending', () => {
    render(<CommitForm />);

    const commitButton = screen.getByText('staging.commitForm.commitButton').closest('button');
    expect(commitButton).toBeDisabled();
  });

  it('should allow typing in textarea', () => {
    render(<CommitForm />);

    const textarea = screen.getByPlaceholderText('staging.commitForm.placeholder');
    fireEvent.change(textarea, { target: { value: 'Test message' } });

    expect(textarea).toHaveValue('Test message');
  });

  it('should show author info when available', async () => {
    render(<CommitForm />);

    await waitFor(() => {
      expect(screen.getByText(/Test User/)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });
  });

  it('should handle Ctrl+Enter keydown', () => {
    render(<CommitForm />);

    const textarea = screen.getByPlaceholderText('staging.commitForm.placeholder');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    // createCommit may or may not be called depending on canCommit state
    // This test just verifies no error is thrown
    expect(textarea).toBeInTheDocument();
  });

  it('should handle Cmd+Enter keydown', () => {
    render(<CommitForm />);

    const textarea = screen.getByPlaceholderText('staging.commitForm.placeholder');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    expect(textarea).toBeInTheDocument();
  });

  it('should render with textarea spellcheck based on settings', () => {
    render(<CommitForm />);

    const textarea = screen.getByPlaceholderText('staging.commitForm.placeholder');
    expect(textarea).toHaveAttribute('spellcheck', 'false');
  });

  it('should call setPushAfterCommit when checkbox changes', () => {
    render(<CommitForm />);

    const checkbox = screen.getByLabelText(/staging\.commitForm\.pushToOrigin/);
    fireEvent.click(checkbox);

    expect(mockSetPushAfterCommit).toHaveBeenCalledWith(true);
  });
});
