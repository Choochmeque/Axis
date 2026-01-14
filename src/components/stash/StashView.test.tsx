import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StashView } from './StashView';
import { stashApi } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  stashApi: {
    list: vi.fn(),
    save: vi.fn(),
    apply: vi.fn(),
    pop: vi.fn(),
    drop: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    branch: vi.fn(),
  },
}));

describe('StashView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no stashes', async () => {
    vi.mocked(stashApi.list).mockResolvedValue([]);

    render(<StashView />);

    await waitFor(() => {
      expect(screen.getByText('No stashes')).toBeInTheDocument();
    });
  });

  it('should render stash list', async () => {
    const mockStashes = [
      {
        index: 0n,
        stashRef: 'stash@{0}',
        message: 'WIP on main: Test stash',
        commitOid: 'abc123def456',
        shortOid: 'abc123d',
        branch: 'main',
        author: 'Test User',
        timestamp: '2024-01-01T00:00:00Z',
      },
      {
        index: 1n,
        stashRef: 'stash@{1}',
        message: 'WIP on feature: Another stash',
        commitOid: 'def456abc789',
        shortOid: 'def456a',
        branch: 'feature',
        author: 'Test User',
        timestamp: '2024-01-02T00:00:00Z',
      },
    ];

    vi.mocked(stashApi.list).mockResolvedValue(mockStashes);

    render(<StashView />);

    await waitFor(() => {
      expect(screen.getByText('stash@{0}')).toBeInTheDocument();
      expect(screen.getByText('stash@{1}')).toBeInTheDocument();
    });
  });

  it('should display stash count in header', async () => {
    const mockStashes = [
      {
        index: 0n,
        stashRef: 'stash@{0}',
        message: 'Test stash',
        commitOid: 'abc123',
        shortOid: 'abc123',
        branch: 'main',
        author: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
      },
    ];

    vi.mocked(stashApi.list).mockResolvedValue(mockStashes);

    render(<StashView />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should show create dialog when plus button clicked', async () => {
    vi.mocked(stashApi.list).mockResolvedValue([]);

    render(<StashView />);

    await waitFor(() => {
      // Dialog should not be visible initially
      expect(screen.queryByPlaceholderText('Stash message...')).not.toBeInTheDocument();
    });

    const addButton = screen.getByTitle('Create stash');
    fireEvent.click(addButton);

    // Dialog should now be visible with the message input
    expect(screen.getByPlaceholderText('Stash message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Stash' })).toBeInTheDocument();
  });

  it('should call save when creating stash', async () => {
    vi.mocked(stashApi.list).mockResolvedValue([]);
    vi.mocked(stashApi.save).mockResolvedValue({
      success: true,
      message: 'Stash created',
      filesAffected: 1n,
      conflicts: [],
    });

    render(<StashView />);

    // Open dialog
    const addButton = screen.getByTitle('Create stash');
    fireEvent.click(addButton);

    // Fill in message
    const messageInput = screen.getByPlaceholderText('Stash message...');
    fireEvent.change(messageInput, { target: { value: 'My test stash' } });

    // Submit
    const createButton = screen.getByRole('button', { name: 'Create Stash' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(stashApi.save).toHaveBeenCalledWith({
        message: 'My test stash',
        includeUntracked: false,
        keepIndex: false,
        includeIgnored: false,
      });
    });
  });

  it('should display error when API fails', async () => {
    vi.mocked(stashApi.list).mockRejectedValue(new Error('API Error'));

    render(<StashView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load stashes')).toBeInTheDocument();
    });
  });
});
