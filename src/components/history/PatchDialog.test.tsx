import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatchDialog } from './PatchDialog';

// Mock hooks
vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Radix Tabs
vi.mock('@radix-ui/react-tabs', () => ({
  Root: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div
      data-testid="tabs-root"
      data-value={value}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.tabvalue) {
          onValueChange(target.dataset.tabvalue);
        }
      }}
    >
      {children}
    </div>
  ),
  List: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  Trigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`} data-tabvalue={value}>
      {children}
    </button>
  ),
  Content: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

// Mock API
const mockCreatePatch = vi.fn();
const mockFormatPatch = vi.fn();
const mockApplyPatch = vi.fn();
const mockApplyMailbox = vi.fn();
vi.mock('../../services/api', () => ({
  patchApi: {
    createPatch: (params: unknown) => mockCreatePatch(params),
    formatPatch: (params: unknown) => mockFormatPatch(params),
    applyPatch: (params: unknown) => mockApplyPatch(params),
    applyMailbox: (params: unknown) => mockApplyMailbox(params),
  },
}));

// Mock Tauri dialog
const mockOpen = vi.fn();
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (options: unknown) => mockOpen(options),
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
  Label: ({ children }: any) => <label>{children}</label>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CheckboxField: ({ id, label, checked, onCheckedChange, disabled }: any) => (
    <div>
      <input
        type="checkbox"
        id={id}
        data-testid={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
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

describe('PatchDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<PatchDialog isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render with create tab by default', () => {
    render(<PatchDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('history.patch.title');
    expect(screen.getByTestId('tabs-root')).toHaveAttribute('data-value', 'create');
  });

  it('should render with apply tab when mode is apply', () => {
    render(<PatchDialog isOpen={true} onClose={mockOnClose} mode="apply" />);

    expect(screen.getByTestId('tabs-root')).toHaveAttribute('data-value', 'apply');
  });

  it('should show commit info when commitOid is provided', () => {
    render(
      <PatchDialog
        isOpen={true}
        onClose={mockOnClose}
        commitOid="abc1234567890"
        commitSummary="Test commit"
      />
    );

    expect(screen.getByText('abc1234')).toBeInTheDocument();
    expect(screen.getByText('- Test commit')).toBeInTheDocument();
  });

  it('should browse for output directory', async () => {
    mockOpen.mockResolvedValue('/selected/output/dir');

    render(<PatchDialog isOpen={true} onClose={mockOnClose} />);

    // Find browse buttons (the ones without text content)
    const buttons = screen.getAllByRole('button');
    const browseButton = buttons.find(
      (b) => !b.textContent?.includes('history.patch') && !b.textContent?.includes('common.')
    );

    fireEvent.click(browseButton!);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          directory: true,
        })
      );
      expect(screen.getByTestId('output-dir')).toHaveValue('/selected/output/dir');
    });
  });

  it('should create patch from specific commit', async () => {
    mockCreatePatch.mockResolvedValue({ message: 'Patch created' });

    render(
      <PatchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        commitOid="abc1234"
      />
    );

    fireEvent.change(screen.getByTestId('output-dir'), { target: { value: '/output/dir' } });
    fireEvent.click(screen.getByText('history.patch.createButton'));

    await waitFor(() => {
      expect(mockCreatePatch).toHaveBeenCalledWith({
        commitOid: 'abc1234',
        outputDir: '/output/dir',
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should create patch from HEAD when no commit specified', async () => {
    mockFormatPatch.mockResolvedValue({ message: 'Patch created' });

    render(<PatchDialog isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByTestId('output-dir'), { target: { value: '/output/dir' } });
    fireEvent.click(screen.getByText('history.patch.createButton'));

    await waitFor(() => {
      expect(mockFormatPatch).toHaveBeenCalledWith({
        range: '-1',
        outputDir: '/output/dir',
      });
    });
  });

  it('should disable create button when output dir is empty', () => {
    render(<PatchDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('history.patch.createButton')).toBeDisabled();
  });

  it('should handle create error', async () => {
    mockFormatPatch.mockRejectedValue(new Error('Create failed'));

    render(<PatchDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByTestId('output-dir'), { target: { value: '/output/dir' } });
    fireEvent.click(screen.getByText('history.patch.createButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('Create failed');
    });
  });

  it('should switch to apply tab', () => {
    render(<PatchDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTestId('tab-apply'));

    expect(screen.getByTestId('tabs-root')).toHaveAttribute('data-value', 'apply');
  });

  it('should accept manual patch file input', () => {
    render(<PatchDialog isOpen={true} onClose={mockOnClose} mode="apply" />);

    fireEvent.change(screen.getByTestId('patch-path'), {
      target: { value: '/path/to/file.patch' },
    });

    expect(screen.getByTestId('patch-path')).toHaveValue('/path/to/file.patch');
    expect(screen.getByText('history.patch.applyButton')).not.toBeDisabled();
  });

  it('should apply patch without git am', async () => {
    mockApplyPatch.mockResolvedValue({ message: 'Patch applied' });

    render(
      <PatchDialog isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} mode="apply" />
    );

    fireEvent.change(screen.getByTestId('patch-path'), {
      target: { value: '/path/to/file.patch' },
    });
    fireEvent.click(screen.getByText('history.patch.applyButton'));

    await waitFor(() => {
      expect(mockApplyPatch).toHaveBeenCalledWith({
        patchPath: '/path/to/file.patch',
        checkOnly: false,
        threeWay: false,
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should apply patch with git am when useAm is checked', async () => {
    mockApplyMailbox.mockResolvedValue({ message: 'Patch applied' });

    render(<PatchDialog isOpen={true} onClose={mockOnClose} mode="apply" />);

    fireEvent.change(screen.getByTestId('patch-path'), {
      target: { value: '/path/to/file.patch' },
    });
    fireEvent.click(screen.getByTestId('use-am'));
    fireEvent.click(screen.getByText('history.patch.applyButton'));

    await waitFor(() => {
      expect(mockApplyMailbox).toHaveBeenCalledWith({
        patchPaths: ['/path/to/file.patch'],
        threeWay: false,
      });
    });
  });

  it('should check patch validity when checkOnly is enabled', async () => {
    mockApplyPatch.mockResolvedValue({ message: 'Patch valid' });

    render(<PatchDialog isOpen={true} onClose={mockOnClose} mode="apply" />);

    fireEvent.change(screen.getByTestId('patch-path'), {
      target: { value: '/path/to/file.patch' },
    });
    fireEvent.click(screen.getByTestId('check-only'));
    fireEvent.click(screen.getByText('history.patch.checkButton'));

    await waitFor(() => {
      expect(mockApplyPatch).toHaveBeenCalledWith({
        patchPath: '/path/to/file.patch',
        checkOnly: true,
        threeWay: false,
      });
    });
  });

  it('should enable three-way merge', async () => {
    mockApplyPatch.mockResolvedValue({ message: 'Patch applied' });

    render(<PatchDialog isOpen={true} onClose={mockOnClose} mode="apply" />);

    fireEvent.change(screen.getByTestId('patch-path'), {
      target: { value: '/path/to/file.patch' },
    });
    fireEvent.click(screen.getByTestId('three-way'));
    fireEvent.click(screen.getByText('history.patch.applyButton'));

    await waitFor(() => {
      expect(mockApplyPatch).toHaveBeenCalledWith({
        patchPath: '/path/to/file.patch',
        checkOnly: false,
        threeWay: true,
      });
    });
  });

  it('should handle apply error', async () => {
    mockApplyPatch.mockRejectedValue(new Error('Apply failed'));

    render(<PatchDialog isOpen={true} onClose={mockOnClose} mode="apply" />);

    fireEvent.change(screen.getByTestId('patch-path'), {
      target: { value: '/path/to/file.patch' },
    });
    fireEvent.click(screen.getByText('history.patch.applyButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('Apply failed');
    });
  });

  it('should disable apply button when patch path is empty', () => {
    render(<PatchDialog isOpen={true} onClose={mockOnClose} mode="apply" />);

    expect(screen.getByText('history.patch.applyButton')).toBeDisabled();
  });
});
