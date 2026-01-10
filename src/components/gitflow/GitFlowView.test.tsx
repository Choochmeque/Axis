import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitFlowView } from './GitFlowView';
import { gitflowApi } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  gitflowApi: {
    isInitialized: vi.fn(),
    getConfig: vi.fn(),
    init: vi.fn(),
    feature: {
      start: vi.fn(),
      finish: vi.fn(),
      publish: vi.fn(),
      list: vi.fn(),
    },
    release: {
      start: vi.fn(),
      finish: vi.fn(),
      publish: vi.fn(),
      list: vi.fn(),
    },
    hotfix: {
      start: vi.fn(),
      finish: vi.fn(),
      publish: vi.fn(),
      list: vi.fn(),
    },
  },
}));

describe('GitFlowView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show not initialized state', async () => {
    vi.mocked(gitflowApi.isInitialized).mockResolvedValue(false);

    render(<GitFlowView />);

    await waitFor(() => {
      expect(screen.getByText('Git Flow is not initialized in this repository.')).toBeInTheDocument();
    });
  });

  it('should show initialized state with branches', async () => {
    vi.mocked(gitflowApi.isInitialized).mockResolvedValue(true);
    vi.mocked(gitflowApi.getConfig).mockResolvedValue({
      master: 'main',
      develop: 'develop',
      feature_prefix: 'feature/',
      release_prefix: 'release/',
      hotfix_prefix: 'hotfix/',
      support_prefix: 'support/',
      version_tag_prefix: '',
    });
    vi.mocked(gitflowApi.feature.list).mockResolvedValue(['login', 'dashboard']);
    vi.mocked(gitflowApi.release.list).mockResolvedValue(['1.0.0']);
    vi.mocked(gitflowApi.hotfix.list).mockResolvedValue([]);

    render(<GitFlowView />);

    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
      expect(screen.getByText('Releases')).toBeInTheDocument();
      expect(screen.getByText('Hotfixes')).toBeInTheDocument();
    });

    // Check feature count
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show initialize dialog when clicking initialize button', async () => {
    vi.mocked(gitflowApi.isInitialized).mockResolvedValue(false);

    render(<GitFlowView />);

    await waitFor(() => {
      expect(screen.getByText('Git Flow is not initialized in this repository.')).toBeInTheDocument();
    });

    // Get the primary button with text (not the icon button)
    const initButtons = screen.getAllByRole('button', { name: /Initialize Git Flow/i });
    const primaryButton = initButtons.find(btn => btn.classList.contains('btn-primary'));
    fireEvent.click(primaryButton!);

    expect(screen.getByText('Production branch')).toBeInTheDocument();
    expect(screen.getByText('Development branch')).toBeInTheDocument();
  });

  it('should initialize git-flow', async () => {
    vi.mocked(gitflowApi.isInitialized).mockResolvedValue(false);
    vi.mocked(gitflowApi.init).mockResolvedValue({
      success: true,
      message: 'Git-flow initialized',
      branch: 'develop',
    });

    render(<GitFlowView />);

    await waitFor(() => {
      expect(screen.getByText('Git Flow is not initialized in this repository.')).toBeInTheDocument();
    });

    // Open dialog - get the primary button with text (not the icon button)
    const initButtons = screen.getAllByRole('button', { name: /Initialize Git Flow/i });
    const primaryButton = initButtons.find(btn => btn.classList.contains('btn-primary'));
    fireEvent.click(primaryButton!);

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Initialize' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(gitflowApi.init).toHaveBeenCalledWith({
        master: 'main',
        develop: 'develop',
      });
    });
  });

  it('should start a feature branch', async () => {
    vi.mocked(gitflowApi.isInitialized).mockResolvedValue(true);
    vi.mocked(gitflowApi.getConfig).mockResolvedValue({
      master: 'main',
      develop: 'develop',
      feature_prefix: 'feature/',
      release_prefix: 'release/',
      hotfix_prefix: 'hotfix/',
      support_prefix: 'support/',
      version_tag_prefix: '',
    });
    vi.mocked(gitflowApi.feature.list).mockResolvedValue([]);
    vi.mocked(gitflowApi.release.list).mockResolvedValue([]);
    vi.mocked(gitflowApi.hotfix.list).mockResolvedValue([]);
    vi.mocked(gitflowApi.feature.start).mockResolvedValue({
      success: true,
      message: 'Started feature',
      branch: 'feature/new-feature',
    });

    render(<GitFlowView />);

    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
    });

    // Click add feature button
    const addButtons = screen.getAllByTitle('Start new feature');
    fireEvent.click(addButtons[0]);

    // Fill in name
    const nameInput = screen.getByPlaceholderText('my-feature');
    fireEvent.change(nameInput, { target: { value: 'new-feature' } });

    // Submit
    const startButton = screen.getByRole('button', { name: /Start Feature/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(gitflowApi.feature.start).toHaveBeenCalledWith('new-feature');
    });
  });

  it('should show error message on failure', async () => {
    vi.mocked(gitflowApi.isInitialized).mockRejectedValue(new Error('Network error'));

    render(<GitFlowView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load git-flow state')).toBeInTheDocument();
    });
  });
});
