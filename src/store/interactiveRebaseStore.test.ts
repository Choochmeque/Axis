import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInteractiveRebaseStore } from './interactiveRebaseStore';
import type { InteractiveRebasePreview, InteractiveRebaseEntry } from '@/types';

vi.mock('@/services/api', () => ({
  rebaseApi: {
    getInteractivePreview: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

import { rebaseApi } from '@/services/api';

describe('interactiveRebaseStore', () => {
  const mockEntry: InteractiveRebaseEntry = {
    action: 'Pick',
    oid: 'abc123',
    shortOid: 'abc123',
    summary: 'Test commit',
    originalIndex: 0,
  };

  // Use type assertion to avoid complex mock object construction
  const mockPreview = {
    preview: {
      commitsToRebase: [],
      mergeBase: {},
      target: { name: 'main', oid: 'abc123', shortOid: 'abc123' },
      targetCommitsAhead: 0,
    },
    entries: [
      mockEntry,
      {
        ...mockEntry,
        oid: 'def456',
        shortOid: 'def456',
        summary: 'Second commit',
        originalIndex: 1,
      },
      {
        ...mockEntry,
        oid: 'ghi789',
        shortOid: 'ghi789',
        summary: 'Third commit',
        originalIndex: 2,
      },
    ],
  } as unknown as InteractiveRebasePreview;

  beforeEach(() => {
    vi.useFakeTimers();
    useInteractiveRebaseStore.setState({
      isOpen: false,
      onto: '',
      preview: null,
      entries: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('open', () => {
    it('should load preview and open dialog', async () => {
      vi.mocked(rebaseApi.getInteractivePreview).mockResolvedValue(mockPreview);

      await useInteractiveRebaseStore.getState().open('main');

      expect(rebaseApi.getInteractivePreview).toHaveBeenCalledWith('main');
      const state = useInteractiveRebaseStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.onto).toBe('main');
      expect(state.preview).toEqual(mockPreview);
      expect(state.entries).toHaveLength(3);
      expect(state.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: InteractiveRebasePreview) => void;
      const pendingPromise = new Promise<InteractiveRebasePreview>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(rebaseApi.getInteractivePreview).mockReturnValue(pendingPromise);

      const openPromise = useInteractiveRebaseStore.getState().open('main');

      const loadingState = useInteractiveRebaseStore.getState();
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.isOpen).toBe(true);

      resolvePromise!(mockPreview);
      await openPromise;

      expect(useInteractiveRebaseStore.getState().isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      vi.mocked(rebaseApi.getInteractivePreview).mockRejectedValue(new Error('Failed to load'));

      await useInteractiveRebaseStore.getState().open('main');

      const state = useInteractiveRebaseStore.getState();
      expect(state.error).toBe('Failed to load');
      expect(state.isLoading).toBe(false);
      expect(state.isOpen).toBe(true); // Dialog stays open to show error
    });
  });

  describe('close', () => {
    it('should close the dialog', () => {
      useInteractiveRebaseStore.setState({
        isOpen: true,
        onto: 'main',
        preview: mockPreview,
        entries: mockPreview.entries,
      });

      useInteractiveRebaseStore.getState().close();

      expect(useInteractiveRebaseStore.getState().isOpen).toBe(false);
    });
  });

  describe('setEntryAction', () => {
    it('should update action for specific entry', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });

      useInteractiveRebaseStore.getState().setEntryAction(1, 'Squash');

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries[0].action).toBe('Pick');
      expect(entries[1].action).toBe('Squash');
      expect(entries[2].action).toBe('Pick');
    });

    it('should not modify if index is out of bounds (negative)', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });

      useInteractiveRebaseStore.getState().setEntryAction(-1, 'Drop');

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries.every((e) => e.action === 'Pick')).toBe(true);
    });

    it('should not modify if index is out of bounds (too large)', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });

      useInteractiveRebaseStore.getState().setEntryAction(10, 'Drop');

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries.every((e) => e.action === 'Pick')).toBe(true);
    });

    it('should handle all rebase actions', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });

      useInteractiveRebaseStore.getState().setEntryAction(0, 'Pick');
      useInteractiveRebaseStore.getState().setEntryAction(1, 'Reword');
      useInteractiveRebaseStore.getState().setEntryAction(2, 'Edit');

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries[0].action).toBe('Pick');
      expect(entries[1].action).toBe('Reword');
      expect(entries[2].action).toBe('Edit');
    });
  });

  describe('moveEntry', () => {
    it('should move entry from one position to another', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });

      useInteractiveRebaseStore.getState().moveEntry(0, 2);

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries[0].oid).toBe('def456');
      expect(entries[1].oid).toBe('ghi789');
      expect(entries[2].oid).toBe('abc123');
    });

    it('should move entry backwards', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });

      useInteractiveRebaseStore.getState().moveEntry(2, 0);

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries[0].oid).toBe('ghi789');
      expect(entries[1].oid).toBe('abc123');
      expect(entries[2].oid).toBe('def456');
    });

    it('should not move if fromIndex is out of bounds', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });
      const originalOrder = mockPreview.entries.map((e) => e.oid);

      useInteractiveRebaseStore.getState().moveEntry(-1, 2);

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries.map((e) => e.oid)).toEqual(originalOrder);
    });

    it('should not move if toIndex is out of bounds', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });
      const originalOrder = mockPreview.entries.map((e) => e.oid);

      useInteractiveRebaseStore.getState().moveEntry(0, 10);

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries.map((e) => e.oid)).toEqual(originalOrder);
    });

    it('should not move if fromIndex equals toIndex', () => {
      useInteractiveRebaseStore.setState({ entries: [...mockPreview.entries] });
      const originalOrder = mockPreview.entries.map((e) => e.oid);

      useInteractiveRebaseStore.getState().moveEntry(1, 1);

      const entries = useInteractiveRebaseStore.getState().entries;
      expect(entries.map((e) => e.oid)).toEqual(originalOrder);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useInteractiveRebaseStore.setState({
        isOpen: true,
        onto: 'main',
        preview: mockPreview,
        entries: mockPreview.entries,
        isLoading: true,
        error: 'Some error',
      });

      useInteractiveRebaseStore.getState().reset();

      const state = useInteractiveRebaseStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.onto).toBe('');
      expect(state.preview).toBeNull();
      expect(state.entries).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
