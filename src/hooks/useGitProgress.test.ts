import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressStage } from '@/types';

// Use vi.hoisted for variables used in vi.mock factories
const mocks = vi.hoisted(() => {
  const mockUnlisten = vi.fn();
  return {
    mockUnlisten,
    mockGitProgressListen: vi.fn().mockResolvedValue(mockUnlisten),
    mockOperationsStart: vi.fn(),
    mockOperationsComplete: vi.fn(),
    mockOperationsUpdateProgress: vi.fn(),
  };
});

vi.mock('@/bindings/api', () => ({
  events: {
    gitOperationProgressEvent: { listen: mocks.mockGitProgressListen },
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
  },
}));

vi.mock('@/store/operationStore', () => ({
  operations: {
    start: mocks.mockOperationsStart,
    complete: mocks.mockOperationsComplete,
    updateProgress: mocks.mockOperationsUpdateProgress,
  },
}));

import { useGitProgress } from './useGitProgress';

describe('useGitProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should setup git progress listener on mount', async () => {
    renderHook(() => useGitProgress());

    await waitFor(() => {
      expect(mocks.mockGitProgressListen).toHaveBeenCalled();
    });
  });

  it('should cleanup listener on unmount', async () => {
    const { unmount } = renderHook(() => useGitProgress());

    await waitFor(() => {
      expect(mocks.mockGitProgressListen).toHaveBeenCalled();
    });

    unmount();

    expect(mocks.mockUnlisten).toHaveBeenCalled();
  });

  describe('progress event handling', () => {
    it('should complete operation on Complete stage', async () => {
      renderHook(() => useGitProgress());

      await waitFor(() => {
        expect(mocks.mockGitProgressListen).toHaveBeenCalled();
      });

      const handler = mocks.mockGitProgressListen.mock.calls[0][0];
      handler({
        payload: {
          operationId: 'op-123',
          operationType: 'Clone',
          stage: ProgressStage.Complete,
        },
      });

      expect(mocks.mockOperationsComplete).toHaveBeenCalledWith('op-123');
    });

    it('should complete operation on Failed stage', async () => {
      renderHook(() => useGitProgress());

      await waitFor(() => {
        expect(mocks.mockGitProgressListen).toHaveBeenCalled();
      });

      const handler = mocks.mockGitProgressListen.mock.calls[0][0];
      handler({
        payload: {
          operationId: 'op-456',
          operationType: 'Fetch',
          stage: ProgressStage.Failed,
        },
      });

      expect(mocks.mockOperationsComplete).toHaveBeenCalledWith('op-456');
    });

    it('should complete operation on Cancelled stage', async () => {
      renderHook(() => useGitProgress());

      await waitFor(() => {
        expect(mocks.mockGitProgressListen).toHaveBeenCalled();
      });

      const handler = mocks.mockGitProgressListen.mock.calls[0][0];
      handler({
        payload: {
          operationId: 'op-789',
          operationType: 'Clone',
          stage: ProgressStage.Cancelled,
        },
      });

      expect(mocks.mockOperationsComplete).toHaveBeenCalledWith('op-789');
    });

    it('should start and update operation on non-terminal stage', async () => {
      renderHook(() => useGitProgress());

      await waitFor(() => {
        expect(mocks.mockGitProgressListen).toHaveBeenCalled();
      });

      const handler = mocks.mockGitProgressListen.mock.calls[0][0];
      handler({
        payload: {
          operationId: 'op-123',
          operationType: 'Clone',
          stage: 'Receiving',
          totalObjects: 100,
          receivedObjects: 50,
          indexedObjects: 25,
          receivedBytes: 1024,
          totalDeltas: 10,
          indexedDeltas: 5,
          message: 'Cloning...',
        },
      });

      expect(mocks.mockOperationsStart).toHaveBeenCalledWith(
        'ui.operations.names.Clone',
        expect.objectContaining({
          id: 'op-123',
          category: 'git',
          operationType: 'Clone',
          cancellable: true, // Clone is cancellable
        })
      );

      expect(mocks.mockOperationsUpdateProgress).toHaveBeenCalledWith('op-123', {
        stage: 'Receiving',
        totalObjects: 100,
        receivedObjects: 50,
        indexedObjects: 25,
        receivedBytes: 1024,
        totalDeltas: 10,
        indexedDeltas: 5,
        message: 'Cloning...',
      });
    });

    it('should mark Fetch as cancellable', async () => {
      renderHook(() => useGitProgress());

      await waitFor(() => {
        expect(mocks.mockGitProgressListen).toHaveBeenCalled();
      });

      const handler = mocks.mockGitProgressListen.mock.calls[0][0];
      handler({
        payload: {
          operationId: 'op-fetch',
          operationType: 'Fetch',
          stage: 'Receiving',
        },
      });

      expect(mocks.mockOperationsStart).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cancellable: true,
        })
      );
    });

    it('should mark Push as non-cancellable', async () => {
      renderHook(() => useGitProgress());

      await waitFor(() => {
        expect(mocks.mockGitProgressListen).toHaveBeenCalled();
      });

      const handler = mocks.mockGitProgressListen.mock.calls[0][0];
      handler({
        payload: {
          operationId: 'op-push',
          operationType: 'Push',
          stage: 'Sending',
        },
      });

      expect(mocks.mockOperationsStart).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cancellable: false,
        })
      );
    });

    it('should handle null values in progress payload', async () => {
      renderHook(() => useGitProgress());

      await waitFor(() => {
        expect(mocks.mockGitProgressListen).toHaveBeenCalled();
      });

      const handler = mocks.mockGitProgressListen.mock.calls[0][0];
      handler({
        payload: {
          operationId: 'op-123',
          operationType: 'Clone',
          stage: 'Receiving',
          totalObjects: null,
          receivedObjects: null,
          indexedObjects: null,
          receivedBytes: null,
          totalDeltas: null,
          indexedDeltas: null,
          message: null,
        },
      });

      expect(mocks.mockOperationsUpdateProgress).toHaveBeenCalledWith('op-123', {
        stage: 'Receiving',
        totalObjects: undefined,
        receivedObjects: undefined,
        indexedObjects: undefined,
        receivedBytes: null,
        totalDeltas: undefined,
        indexedDeltas: undefined,
        message: undefined,
      });
    });
  });
});
