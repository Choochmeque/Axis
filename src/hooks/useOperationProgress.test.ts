import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Operation } from '@/store/operationStore';
import { ProgressStage } from '@/types';
import { useOperationProgress } from './useOperationProgress';

const mockOperations = new Map<string, Operation>();

vi.mock('@/store/operationStore', () => ({
  useOperationStore: (selector: (state: { operations: Map<string, Operation> }) => unknown) =>
    selector({ operations: mockOperations }),
}));

describe('useOperationProgress', () => {
  beforeEach(() => {
    mockOperations.clear();
  });

  it('should return undefined when no operations exist', () => {
    const { result } = renderHook(() => useOperationProgress('Clone'));

    expect(result.current).toBeUndefined();
  });

  it('should return undefined when no matching operation type exists', () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Fetch',
      startedAt: Date.now(),
      category: 'git',
      operationType: 'Fetch',
      progress: {
        stage: 'Receiving',
        receivedObjects: 10,
        totalObjects: 100,
        receivedBytes: 0,
      },
    });

    const { result } = renderHook(() => useOperationProgress('Clone'));

    expect(result.current).toBeUndefined();
  });

  it('should return operation when matching type with progress exists', () => {
    const operation: Operation = {
      id: 'op-1',
      name: 'Clone',
      startedAt: Date.now(),
      category: 'git',
      operationType: 'Clone',
      progress: {
        stage: 'Receiving',
        receivedObjects: 50,
        totalObjects: 100,
        receivedBytes: 0,
      },
    };
    mockOperations.set('op-1', operation);

    const { result } = renderHook(() => useOperationProgress('Clone'));

    expect(result.current).toEqual(operation);
  });

  it('should return undefined when operation has no progress', () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Clone',
      startedAt: Date.now(),
      category: 'git',
      operationType: 'Clone',
      // No progress property
    });

    const { result } = renderHook(() => useOperationProgress('Clone'));

    expect(result.current).toBeUndefined();
  });

  it('should return first matching operation with progress', () => {
    const operation1: Operation = {
      id: 'op-1',
      name: 'Fetch 1',
      startedAt: Date.now(),
      category: 'git',
      operationType: 'Fetch',
      progress: {
        stage: ProgressStage.Receiving,
        receivedObjects: 10,
        totalObjects: 50,
        receivedBytes: 0,
      },
    };
    const operation2: Operation = {
      id: 'op-2',
      name: 'Fetch 2',
      startedAt: Date.now(),
      category: 'git',
      operationType: 'Fetch',
      progress: {
        stage: ProgressStage.Resolving,
        indexedObjects: 50,
        totalObjects: 100,
        receivedBytes: 0,
      },
    };

    mockOperations.set('op-1', operation1);
    mockOperations.set('op-2', operation2);

    const { result } = renderHook(() => useOperationProgress('Fetch'));

    // Returns first found (iteration order)
    expect(result.current).toBeDefined();
    expect(result.current?.operationType).toBe('Fetch');
    expect(result.current?.progress).toBeDefined();
  });
});
