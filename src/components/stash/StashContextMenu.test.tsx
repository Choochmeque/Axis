import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StashContextMenu } from './StashContextMenu';
import type { StashEntry } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      applyStash: vi.fn(),
      popStash: vi.fn(),
      loadStashes: vi.fn(),
      clearStashSelection: vi.fn(),
      refreshRepository: vi.fn(),
    };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  },
}));

vi.mock('@/services/api', () => ({
  stashApi: {
    drop: vi.fn(),
    branch: vi.fn(),
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock('@/components/custom-actions', () => ({
  CustomActionsMenuSection: () => null,
}));

describe('StashContextMenu', () => {
  const mockStash: StashEntry = {
    index: 0,
    message: 'WIP: Test stash',
    branchName: 'main',
    commitOid: 'abc123',
    timestamp: new Date().toISOString(),
  };

  const defaultProps = {
    stash: mockStash,
    children: <button>Trigger</button>,
  };

  it('should render trigger element', () => {
    render(<StashContextMenu {...defaultProps} />);

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should render with stash data', () => {
    render(
      <StashContextMenu stash={mockStash}>
        <span>Stash Item</span>
      </StashContextMenu>
    );

    expect(screen.getByText('Stash Item')).toBeInTheDocument();
  });

  it('should render with different stash index', () => {
    const anotherStash: StashEntry = {
      ...mockStash,
      index: 2,
      message: 'Another stash',
    };

    render(
      <StashContextMenu stash={anotherStash}>
        <div>Second Stash</div>
      </StashContextMenu>
    );

    expect(screen.getByText('Second Stash')).toBeInTheDocument();
  });
});
