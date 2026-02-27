import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock modules
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockSetCurrentView = vi.fn();
const mockRefreshRepository = vi.fn();
const mockOpenCreateBranchDialog = vi.fn();
const mockOpenCheckoutBranchDialog = vi.fn();
const mockOpenFetchDialog = vi.fn();
const mockOpenPushDialog = vi.fn();
const mockOpenPullDialog = vi.fn();
const mockOpenStashDialog = vi.fn();
const mockOpenSettingsDialog = vi.fn();
const mockOpenRepositorySettingsDialog = vi.fn();

const mockRepository = {
  current: null as { path: string; currentBranch: string | null; isUnborn: boolean } | null,
};
const mockStatus = {
  current: null as { staged: string[] } | null,
};
const mockBranches = {
  current: [] as Array<{ isHead: boolean; ahead: number; behind: number }>,
};
const mockRemotes = {
  current: [] as Array<{ name: string }>,
};

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    repository: mockRepository.current,
    status: mockStatus.current,
    branches: mockBranches.current,
    remotes: mockRemotes.current,
    setCurrentView: mockSetCurrentView,
    refreshRepository: mockRefreshRepository,
  }),
}));

vi.mock('@/store/dialogStore', () => ({
  useDialogStore: () => ({
    openCreateBranchDialog: mockOpenCreateBranchDialog,
    openCheckoutBranchDialog: mockOpenCheckoutBranchDialog,
    openFetchDialog: mockOpenFetchDialog,
    openPushDialog: mockOpenPushDialog,
    openPullDialog: mockOpenPullDialog,
    openStashDialog: mockOpenStashDialog,
    openSettingsDialog: mockOpenSettingsDialog,
    openRepositorySettingsDialog: mockOpenRepositorySettingsDialog,
  }),
}));

vi.mock('@/services/api', () => ({
  shellApi: {
    openTerminal: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/lib/actions', () => ({
  showInFinder: vi.fn(),
}));

vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  return {
    ...actual,
    toast: {
      error: vi.fn(),
    },
  };
});

vi.mock('../../hooks', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  beforeEach(() => {
    mockRepository.current = null;
    mockStatus.current = null;
    mockBranches.current = [];
    mockRemotes.current = [];
    vi.clearAllMocks();
  });

  it('should render empty toolbar when no repository', () => {
    render(<Toolbar />);

    // Should not show any buttons except the container
    expect(screen.queryByTitle('toolbar.commit')).not.toBeInTheDocument();
  });

  it('should render toolbar buttons when repository is open', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };
    mockRemotes.current = [{ name: 'origin' }];

    render(<Toolbar />);

    expect(screen.getByTitle('toolbar.commit')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.pull')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.push')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.fetch')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.branch')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.checkout')).toBeInTheDocument();
    expect(screen.getByTitle('toolbar.stash')).toBeInTheDocument();
  });

  it('should show staged count badge when files are staged', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: ['file1.ts', 'file2.ts', 'file3.ts'] };

    render(<Toolbar />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show 99+ when more than 99 files are staged', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: Array(100).fill('file.ts') };

    render(<Toolbar />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should show ahead count on push button', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };
    mockBranches.current = [{ isHead: true, ahead: 5, behind: 0 }];
    mockRemotes.current = [{ name: 'origin' }];

    render(<Toolbar />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show behind count on pull button', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };
    mockBranches.current = [{ isHead: true, ahead: 0, behind: 3 }];
    mockRemotes.current = [{ name: 'origin' }];

    render(<Toolbar />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should disable remote buttons when no remotes', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };
    mockRemotes.current = [];

    render(<Toolbar />);

    expect(screen.getByTitle('toolbar.pull')).toBeDisabled();
    expect(screen.getByTitle('toolbar.push')).toBeDisabled();
    expect(screen.getByTitle('toolbar.fetch')).toBeDisabled();
  });

  it('should disable buttons when repository is unborn', () => {
    mockRepository.current = { path: '/test', currentBranch: null, isUnborn: true };
    mockStatus.current = { staged: [] };
    mockRemotes.current = [{ name: 'origin' }];

    render(<Toolbar />);

    expect(screen.getByTitle('toolbar.pull')).toBeDisabled();
    expect(screen.getByTitle('toolbar.push')).toBeDisabled();
    expect(screen.getByTitle('toolbar.branch')).toBeDisabled();
    expect(screen.getByTitle('toolbar.checkout')).toBeDisabled();
    expect(screen.getByTitle('toolbar.stash')).toBeDisabled();
  });

  it('should call setCurrentView when commit button is clicked', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };

    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('toolbar.commit'));
    expect(mockSetCurrentView).toHaveBeenCalledWith('file-status');
  });

  it('should open pull dialog when pull button is clicked', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };
    mockRemotes.current = [{ name: 'origin' }];

    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('toolbar.pull'));
    expect(mockOpenPullDialog).toHaveBeenCalled();
  });

  it('should open push dialog when push button is clicked', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };
    mockRemotes.current = [{ name: 'origin' }];

    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('toolbar.push'));
    expect(mockOpenPushDialog).toHaveBeenCalled();
  });

  it('should open fetch dialog when fetch button is clicked', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };
    mockRemotes.current = [{ name: 'origin' }];

    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('toolbar.fetch'));
    expect(mockOpenFetchDialog).toHaveBeenCalled();
  });

  it('should open create branch dialog when branch button is clicked', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };

    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('toolbar.branch'));
    expect(mockOpenCreateBranchDialog).toHaveBeenCalled();
  });

  it('should open checkout dialog when checkout button is clicked', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };

    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('toolbar.checkout'));
    expect(mockOpenCheckoutBranchDialog).toHaveBeenCalled();
  });

  it('should open stash dialog when stash button is clicked', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };

    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('toolbar.stash'));
    expect(mockOpenStashDialog).toHaveBeenCalled();
  });

  it('should open repository settings dialog when settings button is clicked', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main', isUnborn: false };
    mockStatus.current = { staged: [] };

    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('toolbar.settings'));
    expect(mockOpenRepositorySettingsDialog).toHaveBeenCalled();
  });
});
