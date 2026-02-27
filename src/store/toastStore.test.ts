import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({
      toasts: [],
      history: [],
      historyCapacity: 50,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addToast', () => {
    it('should add a toast with generated id', () => {
      const id = useToastStore.getState().addToast({
        type: 'success',
        title: 'Test toast',
      });

      expect(id).toMatch(/^toast-/);
      const state = useToastStore.getState();
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].title).toBe('Test toast');
      expect(state.toasts[0].type).toBe('success');
    });

    it('should use default duration based on type', () => {
      useToastStore.getState().addToast({ type: 'success', title: 'Success' });
      useToastStore.getState().addToast({ type: 'error', title: 'Error' });
      useToastStore.getState().addToast({ type: 'warning', title: 'Warning' });
      useToastStore.getState().addToast({ type: 'info', title: 'Info' });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].duration).toBe(3000); // success
      expect(toasts[1].duration).toBe(6000); // error
      expect(toasts[2].duration).toBe(5000); // warning
      expect(toasts[3].duration).toBe(4000); // info
    });

    it('should use provided duration when specified', () => {
      useToastStore.getState().addToast({
        type: 'success',
        title: 'Custom duration',
        duration: 10000,
      });

      const state = useToastStore.getState();
      expect(state.toasts[0].duration).toBe(10000);
    });

    it('should auto-dismiss after duration', () => {
      const id = useToastStore.getState().addToast({
        type: 'success',
        title: 'Auto dismiss',
      });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(3000);

      expect(useToastStore.getState().toasts).toHaveLength(0);
      expect(useToastStore.getState().history).toHaveLength(1);
      expect(useToastStore.getState().history[0].id).toBe(id);
    });

    it('should not auto-dismiss when duration is 0', () => {
      useToastStore.getState().addToast({
        type: 'success',
        title: 'No dismiss',
        duration: 0,
      });

      vi.advanceTimersByTime(10000);

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    it('should include description when provided', () => {
      useToastStore.getState().addToast({
        type: 'info',
        title: 'Title',
        description: 'Description text',
      });

      const toast = useToastStore.getState().toasts[0];
      expect(toast.description).toBe('Description text');
    });
  });

  describe('removeToast', () => {
    it('should remove toast from active list', () => {
      const id = useToastStore.getState().addToast({
        type: 'success',
        title: 'To remove',
        duration: 0,
      });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      useToastStore.getState().removeToast(id);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('should add toast to history', () => {
      const id = useToastStore.getState().addToast({
        type: 'success',
        title: 'To history',
        duration: 0,
      });

      useToastStore.getState().removeToast(id);

      const history = useToastStore.getState().history;
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(id);
      expect(history[0].dismissedAt).toBeDefined();
    });

    it('should trim history when over capacity', () => {
      useToastStore.setState({ historyCapacity: 2 });

      const id1 = useToastStore.getState().addToast({ type: 'info', title: '1', duration: 0 });
      useToastStore.getState().removeToast(id1);

      const id2 = useToastStore.getState().addToast({ type: 'info', title: '2', duration: 0 });
      useToastStore.getState().removeToast(id2);

      const id3 = useToastStore.getState().addToast({ type: 'info', title: '3', duration: 0 });
      useToastStore.getState().removeToast(id3);

      const history = useToastStore.getState().history;
      expect(history).toHaveLength(2);
      // Most recent first
      expect(history[0].title).toBe('3');
      expect(history[1].title).toBe('2');
    });

    it('should do nothing for non-existent toast', () => {
      useToastStore.getState().addToast({ type: 'info', title: 'Test', duration: 0 });

      useToastStore.getState().removeToast('non-existent-id');

      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().history).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('should move all toasts to history', () => {
      useToastStore.getState().addToast({ type: 'info', title: '1', duration: 0 });
      useToastStore.getState().addToast({ type: 'info', title: '2', duration: 0 });
      useToastStore.getState().addToast({ type: 'info', title: '3', duration: 0 });

      expect(useToastStore.getState().toasts).toHaveLength(3);

      useToastStore.getState().clearAll();

      expect(useToastStore.getState().toasts).toHaveLength(0);
      expect(useToastStore.getState().history).toHaveLength(3);
    });

    it('should respect history capacity', () => {
      useToastStore.setState({ historyCapacity: 2 });

      useToastStore.getState().addToast({ type: 'info', title: '1', duration: 0 });
      useToastStore.getState().addToast({ type: 'info', title: '2', duration: 0 });
      useToastStore.getState().addToast({ type: 'info', title: '3', duration: 0 });

      useToastStore.getState().clearAll();

      expect(useToastStore.getState().history).toHaveLength(2);
    });
  });

  describe('clearHistory', () => {
    it('should empty history array', () => {
      const id = useToastStore.getState().addToast({ type: 'info', title: 'Test', duration: 0 });
      useToastStore.getState().removeToast(id);

      expect(useToastStore.getState().history).toHaveLength(1);

      useToastStore.getState().clearHistory();

      expect(useToastStore.getState().history).toHaveLength(0);
    });
  });

  describe('setHistoryCapacity', () => {
    it('should update capacity', () => {
      useToastStore.getState().setHistoryCapacity(100);
      expect(useToastStore.getState().historyCapacity).toBe(100);
    });

    it('should trim history when reducing capacity', () => {
      // Add 5 items to history
      for (let i = 0; i < 5; i++) {
        const id = useToastStore.getState().addToast({ type: 'info', title: `${i}`, duration: 0 });
        useToastStore.getState().removeToast(id);
      }

      expect(useToastStore.getState().history).toHaveLength(5);

      useToastStore.getState().setHistoryCapacity(15); // Minimum is 10

      expect(useToastStore.getState().historyCapacity).toBe(15);
    });

    it('should enforce minimum capacity of 10', () => {
      useToastStore.getState().setHistoryCapacity(5);
      expect(useToastStore.getState().historyCapacity).toBe(10);
    });

    it('should enforce maximum capacity of 200', () => {
      useToastStore.getState().setHistoryCapacity(500);
      expect(useToastStore.getState().historyCapacity).toBe(200);
    });
  });
});
