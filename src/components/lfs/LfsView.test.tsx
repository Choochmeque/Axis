import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LfsView } from './LfsView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const mockLfsStore = {
  status: {
    isInstalled: true,
    isInitialized: true,
    version: '3.4.0',
    lfsFilesCount: 5,
  },
  patterns: [
    { pattern: '*.psd', sourceFile: '.gitattributes' },
    { pattern: '*.zip', sourceFile: '.gitattributes' },
  ],
  files: [
    { path: 'assets/image.psd', oid: 'abc123def456', size: 1048576, isDownloaded: true },
    { path: 'assets/archive.zip', oid: 'def456abc789', size: 2097152, isDownloaded: false },
  ],
  isLoadingStatus: false,
  isLoadingPatterns: false,
  isLoadingFiles: false,
  isInstalling: false,
  isPulling: false,
  isPushing: false,
  loadAll: vi.fn(),
  install: vi.fn(),
  track: vi.fn(),
  untrack: vi.fn(),
  pull: vi.fn(),
  push: vi.fn(),
};

vi.mock('@/store/lfsStore', () => ({
  useLfsStore: () => mockLfsStore,
}));

vi.mock('@/components/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
  ConfirmDialog: ({
    isOpen,
    title,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel: string;
  }) => (isOpen ? <div data-testid="confirm-dialog">{title}</div> : null),
  VirtualList: ({
    items,
    children,
    emptyMessage,
  }: {
    items: unknown[];
    children: (item: unknown) => React.ReactNode;
    emptyMessage: string;
  }) => {
    if (items.length === 0) return <div data-testid="empty">{emptyMessage}</div>;
    return (
      <div data-testid="virtual-list">
        {items.map((item, i) => (
          <div key={i} data-testid="lfs-file-item">
            {children(item)}
          </div>
        ))}
      </div>
    );
  },
}));

describe('LfsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLfsStore.status = {
      isInstalled: true,
      isInitialized: true,
      version: '3.4.0',
      lfsFilesCount: 5,
    };
    mockLfsStore.patterns = [
      { pattern: '*.psd', sourceFile: '.gitattributes' },
      { pattern: '*.zip', sourceFile: '.gitattributes' },
    ];
    mockLfsStore.files = [
      { path: 'assets/image.psd', oid: 'abc123def456', size: 1048576, isDownloaded: true },
      { path: 'assets/archive.zip', oid: 'def456abc789', size: 2097152, isDownloaded: false },
    ];
    mockLfsStore.isLoadingStatus = false;
    mockLfsStore.isLoadingPatterns = false;
    mockLfsStore.isLoadingFiles = false;
  });

  it('should render LFS title', () => {
    render(<LfsView />);

    expect(screen.getByText('lfs.title')).toBeInTheDocument();
  });

  it('should display version number', () => {
    render(<LfsView />);

    expect(screen.getByText('v3.4.0')).toBeInTheDocument();
  });

  it('should load data on mount', () => {
    render(<LfsView />);

    expect(mockLfsStore.loadAll).toHaveBeenCalled();
  });

  it('should render patterns tab by default', () => {
    render(<LfsView />);

    expect(screen.getByText('lfs.tabs.patterns (2)')).toBeInTheDocument();
    expect(screen.getByText('lfs.tabs.files (2)')).toBeInTheDocument();
  });

  it('should display patterns list', () => {
    render(<LfsView />);

    expect(screen.getByText('*.psd')).toBeInTheDocument();
    expect(screen.getByText('*.zip')).toBeInTheDocument();
  });

  it('should switch to files tab', () => {
    render(<LfsView />);

    fireEvent.click(screen.getByText('lfs.tabs.files (2)'));

    // Should show file list
    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('should open track dialog when Plus button clicked', () => {
    render(<LfsView />);

    fireEvent.click(screen.getByTitle('lfs.actions.trackPattern'));

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('lfs.trackDialog.title')).toBeInTheDocument();
  });

  it('should call pull when Pull button clicked', () => {
    render(<LfsView />);

    fireEvent.click(screen.getByTitle('lfs.actions.pullObjects'));

    expect(mockLfsStore.pull).toHaveBeenCalled();
  });

  it('should call push when Push button clicked', () => {
    render(<LfsView />);

    fireEvent.click(screen.getByTitle('lfs.actions.pushObjects'));

    expect(mockLfsStore.push).toHaveBeenCalled();
  });

  it('should call loadAll when Refresh button clicked', () => {
    render(<LfsView />);

    mockLfsStore.loadAll.mockClear();
    fireEvent.click(screen.getByTitle('common.refresh'));

    expect(mockLfsStore.loadAll).toHaveBeenCalled();
  });

  it('should show not installed view when LFS is not installed', () => {
    mockLfsStore.status = {
      isInstalled: false,
      isInitialized: false,
      version: null as unknown as string,
      lfsFilesCount: 0,
    };

    render(<LfsView />);

    expect(screen.getByText('lfs.notInstalled.title')).toBeInTheDocument();
    expect(screen.getByText('lfs.notInstalled.message')).toBeInTheDocument();
  });

  it('should show not initialized view when LFS is not initialized', () => {
    mockLfsStore.status = {
      isInstalled: true,
      isInitialized: false,
      version: '3.4.0',
      lfsFilesCount: 0,
    };

    render(<LfsView />);

    expect(screen.getByText('lfs.initialize.button')).toBeInTheDocument();
  });

  it('should call install when Initialize button clicked', async () => {
    mockLfsStore.status = {
      isInstalled: true,
      isInitialized: false,
      version: '3.4.0',
      lfsFilesCount: 0,
    };

    render(<LfsView />);

    fireEvent.click(screen.getByText('lfs.initialize.buttonShort'));

    expect(mockLfsStore.install).toHaveBeenCalled();
  });

  it('should show empty patterns message when no patterns', () => {
    mockLfsStore.patterns = [];

    render(<LfsView />);

    expect(screen.getByText('lfs.patterns.empty')).toBeInTheDocument();
  });
});
