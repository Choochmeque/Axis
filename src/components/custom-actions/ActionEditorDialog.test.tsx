import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionEditorDialog } from './ActionEditorDialog';
import { ActionContext, ActionStorageType } from '@/types';
import type { CustomAction } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockSaveAction = vi.fn();

vi.mock('@/store/customActionsStore', () => ({
  useCustomActionsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ saveAction: mockSaveAction }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/components/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  FormField: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    id,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid={id || 'input'}
    />
  ),
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="storage-select"
    >
      {children}
    </select>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  CheckboxField: ({
    label,
    checked,
    onCheckedChange,
    id,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id?: string;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        data-testid={id || 'checkbox'}
      />
      {label}
    </label>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('ActionEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<ActionEditorDialog open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.createTitle')).toBeInTheDocument();
  });

  it('should show edit title when editing existing action', () => {
    const existingAction: CustomAction = {
      id: 'test-id',
      name: 'Test Action',
      description: 'Test description',
      command: 'echo test',
      workingDir: null,
      contexts: [ActionContext.Repository],
      shortcut: null,
      confirm: false,
      confirmMessage: null,
      showOutput: true,
      enabled: true,
      order: 0,
      storage: ActionStorageType.Global,
    };

    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} action={existingAction} />);

    expect(screen.getByText('customActions.editor.editTitle')).toBeInTheDocument();
  });

  it('should render form fields', () => {
    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('customActions.editor.nameLabel')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.descriptionLabel')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.commandLabel')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.workingDirLabel')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.contextsLabel')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.shortcutLabel')).toBeInTheDocument();
  });

  it('should render context options', () => {
    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('customActions.editor.contexts.file')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.contexts.commit')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.contexts.branch')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.contexts.tag')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.contexts.stash')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.contexts.repository')).toBeInTheDocument();
  });

  it('should render cancel and create buttons', () => {
    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('customActions.editor.createButton')).toBeInTheDocument();
  });

  it('should show save button when editing', () => {
    const existingAction: CustomAction = {
      id: 'test-id',
      name: 'Test Action',
      description: null,
      command: 'echo test',
      workingDir: null,
      contexts: [ActionContext.Repository],
      shortcut: null,
      confirm: false,
      confirmMessage: null,
      showOutput: true,
      enabled: true,
      order: 0,
      storage: ActionStorageType.Global,
    };

    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} action={existingAction} />);

    expect(screen.getByText('common.save')).toBeInTheDocument();
  });

  it('should call saveAction when form submitted', async () => {
    mockSaveAction.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(<ActionEditorDialog open={true} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByTestId('action-name'), { target: { value: 'My Action' } });
    // Command field is a native textarea, not a mocked Input
    const commandTextarea = document.getElementById('action-command') as HTMLTextAreaElement;
    fireEvent.change(commandTextarea, { target: { value: 'echo hello' } });
    fireEvent.click(screen.getByText('customActions.editor.createButton'));

    await waitFor(() => {
      expect(mockSaveAction).toHaveBeenCalled();
    });
  });

  it('should show error when name is empty', async () => {
    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByText('customActions.editor.createButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('customActions.editor.validation.nameRequired')).toBeInTheDocument();
    });
  });

  it('should render storage selector when no defaultStorage', () => {
    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('customActions.editor.storageLabel')).toBeInTheDocument();
  });

  it('should hide storage selector when defaultStorage provided', () => {
    render(
      <ActionEditorDialog
        open={true}
        onOpenChange={vi.fn()}
        defaultStorage={ActionStorageType.Repository}
      />
    );

    expect(screen.queryByText('customActions.editor.storageLabel')).toBeNull();
  });

  it('should show confirm checkbox', () => {
    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('customActions.editor.confirmLabel')).toBeInTheDocument();
  });

  it('should show output checkbox', () => {
    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('customActions.editor.showOutputLabel')).toBeInTheDocument();
  });

  it('should populate form when editing existing action', () => {
    const existingAction: CustomAction = {
      id: 'test-id',
      name: 'Test Action',
      description: 'Test description',
      command: 'echo test',
      workingDir: '/path/to/dir',
      contexts: [ActionContext.Repository],
      shortcut: 'mod+shift+t',
      confirm: true,
      confirmMessage: 'Are you sure?',
      showOutput: false,
      enabled: true,
      order: 0,
      storage: ActionStorageType.Global,
    };

    render(<ActionEditorDialog open={true} onOpenChange={vi.fn()} action={existingAction} />);

    expect(screen.getByTestId('action-name')).toHaveValue('Test Action');
    expect(screen.getByTestId('action-description')).toHaveValue('Test description');
    expect(screen.getByTestId('action-workdir')).toHaveValue('/path/to/dir');
    expect(screen.getByTestId('action-shortcut')).toHaveValue('mod+shift+t');
  });
});
