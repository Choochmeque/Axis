import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOperation } from './useOperation';

const mockStartOperation = vi.fn().mockReturnValue('op-123');
const mockUpdateOperation = vi.fn();
const mockCompleteOperation = vi.fn();

vi.mock('@/store/operationStore', () => ({
  useOperationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      startOperation: mockStartOperation,
      updateOperation: mockUpdateOperation,
      completeOperation: mockCompleteOperation,
    }),
}));

describe('useOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return operation functions', () => {
    const { result } = renderHook(() => useOperation());

    expect(result.current.trackOperation).toBeInstanceOf(Function);
    expect(result.current.startOperation).toBeInstanceOf(Function);
    expect(result.current.updateOperation).toBeInstanceOf(Function);
    expect(result.current.completeOperation).toBeInstanceOf(Function);
  });

  describe('trackOperation', () => {
    it('should start and complete operation on success', async () => {
      const { result } = renderHook(() => useOperation());

      const asyncFn = vi.fn().mockResolvedValue('result');

      let returnValue: string | undefined;
      await act(async () => {
        returnValue = await result.current.trackOperation({ name: 'Test Operation' }, asyncFn);
      });

      expect(mockStartOperation).toHaveBeenCalledWith('Test Operation', {
        id: undefined,
        description: undefined,
        category: undefined,
      });
      expect(asyncFn).toHaveBeenCalled();
      expect(mockCompleteOperation).toHaveBeenCalledWith('op-123');
      expect(returnValue).toBe('result');
    });

    it('should complete operation even on error', async () => {
      const { result } = renderHook(() => useOperation());

      const asyncFn = vi.fn().mockRejectedValue(new Error('Failed'));

      await act(async () => {
        await expect(
          result.current.trackOperation({ name: 'Failing Operation' }, asyncFn)
        ).rejects.toThrow('Failed');
      });

      expect(mockStartOperation).toHaveBeenCalled();
      expect(mockCompleteOperation).toHaveBeenCalledWith('op-123');
    });

    it('should pass options to startOperation', async () => {
      const { result } = renderHook(() => useOperation());

      const asyncFn = vi.fn().mockResolvedValue(null);

      await act(async () => {
        await result.current.trackOperation(
          {
            name: 'Test',
            description: 'Description',
            category: 'git',
            id: 'custom-id',
          },
          asyncFn
        );
      });

      expect(mockStartOperation).toHaveBeenCalledWith('Test', {
        id: 'custom-id',
        description: 'Description',
        category: 'git',
      });
    });
  });

  describe('startOperation', () => {
    it('should call store startOperation', () => {
      const { result } = renderHook(() => useOperation());

      act(() => {
        result.current.startOperation('Manual Operation');
      });

      expect(mockStartOperation).toHaveBeenCalledWith('Manual Operation', undefined);
    });

    it('should pass options to startOperation', () => {
      const { result } = renderHook(() => useOperation());

      act(() => {
        result.current.startOperation('Manual Operation', {
          description: 'Desc',
          category: 'network',
          id: 'op-id',
        });
      });

      expect(mockStartOperation).toHaveBeenCalledWith('Manual Operation', {
        description: 'Desc',
        category: 'network',
        id: 'op-id',
      });
    });
  });

  describe('updateOperation', () => {
    it('should expose updateOperation from store', () => {
      const { result } = renderHook(() => useOperation());

      expect(result.current.updateOperation).toBe(mockUpdateOperation);
    });
  });

  describe('completeOperation', () => {
    it('should expose completeOperation from store', () => {
      const { result } = renderHook(() => useOperation());

      expect(result.current.completeOperation).toBe(mockCompleteOperation);
    });
  });
});
