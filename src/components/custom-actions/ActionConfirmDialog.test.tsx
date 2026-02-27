import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomAction } from '@/types';
import { ActionContext, ActionStorageType } from '@/types';
import { ActionConfirmDialog } from './ActionConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

const mockCancelConfirmation = vi.fn();
const mockProceedWithExecution = vi.fn();

const mockAction: CustomAction = {
  id: 'test-id',
  name: 'Test Action',
  description: 'Test description',
  command: 'echo test',
  workingDir: null,
  contexts: [ActionContext.Repository],
  shortcut: null,
  confirm: true,
  confirmMessage: null,
  showOutput: true,
  enabled: true,
  order: 0,
  storage: ActionStorageType.Global,
};

let mockState = {
  showConfirmDialog: false,
  pendingAction: null as CustomAction | null,
  cancelConfirmation: mockCancelConfirmation,
  proceedWithExecution: mockProceedWithExecution,
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
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('ActionConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      showConfirmDialog: false,
      pendingAction: null,
      cancelConfirmation: mockCancelConfirmation,
      proceedWithExecution: mockProceedWithExecution,
    };
  });

  it('should not render when no pending action', () => {
    render(<ActionConfirmDialog />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should not render when dialog is closed', () => {
    mockState = {
      ...mockState,
      showConfirmDialog: false,
      pendingAction: mockAction,
    };

    render(<ActionConfirmDialog />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when dialog is open with pending action', () => {
    mockState = {
      ...mockState,
      showConfirmDialog: true,
      pendingAction: mockAction,
    };

    render(<ActionConfirmDialog />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('customActions.confirm.title')).toBeInTheDocument();
  });

  it('should display default confirm message when no custom message', () => {
    mockState = {
      ...mockState,
      showConfirmDialog: true,
      pendingAction: mockAction,
    };

    render(<ActionConfirmDialog />);

    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('should display custom confirm message when provided', () => {
    const actionWithMessage: CustomAction = {
      ...mockAction,
      confirmMessage: 'Are you sure you want to run this?',
    };
    mockState = {
      ...mockState,
      showConfirmDialog: true,
      pendingAction: actionWithMessage,
    };

    render(<ActionConfirmDialog />);

    expect(screen.getByText('Are you sure you want to run this?')).toBeInTheDocument();
  });

  it('should display action description when present', () => {
    mockState = {
      ...mockState,
      showConfirmDialog: true,
      pendingAction: mockAction,
    };

    render(<ActionConfirmDialog />);

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should render cancel and run buttons', () => {
    mockState = {
      ...mockState,
      showConfirmDialog: true,
      pendingAction: mockAction,
    };

    render(<ActionConfirmDialog />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('customActions.confirm.runButton')).toBeInTheDocument();
  });

  it('should call proceedWithExecution when run button clicked', () => {
    mockState = {
      ...mockState,
      showConfirmDialog: true,
      pendingAction: mockAction,
    };

    render(<ActionConfirmDialog />);

    fireEvent.click(screen.getByText('customActions.confirm.runButton'));

    expect(mockProceedWithExecution).toHaveBeenCalled();
  });

  it('should call cancelConfirmation when dialog closed', () => {
    mockState = {
      ...mockState,
      showConfirmDialog: true,
      pendingAction: mockAction,
    };

    render(<ActionConfirmDialog />);

    fireEvent.click(screen.getByTestId('close-dialog'));

    expect(mockCancelConfirmation).toHaveBeenCalled();
  });
});
