import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InitDialog } from './InitDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadRecentRepositories: vi.fn(),
  }),
}));

vi.mock('@/store/tabsStore', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual enum exports
  TabType: { Repository: 'repository' },
  useTabsStore: () => ({
    addTab: vi.fn(),
    findTabByPath: vi.fn(),
    setActiveTab: vi.fn(),
  }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/services/api', () => ({
  repositoryApi: {
    init: vi.fn(),
  },
}));

describe('InitDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<InitDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('repository.init.title')).not.toBeInTheDocument();
  });

  it('should render directory input', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByPlaceholderText('repository.init.directoryPlaceholder')).toBeInTheDocument();
  });

  it('should render bare checkbox', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.bareLabel')).toBeInTheDocument();
  });

  it('should render create button', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.createButton')).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should update path on input', () => {
    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });

    expect(input).toHaveValue('/path/to/repo');
  });

  it('should disable create button when path is empty', () => {
    render(<InitDialog {...defaultProps} />);

    const createButton = screen.getByText('repository.init.createButton');
    expect(createButton).toBeDisabled();
  });

  it('should enable create button when path is filled', () => {
    render(<InitDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.init.directoryPlaceholder');
    fireEvent.change(input, { target: { value: '/path/to/repo' } });

    const createButton = screen.getByText('repository.init.createButton');
    expect(createButton).not.toBeDisabled();
  });

  it('should render directory hint', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.directoryHint')).toBeInTheDocument();
  });

  it('should render bare description', () => {
    render(<InitDialog {...defaultProps} />);

    expect(screen.getByText('repository.init.bareDescription')).toBeInTheDocument();
  });
});
