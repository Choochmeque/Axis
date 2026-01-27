import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { IgnoreDialog } from './IgnoreDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockGetOptions = vi.fn();
const mockAddPattern = vi.fn();
const mockAddToGlobal = vi.fn();
const mockLoadStatus = vi.fn();

vi.mock('@/services/api', () => ({
  gitignoreApi: {
    getOptions: (path: string) => mockGetOptions(path),
    addPattern: (pattern: string, file: string) => mockAddPattern(pattern, file),
    addToGlobal: (pattern: string) => mockAddToGlobal(pattern),
  },
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      loadStatus: mockLoadStatus,
    }),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

describe('IgnoreDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    filePath: 'src/test.ts',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOptions.mockResolvedValue({
      suggestions: [
        { pattern: '*.ts', description: 'TypeScript files' },
        { pattern: 'src/test.ts', description: 'Exact file' },
      ],
      gitignoreFiles: ['.gitignore', 'src/.gitignore'],
      defaultGitignore: '.gitignore',
    });
  });

  it('should render dialog title when open', async () => {
    render(<IgnoreDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('staging.ignoreDialog.title')).toBeInTheDocument();
    });
  });

  it('should not render when closed', () => {
    render(<IgnoreDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('staging.ignoreDialog.title')).not.toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<IgnoreDialog {...defaultProps} />);

    expect(screen.getByText('staging.ignoreDialog.loading')).toBeInTheDocument();
  });

  it('should load options when opened', async () => {
    render(<IgnoreDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetOptions).toHaveBeenCalledWith('src/test.ts');
    });
  });

  it('should have cancel button', async () => {
    render(<IgnoreDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('common.cancel')).toBeInTheDocument();
    });
  });

  it('should have add button', async () => {
    render(<IgnoreDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('staging.ignoreDialog.addButton')).toBeInTheDocument();
    });
  });

  it('should call onClose when loading fails', async () => {
    mockGetOptions.mockRejectedValue(new Error('Load failed'));

    render(<IgnoreDialog {...defaultProps} />);

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('should render with different file path', async () => {
    render(<IgnoreDialog {...defaultProps} filePath="another/file.js" />);

    await waitFor(() => {
      expect(mockGetOptions).toHaveBeenCalledWith('another/file.js');
    });
  });
});
