import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubmoduleView } from './SubmoduleView';
import { submoduleApi } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  submoduleApi: {
    list: vi.fn(),
    add: vi.fn(),
    init: vi.fn(),
    update: vi.fn(),
    sync: vi.fn(),
    deinit: vi.fn(),
    remove: vi.fn(),
    summary: vi.fn(),
  },
}));

describe('SubmoduleView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no submodules', async () => {
    vi.mocked(submoduleApi.list).mockResolvedValue([]);

    render(<SubmoduleView />);

    await waitFor(() => {
      expect(screen.getByText('No submodules')).toBeInTheDocument();
    });
  });

  it('should render submodule list', async () => {
    const mockSubmodules = [
      {
        name: 'lib/common',
        path: 'lib/common',
        url: 'https://github.com/user/common.git',
        headOid: 'abc123def456',
        shortOid: 'abc123d',
        indexedOid: null,
        branch: 'main',
        status: 'Current' as const,
      },
      {
        name: 'lib/utils',
        path: 'lib/utils',
        url: 'https://github.com/user/utils.git',
        headOid: 'def456abc789',
        shortOid: 'def456a',
        indexedOid: null,
        branch: 'main',
        status: 'Modified' as const,
      },
    ];

    vi.mocked(submoduleApi.list).mockResolvedValue(mockSubmodules);

    render(<SubmoduleView />);

    await waitFor(() => {
      expect(screen.getByText('lib/common')).toBeInTheDocument();
      expect(screen.getByText('lib/utils')).toBeInTheDocument();
    });
  });

  it('should display submodule count in header', async () => {
    const mockSubmodules = [
      {
        name: 'lib/common',
        path: 'lib/common',
        url: 'https://github.com/user/common.git',
        headOid: 'abc123',
        shortOid: 'abc123',
        indexedOid: null,
        branch: 'main',
        status: 'Current' as const,
      },
    ];

    vi.mocked(submoduleApi.list).mockResolvedValue(mockSubmodules);

    render(<SubmoduleView />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should show add dialog when plus button clicked', async () => {
    vi.mocked(submoduleApi.list).mockResolvedValue([]);

    render(<SubmoduleView />);

    await waitFor(() => {
      // Dialog should not be visible initially (check for URL input placeholder)
      expect(
        screen.queryByPlaceholderText('https://github.com/user/repo.git')
      ).not.toBeInTheDocument();
    });

    const addButton = screen.getByTitle('Add submodule');
    fireEvent.click(addButton);

    // Dialog should now be visible
    expect(screen.getByPlaceholderText('https://github.com/user/repo.git')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Submodule' })).toBeInTheDocument();
  });

  it('should show status indicator for current submodule', async () => {
    const mockSubmodules = [
      {
        name: 'lib/common',
        path: 'lib/common',
        url: 'https://github.com/user/common.git',
        headOid: 'abc123',
        shortOid: 'abc123',
        indexedOid: null,
        branch: 'main',
        status: 'Current' as const,
      },
    ];

    vi.mocked(submoduleApi.list).mockResolvedValue(mockSubmodules);

    render(<SubmoduleView />);

    await waitFor(() => {
      expect(screen.getByText('Up to date')).toBeInTheDocument();
    });
  });

  it('should show status indicator for modified submodule', async () => {
    const mockSubmodules = [
      {
        name: 'lib/common',
        path: 'lib/common',
        url: 'https://github.com/user/common.git',
        headOid: 'abc123',
        shortOid: 'abc123',
        indexedOid: null,
        branch: 'main',
        status: 'Modified' as const,
      },
    ];

    vi.mocked(submoduleApi.list).mockResolvedValue(mockSubmodules);

    render(<SubmoduleView />);

    await waitFor(() => {
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });
  });

  it('should show initialize button for uninitialized submodule', async () => {
    const mockSubmodules = [
      {
        name: 'lib/common',
        path: 'lib/common',
        url: 'https://github.com/user/common.git',
        headOid: null,
        shortOid: null,
        indexedOid: null,
        branch: null,
        status: 'Uninitialized' as const,
      },
    ];

    vi.mocked(submoduleApi.list).mockResolvedValue(mockSubmodules);

    render(<SubmoduleView />);

    await waitFor(() => {
      expect(screen.getByText('lib/common')).toBeInTheDocument();
    });

    // Select the submodule
    fireEvent.click(screen.getByText('lib/common'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Initialize' })).toBeInTheDocument();
    });
  });

  it('should call add when adding submodule', async () => {
    vi.mocked(submoduleApi.list).mockResolvedValue([]);
    vi.mocked(submoduleApi.add).mockResolvedValue({
      success: true,
      message: 'Submodule added',
      submodules: ['lib/new'],
    });

    render(<SubmoduleView />);

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByText('No submodules')).toBeInTheDocument();
    });

    // Open dialog
    const addButton = screen.getByTitle('Add submodule');
    fireEvent.click(addButton);

    // Fill in fields
    const urlInput = screen.getByPlaceholderText('https://github.com/user/repo.git');
    const pathInput = screen.getByPlaceholderText('lib/submodule');

    fireEvent.change(urlInput, { target: { value: 'https://github.com/user/new.git' } });
    fireEvent.change(pathInput, { target: { value: 'lib/new' } });

    // Submit - button should not be in loading state since we waited
    const submitButton = screen.getByRole('button', { name: 'Add Submodule' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submoduleApi.add).toHaveBeenCalledWith({
        url: 'https://github.com/user/new.git',
        path: 'lib/new',
        branch: null,
        name: null,
        depth: null,
      });
    });
  });

  it('should display error when API fails', async () => {
    vi.mocked(submoduleApi.list).mockRejectedValue(new Error('API Error'));

    render(<SubmoduleView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load submodules')).toBeInTheDocument();
    });
  });

  it('should call update when update button clicked', async () => {
    const mockSubmodules = [
      {
        name: 'lib/common',
        path: 'lib/common',
        url: 'https://github.com/user/common.git',
        headOid: 'abc123',
        shortOid: 'abc123',
        indexedOid: null,
        branch: 'main',
        status: 'Current' as const,
      },
    ];

    vi.mocked(submoduleApi.list).mockResolvedValue(mockSubmodules);
    vi.mocked(submoduleApi.update).mockResolvedValue({
      success: true,
      message: 'Submodules updated',
      submodules: ['lib/common'],
    });

    render(<SubmoduleView />);

    await waitFor(() => {
      expect(screen.getByText('lib/common')).toBeInTheDocument();
    });

    // Select the submodule
    fireEvent.click(screen.getByText('lib/common'));

    // Click update button
    const updateButton = screen.getByTitle('Update all submodules');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(submoduleApi.update).toHaveBeenCalledWith({
        paths: [],
        init: true,
        recursive: true,
        force: false,
        remote: false,
        rebase: false,
        merge: false,
      });
    });
  });
});
