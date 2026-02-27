import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToast } from './useToast';

const mockAddToast = vi.fn().mockReturnValue('toast-id-1');
const mockRemoveToast = vi.fn();
const mockClearAll = vi.fn();

vi.mock('@/store/toastStore', () => ({
  useToastStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        addToast: mockAddToast,
        removeToast: mockRemoveToast,
        clearAll: mockClearAll,
      }),
    {
      getState: () => ({
        addToast: mockAddToast,
        removeToast: mockRemoveToast,
        clearAll: mockClearAll,
      }),
    }
  ),
}));

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useToast hook', () => {
    it('should return toast helper functions', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.success).toBeInstanceOf(Function);
      expect(result.current.error).toBeInstanceOf(Function);
      expect(result.current.warning).toBeInstanceOf(Function);
      expect(result.current.info).toBeInstanceOf(Function);
      expect(result.current.dismiss).toBeInstanceOf(Function);
      expect(result.current.dismissAll).toBeInstanceOf(Function);
    });

    it('should call addToast with success type and 3000ms duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Success!', 'Description');
      });

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Success!',
        description: 'Description',
        duration: 3000,
      });
    });

    it('should call addToast with error type and 6000ms duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Error!', 'Description');
      });

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error!',
        description: 'Description',
        duration: 6000,
      });
    });

    it('should call addToast with warning type and 5000ms duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.warning('Warning!', 'Description');
      });

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Warning!',
        description: 'Description',
        duration: 5000,
      });
    });

    it('should call addToast with info type and 4000ms duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.info('Info!', 'Description');
      });

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        title: 'Info!',
        description: 'Description',
        duration: 4000,
      });
    });

    it('should call removeToast when dismiss is called', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.dismiss('toast-123');
      });

      expect(mockRemoveToast).toHaveBeenCalledWith('toast-123');
    });

    it('should call clearAll when dismissAll is called', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.dismissAll();
      });

      expect(mockClearAll).toHaveBeenCalled();
    });

    it('should return toast id from success', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string | undefined;
      act(() => {
        toastId = result.current.success('Test');
      });

      expect(toastId).toBe('toast-id-1');
    });
  });

  describe('toast standalone object', () => {
    it('should create success toast with 3000ms duration', () => {
      toast.success('Success!', 'Description');

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Success!',
        description: 'Description',
        duration: 3000,
      });
    });

    it('should create error toast with 6000ms duration', () => {
      toast.error('Error!', 'Description');

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error!',
        description: 'Description',
        duration: 6000,
      });
    });

    it('should create warning toast with 5000ms duration', () => {
      toast.warning('Warning!');

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Warning!',
        description: undefined,
        duration: 5000,
      });
    });

    it('should create info toast with 4000ms duration', () => {
      toast.info('Info!');

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        title: 'Info!',
        description: undefined,
        duration: 4000,
      });
    });

    it('should dismiss toast by id', () => {
      toast.dismiss('toast-456');

      expect(mockRemoveToast).toHaveBeenCalledWith('toast-456');
    });

    it('should dismiss all toasts', () => {
      toast.dismissAll();

      expect(mockClearAll).toHaveBeenCalled();
    });
  });
});
