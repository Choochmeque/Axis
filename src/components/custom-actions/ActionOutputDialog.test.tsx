import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionOutputDialog } from './ActionOutputDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

const mockCloseOutputDialog = vi.fn();

interface ActionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

let mockState = {
  showOutputDialog: false,
  lastResult: null as ActionResult | null,
  closeOutputDialog: mockCloseOutputDialog,
};

vi.mock('@/store/customActionsStore', () => ({
  useCustomActionsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector(mockState),
}));

vi.mock('@/components/ui', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange(false)} data-testid="close-dialog">
          Close
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('ActionOutputDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      showOutputDialog: false,
      lastResult: null,
      closeOutputDialog: mockCloseOutputDialog,
    };
  });

  it('should not render when no result', () => {
    render(<ActionOutputDialog />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should not render when dialog is closed', () => {
    mockState = {
      ...mockState,
      showOutputDialog: false,
      lastResult: { exitCode: 0, stdout: 'output', stderr: '', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when dialog is open with result', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: 'output', stderr: '', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('should show completed title on success', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: 'output', stderr: '', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('customActions.output.completed')).toBeInTheDocument();
  });

  it('should show failed title on error', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 1, stdout: '', stderr: 'error', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('customActions.output.failed')).toBeInTheDocument();
  });

  it('should display exit code', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: 'output', stderr: '', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('customActions.output.exitCode {"code":0}')).toBeInTheDocument();
  });

  it('should display duration', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: 'output', stderr: '', durationMs: 150 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('(150ms)')).toBeInTheDocument();
  });

  it('should display stdout when present', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: 'Hello World', stderr: '', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('customActions.output.outputLabel')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should display stderr when present with success', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: '', stderr: 'Warning message', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('customActions.output.warnings')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should display stderr as error when failed', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 1, stdout: '', stderr: 'Error message', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('customActions.output.error')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should display no output message when both are empty', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: '', stderr: '', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('customActions.output.noOutput')).toBeInTheDocument();
  });

  it('should render close button', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: 'output', stderr: '', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    expect(screen.getByText('common.close')).toBeInTheDocument();
  });

  it('should call closeOutputDialog when dialog closed', () => {
    mockState = {
      ...mockState,
      showOutputDialog: true,
      lastResult: { exitCode: 0, stdout: 'output', stderr: '', durationMs: 100 },
    };

    render(<ActionOutputDialog />);

    fireEvent.click(screen.getByTestId('close-dialog'));

    expect(mockCloseOutputDialog).toHaveBeenCalled();
  });
});
