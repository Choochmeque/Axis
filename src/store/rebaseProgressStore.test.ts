import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RebaseProgress, RebaseResult } from '@/types';
import { useRebaseProgressStore } from './rebaseProgressStore';

vi.mock('@/services/api', () => ({
  rebaseApi: {
    getProgress: vi.fn(),
    continueWithMessage: vi.fn(),
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

import { rebaseApi } from '@/services/api';

const mockProgress: RebaseProgress = {
  currentStep: 3,
  totalSteps: 10,
  headName: 'feature-branch',
  onto: 'abc123def456',
  pausedAction: null,
  stoppedSha: null,
  commitMessage: null,
  isAmendMode: false,
};

describe('rebaseProgressStore', () => {
  beforeEach(() => {
    useRebaseProgressStore.setState({
      progress: null,
      isLoading: false,
      rewordDialogOpen: false,
      editPauseDialogOpen: false,
    });
    vi.clearAllMocks();
  });

  describe('loadProgress', () => {
    it('should load progress successfully', async () => {
      vi.mocked(rebaseApi.getProgress).mockResolvedValue(mockProgress);

      await useRebaseProgressStore.getState().loadProgress();

      const state = useRebaseProgressStore.getState();
      expect(state.progress).toEqual(mockProgress);
      expect(state.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: RebaseProgress | null) => void;
      const pendingPromise = new Promise<RebaseProgress | null>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(rebaseApi.getProgress).mockReturnValue(pendingPromise);

      const loadPromise = useRebaseProgressStore.getState().loadProgress();

      expect(useRebaseProgressStore.getState().isLoading).toBe(true);

      resolvePromise!(mockProgress);
      await loadPromise;

      expect(useRebaseProgressStore.getState().isLoading).toBe(false);
    });

    it('should handle null progress', async () => {
      vi.mocked(rebaseApi.getProgress).mockResolvedValue(null);

      await useRebaseProgressStore.getState().loadProgress();

      const state = useRebaseProgressStore.getState();
      expect(state.progress).toBeNull();
      expect(state.rewordDialogOpen).toBe(false);
      expect(state.editPauseDialogOpen).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(rebaseApi.getProgress).mockRejectedValue(new Error('Network error'));

      await useRebaseProgressStore.getState().loadProgress();

      const state = useRebaseProgressStore.getState();
      expect(state.progress).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should auto-open reword dialog when paused for Reword', async () => {
      const rewordProgress: RebaseProgress = {
        ...mockProgress,
        pausedAction: 'Reword',
        stoppedSha: 'abc123',
        commitMessage: 'original message',
      };
      vi.mocked(rebaseApi.getProgress).mockResolvedValue(rewordProgress);

      await useRebaseProgressStore.getState().loadProgress();

      const state = useRebaseProgressStore.getState();
      expect(state.rewordDialogOpen).toBe(true);
      expect(state.editPauseDialogOpen).toBe(false);
    });

    it('should auto-open edit pause dialog when paused for Edit', async () => {
      const editProgress: RebaseProgress = {
        ...mockProgress,
        pausedAction: 'Edit',
        stoppedSha: 'abc123',
        isAmendMode: true,
      };
      vi.mocked(rebaseApi.getProgress).mockResolvedValue(editProgress);

      await useRebaseProgressStore.getState().loadProgress();

      const state = useRebaseProgressStore.getState();
      expect(state.editPauseDialogOpen).toBe(true);
      expect(state.rewordDialogOpen).toBe(false);
    });

    it('should not open any dialog when no paused action', async () => {
      vi.mocked(rebaseApi.getProgress).mockResolvedValue(mockProgress);

      await useRebaseProgressStore.getState().loadProgress();

      const state = useRebaseProgressStore.getState();
      expect(state.rewordDialogOpen).toBe(false);
      expect(state.editPauseDialogOpen).toBe(false);
    });
  });

  describe('clearProgress', () => {
    it('should reset all state to initial values', () => {
      useRebaseProgressStore.setState({
        progress: mockProgress,
        isLoading: true,
        rewordDialogOpen: true,
        editPauseDialogOpen: true,
      });

      useRebaseProgressStore.getState().clearProgress();

      const state = useRebaseProgressStore.getState();
      expect(state.progress).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.rewordDialogOpen).toBe(false);
      expect(state.editPauseDialogOpen).toBe(false);
    });
  });

  describe('dialog controls', () => {
    it('should open and close reword dialog', () => {
      useRebaseProgressStore.getState().openRewordDialog();
      expect(useRebaseProgressStore.getState().rewordDialogOpen).toBe(true);

      useRebaseProgressStore.getState().closeRewordDialog();
      expect(useRebaseProgressStore.getState().rewordDialogOpen).toBe(false);
    });

    it('should open and close edit pause dialog', () => {
      useRebaseProgressStore.getState().openEditPauseDialog();
      expect(useRebaseProgressStore.getState().editPauseDialogOpen).toBe(true);

      useRebaseProgressStore.getState().closeEditPauseDialog();
      expect(useRebaseProgressStore.getState().editPauseDialogOpen).toBe(false);
    });
  });

  describe('continueWithMessage', () => {
    it('should return true on success', async () => {
      const successResult: RebaseResult = {
        success: true,
        commitsRebased: 1,
        currentCommit: null,
        totalCommits: null,
        conflicts: [],
        message: 'Rebase continued.',
      };
      vi.mocked(rebaseApi.continueWithMessage).mockResolvedValue(successResult);

      const result = await useRebaseProgressStore.getState().continueWithMessage('new message');

      expect(result).toBe(true);
      expect(rebaseApi.continueWithMessage).toHaveBeenCalledWith('new message');
      expect(useRebaseProgressStore.getState().isLoading).toBe(false);
    });

    it('should return false on conflicts', async () => {
      const conflictResult: RebaseResult = {
        success: false,
        commitsRebased: 0,
        currentCommit: null,
        totalCommits: null,
        conflicts: [{ path: 'file.rs', conflictType: 'Content', isResolved: false }],
        message: 'Conflicts detected.',
      };
      vi.mocked(rebaseApi.continueWithMessage).mockResolvedValue(conflictResult);

      const result = await useRebaseProgressStore.getState().continueWithMessage('new message');

      expect(result).toBe(false);
    });

    it('should return false on non-conflict failure', async () => {
      const failResult: RebaseResult = {
        success: false,
        commitsRebased: 0,
        currentCommit: null,
        totalCommits: null,
        conflicts: [],
        message: 'Rebase failed.',
      };
      vi.mocked(rebaseApi.continueWithMessage).mockResolvedValue(failResult);

      const result = await useRebaseProgressStore.getState().continueWithMessage('new message');

      expect(result).toBe(false);
    });

    it('should handle API error', async () => {
      vi.mocked(rebaseApi.continueWithMessage).mockRejectedValue(new Error('API error'));

      const result = await useRebaseProgressStore.getState().continueWithMessage('new message');

      expect(result).toBe(false);
      expect(useRebaseProgressStore.getState().isLoading).toBe(false);
    });

    it('should set loading state during operation', async () => {
      let resolvePromise: (value: RebaseResult) => void;
      const pendingPromise = new Promise<RebaseResult>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(rebaseApi.continueWithMessage).mockReturnValue(pendingPromise);

      const continuePromise = useRebaseProgressStore.getState().continueWithMessage('msg');

      expect(useRebaseProgressStore.getState().isLoading).toBe(true);

      resolvePromise!({
        success: true,
        commitsRebased: 1,
        currentCommit: null,
        totalCommits: null,
        conflicts: [],
        message: 'ok',
      });
      await continuePromise;

      expect(useRebaseProgressStore.getState().isLoading).toBe(false);
    });
  });
});
