import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock modules before importing the component
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === 'layout.statusBar.changes') return `${opts?.count} changes`;
      return key;
    },
  }),
}));

vi.mock('@/components/ui/operations-indicator', () => ({
  OperationsIndicator: () => <div data-testid="operations-indicator">Operations</div>,
}));

vi.mock('@/components/ui/toast', () => ({
  ToastHistoryDropdown: () => <div data-testid="toast-history">Toast History</div>,
}));

const mockRepository = {
  current: null as { path: string; currentBranch: string | null } | null,
};
const mockStatus = {
  current: null as { staged: string[]; unstaged: string[]; untracked: string[] } | null,
};
let mockIsLoading = false;

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    repository: mockRepository.current,
    status: mockStatus.current,
    isLoading: mockIsLoading,
  }),
}));

import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  beforeEach(() => {
    mockRepository.current = null;
    mockStatus.current = null;
    mockIsLoading = false;
  });

  it('should render without repository', () => {
    render(<StatusBar />);

    expect(screen.getByTestId('operations-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('toast-history')).toBeInTheDocument();
    // Should not show branch info
    expect(screen.queryByText('main')).not.toBeInTheDocument();
  });

  it('should show branch name when repository is open', () => {
    mockRepository.current = { path: '/test', currentBranch: 'feature-branch' };
    mockStatus.current = { staged: [], unstaged: [], untracked: [] };

    render(<StatusBar />);

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
  });

  it('should show detached state when no current branch', () => {
    mockRepository.current = { path: '/test', currentBranch: null };
    mockStatus.current = { staged: [], unstaged: [], untracked: [] };

    render(<StatusBar />);

    expect(screen.getByText('layout.statusBar.detached')).toBeInTheDocument();
  });

  it('should show clean status when no changes', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main' };
    mockStatus.current = { staged: [], unstaged: [], untracked: [] };

    render(<StatusBar />);

    expect(screen.getByText('layout.statusBar.clean')).toBeInTheDocument();
  });

  it('should show changes count when there are staged files', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main' };
    mockStatus.current = { staged: ['file1.ts', 'file2.ts'], unstaged: [], untracked: [] };

    render(<StatusBar />);

    expect(screen.getByText('2 changes')).toBeInTheDocument();
  });

  it('should show changes count when there are unstaged files', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main' };
    mockStatus.current = { staged: [], unstaged: ['file1.ts'], untracked: [] };

    render(<StatusBar />);

    expect(screen.getByText('1 changes')).toBeInTheDocument();
  });

  it('should show changes count when there are untracked files', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main' };
    mockStatus.current = { staged: [], unstaged: [], untracked: ['new-file.ts'] };

    render(<StatusBar />);

    expect(screen.getByText('1 changes')).toBeInTheDocument();
  });

  it('should show combined changes count', () => {
    mockRepository.current = { path: '/test', currentBranch: 'main' };
    mockStatus.current = {
      staged: ['file1.ts'],
      unstaged: ['file2.ts', 'file3.ts'],
      untracked: ['new.ts'],
    };

    render(<StatusBar />);

    expect(screen.getByText('4 changes')).toBeInTheDocument();
  });

  it('should show loading indicator when loading', () => {
    mockIsLoading = true;

    render(<StatusBar />);

    expect(screen.getByText('layout.statusBar.loading')).toBeInTheDocument();
  });

  it('should not show loading indicator when not loading', () => {
    mockIsLoading = false;

    render(<StatusBar />);

    expect(screen.queryByText('layout.statusBar.loading')).not.toBeInTheDocument();
  });
});
