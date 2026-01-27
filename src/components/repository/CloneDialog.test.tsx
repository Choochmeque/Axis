import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CloneDialog } from './CloneDialog';

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

vi.mock('@/hooks', () => ({
  useOperation: () => ({
    trackOperation: vi.fn((_opts, fn) => fn()),
  }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/services/api', () => ({
  repositoryApi: {
    clone: vi.fn(),
  },
}));

describe('CloneDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByText('repository.clone.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<CloneDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('repository.clone.title')).not.toBeInTheDocument();
  });

  it('should render URL input', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByPlaceholderText('repository.clone.urlPlaceholder')).toBeInTheDocument();
  });

  it('should render destination input', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(
      screen.getByPlaceholderText('repository.clone.destinationPlaceholder')
    ).toBeInTheDocument();
  });

  it('should render clone button', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByText('repository.clone.cloneButton')).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should update URL on input', () => {
    render(<CloneDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    fireEvent.change(input, { target: { value: 'https://github.com/user/repo.git' } });

    expect(input).toHaveValue('https://github.com/user/repo.git');
  });

  it('should disable clone button when URL is empty', () => {
    render(<CloneDialog {...defaultProps} />);

    const cloneButton = screen.getByText('repository.clone.cloneButton');
    expect(cloneButton).toBeDisabled();
  });

  it('should enable clone button when URL and path are filled', () => {
    render(<CloneDialog {...defaultProps} />);

    const urlInput = screen.getByPlaceholderText('repository.clone.urlPlaceholder');
    const pathInput = screen.getByPlaceholderText('repository.clone.destinationPlaceholder');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } });
    fireEvent.change(pathInput, { target: { value: '/path/to/repo' } });

    const cloneButton = screen.getByText('repository.clone.cloneButton');
    expect(cloneButton).not.toBeDisabled();
  });

  it('should render URL hint', () => {
    render(<CloneDialog {...defaultProps} />);

    expect(screen.getByText('repository.clone.urlHint')).toBeInTheDocument();
  });
});
