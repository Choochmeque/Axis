import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddSubmoduleDialog } from './AddSubmoduleDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockAdd = vi.fn();
const mockLoadSubmodules = vi.fn();

vi.mock('../../services/api', () => ({
  submoduleApi: {
    add: (...args: unknown[]) => mockAdd(...args),
  },
}));

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadSubmodules: mockLoadSubmodules,
  }),
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
  FormField: ({ children, label }: { children: React.ReactNode; label: string; hint?: string }) => (
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
  }) => <input value={value} onChange={onChange} placeholder={placeholder} data-testid={id} />,
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('AddSubmoduleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<AddSubmoduleDialog open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('sidebar.submodule.addDialog.title')).toBeInTheDocument();
  });

  it('should render URL input', () => {
    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('sidebar.submodule.addDialog.urlLabel')).toBeInTheDocument();
    expect(screen.getByTestId('submodule-url')).toBeInTheDocument();
  });

  it('should render path input', () => {
    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('sidebar.submodule.addDialog.pathLabel')).toBeInTheDocument();
    expect(screen.getByTestId('submodule-path')).toBeInTheDocument();
  });

  it('should render branch input', () => {
    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('sidebar.submodule.addDialog.branchLabel')).toBeInTheDocument();
    expect(screen.getByTestId('submodule-branch')).toBeInTheDocument();
  });

  it('should have add button disabled when inputs are empty', () => {
    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    const addButton = screen.getByText('sidebar.submodule.addDialog.addButton');
    expect(addButton).toBeDisabled();
  });

  it('should enable add button when URL and path are filled', () => {
    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('submodule-url'), {
      target: { value: 'https://github.com/user/repo.git' },
    });
    fireEvent.change(screen.getByTestId('submodule-path'), {
      target: { value: 'libs/repo' },
    });

    const addButton = screen.getByText('sidebar.submodule.addDialog.addButton');
    expect(addButton).not.toBeDisabled();
  });

  it('should call submoduleApi.add when add button clicked', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadSubmodules.mockResolvedValue(undefined);

    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('submodule-url'), {
      target: { value: 'https://github.com/user/repo.git' },
    });
    fireEvent.change(screen.getByTestId('submodule-path'), {
      target: { value: 'libs/repo' },
    });

    fireEvent.click(screen.getByText('sidebar.submodule.addDialog.addButton'));

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith({
        url: 'https://github.com/user/repo.git',
        path: 'libs/repo',
        branch: null,
        name: null,
        depth: null,
      });
    });
  });

  it('should pass branch when provided', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadSubmodules.mockResolvedValue(undefined);

    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('submodule-url'), {
      target: { value: 'https://github.com/user/repo.git' },
    });
    fireEvent.change(screen.getByTestId('submodule-path'), {
      target: { value: 'libs/repo' },
    });
    fireEvent.change(screen.getByTestId('submodule-branch'), {
      target: { value: 'develop' },
    });

    fireEvent.click(screen.getByText('sidebar.submodule.addDialog.addButton'));

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith({
        url: 'https://github.com/user/repo.git',
        path: 'libs/repo',
        branch: 'develop',
        name: null,
        depth: null,
      });
    });
  });

  it('should call loadSubmodules after successful add', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadSubmodules.mockResolvedValue(undefined);

    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('submodule-url'), {
      target: { value: 'https://github.com/user/repo.git' },
    });
    fireEvent.change(screen.getByTestId('submodule-path'), {
      target: { value: 'libs/repo' },
    });

    fireEvent.click(screen.getByText('sidebar.submodule.addDialog.addButton'));

    await waitFor(() => {
      expect(mockLoadSubmodules).toHaveBeenCalled();
    });
  });

  it('should close dialog after successful add', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadSubmodules.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(<AddSubmoduleDialog open={true} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByTestId('submodule-url'), {
      target: { value: 'https://github.com/user/repo.git' },
    });
    fireEvent.change(screen.getByTestId('submodule-path'), {
      target: { value: 'libs/repo' },
    });

    fireEvent.click(screen.getByText('sidebar.submodule.addDialog.addButton'));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should show error when add fails', async () => {
    mockAdd.mockRejectedValue(new Error('Failed to add submodule'));

    render(<AddSubmoduleDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('submodule-url'), {
      target: { value: 'https://github.com/user/repo.git' },
    });
    fireEvent.change(screen.getByTestId('submodule-path'), {
      target: { value: 'libs/repo' },
    });

    fireEvent.click(screen.getByText('sidebar.submodule.addDialog.addButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });
});
