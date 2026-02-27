import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchiveDialog } from './ArchiveDialog';

// Mock hooks
vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock API
const mockCreate = vi.fn();
vi.mock('../../services/api', () => ({
  archiveApi: {
    create: (params: unknown) => mockCreate(params),
  },
}));

// Mock Tauri dialog
const mockOpen = vi.fn();
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (options: unknown) => mockOpen(options),
}));

// Mock store
vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      repository: {
        name: 'test-repo',
        path: '/test/path',
      },
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
  Input: ({ id, value, onChange, placeholder, disabled }: any) => (
    <input
      id={id}
      data-testid={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Select: ({ children, value, onValueChange, id }: any) => (
    <select id={id} data-testid={id} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Label: ({ children }: any) => <label>{children}</label>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
}));

describe('ArchiveDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<ArchiveDialog isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render form when open', () => {
    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('history.archive.title');
    expect(screen.getByTestId('archive-format')).toBeInTheDocument();
    expect(screen.getByTestId('output-path')).toBeInTheDocument();
    expect(screen.getByTestId('archive-prefix')).toBeInTheDocument();
  });

  it('should show commit info when provided', () => {
    render(
      <ArchiveDialog
        isOpen={true}
        onClose={mockOnClose}
        commitOid="abc1234567890"
        commitSummary="Initial commit"
      />
    );

    expect(screen.getByText('abc1234')).toBeInTheDocument();
    expect(screen.getByText('- Initial commit')).toBeInTheDocument();
  });

  it('should show HEAD when no commit provided', () => {
    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('HEAD')).toBeInTheDocument();
  });

  it('should initialize prefix with repository name', () => {
    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('archive-prefix')).toHaveValue('test-repo/');
  });

  it('should change format selection', () => {
    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    const formatSelect = screen.getByTestId('archive-format');
    expect(formatSelect).toHaveValue('zip');

    fireEvent.change(formatSelect, { target: { value: 'tar.gz' } });

    expect(formatSelect).toHaveValue('tar.gz');
  });

  it('should open file browser and set output path', async () => {
    mockOpen.mockResolvedValue('/selected/path/archive.zip');

    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} commitOid="abc1234" />);

    // Find browse button (the one with FolderOpen icon)
    const buttons = screen.getAllByRole('button');
    const browseButton = buttons.find((b) => !b.textContent?.includes('history.archive'));
    expect(browseButton).toBeInTheDocument();

    fireEvent.click(browseButton!);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
      expect(screen.getByTestId('output-path')).toHaveValue('/selected/path/archive.zip');
    });
  });

  it('should disable create button when output path is empty', () => {
    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    // Button should be disabled when output path is empty
    expect(screen.getByText('history.archive.createButton')).toBeDisabled();

    // Enter output path
    fireEvent.change(screen.getByTestId('output-path'), {
      target: { value: '/output/archive.zip' },
    });

    // Button should now be enabled
    expect(screen.getByText('history.archive.createButton')).not.toBeDisabled();
  });

  it('should create archive successfully', async () => {
    mockCreate.mockResolvedValue(undefined);

    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} commitOid="abc1234" />);

    fireEvent.change(screen.getByTestId('output-path'), {
      target: { value: '/output/archive.zip' },
    });
    fireEvent.change(screen.getByTestId('archive-prefix'), {
      target: { value: 'my-prefix/' },
    });

    fireEvent.click(screen.getByText('history.archive.createButton'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        reference: 'abc1234',
        format: 'zip',
        outputPath: '/output/archive.zip',
        prefix: 'my-prefix/',
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should create archive with HEAD when no commit specified', async () => {
    mockCreate.mockResolvedValue(undefined);

    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByTestId('output-path'), {
      target: { value: '/output/archive.tar.gz' },
    });
    fireEvent.change(screen.getByTestId('archive-format'), { target: { value: 'tar.gz' } });

    fireEvent.click(screen.getByText('history.archive.createButton'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        reference: 'HEAD',
        format: 'tar.gz',
        outputPath: '/output/archive.tar.gz',
        prefix: 'test-repo/',
      });
    });
  });

  it('should create archive with null prefix when empty', async () => {
    mockCreate.mockResolvedValue(undefined);

    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByTestId('output-path'), {
      target: { value: '/output/archive.zip' },
    });
    fireEvent.change(screen.getByTestId('archive-prefix'), { target: { value: '' } });

    fireEvent.click(screen.getByText('history.archive.createButton'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        reference: 'HEAD',
        format: 'zip',
        outputPath: '/output/archive.zip',
        prefix: null,
      });
    });
  });

  it('should handle create error', async () => {
    mockCreate.mockRejectedValue(new Error('Create failed'));

    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByTestId('output-path'), {
      target: { value: '/output/archive.zip' },
    });

    fireEvent.click(screen.getByText('history.archive.createButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('Create failed');
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('should show loading state during creation', async () => {
    let resolveCreate: () => void;
    mockCreate.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveCreate = resolve;
      })
    );

    render(<ArchiveDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByTestId('output-path'), {
      target: { value: '/output/archive.zip' },
    });

    fireEvent.click(screen.getByText('history.archive.createButton'));

    await waitFor(() => {
      expect(screen.getByText('history.archive.creating')).toBeInTheDocument();
    });

    resolveCreate!();

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
