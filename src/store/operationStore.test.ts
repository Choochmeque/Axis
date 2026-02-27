import { beforeEach, describe, expect, it } from 'vitest';
import { operations, useOperationStore } from './operationStore';

describe('operationStore', () => {
  beforeEach(() => {
    useOperationStore.setState({ operations: new Map() });
  });

  describe('startOperation', () => {
    it('should create operation with generated id', () => {
      const id = useOperationStore.getState().startOperation('Test Operation');

      expect(id).toMatch(/^op-/);
      const ops = useOperationStore.getState().operations;
      expect(ops.size).toBe(1);
      expect(ops.get(id)?.name).toBe('Test Operation');
    });

    it('should use provided id when specified', () => {
      const id = useOperationStore.getState().startOperation('Test', { id: 'custom-id' });

      expect(id).toBe('custom-id');
      expect(useOperationStore.getState().operations.has('custom-id')).toBe(true);
    });

    it('should not create duplicate if operation with id exists', () => {
      useOperationStore.getState().startOperation('First', { id: 'same-id' });
      useOperationStore.getState().startOperation('Second', { id: 'same-id' });

      const ops = useOperationStore.getState().operations;
      expect(ops.size).toBe(1);
      expect(ops.get('same-id')?.name).toBe('First');
    });

    it('should set default category to general', () => {
      const id = useOperationStore.getState().startOperation('Test');

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.category).toBe('general');
    });

    it('should accept custom category', () => {
      const id = useOperationStore.getState().startOperation('Git Op', { category: 'git' });

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.category).toBe('git');
    });

    it('should set description when provided', () => {
      const id = useOperationStore.getState().startOperation('Test', {
        description: 'Test description',
      });

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.description).toBe('Test description');
    });

    it('should set operationType when provided', () => {
      const id = useOperationStore.getState().startOperation('Push', {
        operationType: 'Push',
      });

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.operationType).toBe('Push');
    });

    it('should set cancellable flag when provided', () => {
      const id = useOperationStore.getState().startOperation('Long Op', {
        cancellable: true,
      });

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.cancellable).toBe(true);
    });

    it('should set startedAt timestamp', () => {
      const before = Date.now();
      const id = useOperationStore.getState().startOperation('Test');
      const after = Date.now();

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.startedAt).toBeGreaterThanOrEqual(before);
      expect(op?.startedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('updateOperation', () => {
    it('should update operation description', () => {
      const id = useOperationStore.getState().startOperation('Test', {
        description: 'Initial',
      });

      useOperationStore.getState().updateOperation(id, { description: 'Updated' });

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.description).toBe('Updated');
    });

    it('should do nothing for non-existent operation', () => {
      useOperationStore.getState().updateOperation('non-existent', { description: 'Test' });

      expect(useOperationStore.getState().operations.size).toBe(0);
    });
  });

  describe('updateProgress', () => {
    it('should update operation progress', () => {
      const id = useOperationStore.getState().startOperation('Download');

      useOperationStore.getState().updateProgress(id, {
        stage: 'Receiving',
        receivedBytes: 1024,
        totalObjects: 100,
        receivedObjects: 50,
      });

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.progress?.stage).toBe('Receiving');
      expect(op?.progress?.receivedBytes).toBe(1024);
      expect(op?.progress?.totalObjects).toBe(100);
      expect(op?.progress?.receivedObjects).toBe(50);
    });

    it('should do nothing for non-existent operation', () => {
      useOperationStore.getState().updateProgress('non-existent', {
        stage: 'Receiving',
        receivedBytes: 0,
      });

      expect(useOperationStore.getState().operations.size).toBe(0);
    });
  });

  describe('completeOperation', () => {
    it('should remove operation from map', () => {
      const id = useOperationStore.getState().startOperation('Test');

      expect(useOperationStore.getState().operations.has(id)).toBe(true);

      useOperationStore.getState().completeOperation(id);

      expect(useOperationStore.getState().operations.has(id)).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should remove all operations', () => {
      useOperationStore.getState().startOperation('Op 1');
      useOperationStore.getState().startOperation('Op 2');
      useOperationStore.getState().startOperation('Op 3');

      expect(useOperationStore.getState().operations.size).toBe(3);

      useOperationStore.getState().clearAll();

      expect(useOperationStore.getState().operations.size).toBe(0);
    });
  });

  describe('operations helper', () => {
    it('should provide start method', () => {
      const id = operations.start('Helper Test');

      expect(useOperationStore.getState().operations.has(id)).toBe(true);
    });

    it('should provide update method', () => {
      const id = operations.start('Test', { description: 'Initial' });
      operations.update(id, { description: 'Updated' });

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.description).toBe('Updated');
    });

    it('should provide updateProgress method', () => {
      const id = operations.start('Test');
      operations.updateProgress(id, { stage: 'Receiving', receivedBytes: 100 });

      const op = useOperationStore.getState().operations.get(id);
      expect(op?.progress?.receivedBytes).toBe(100);
    });

    it('should provide complete method', () => {
      const id = operations.start('Test');
      operations.complete(id);

      expect(useOperationStore.getState().operations.has(id)).toBe(false);
    });

    it('should provide clearAll method', () => {
      operations.start('Test 1');
      operations.start('Test 2');

      operations.clearAll();

      expect(useOperationStore.getState().operations.size).toBe(0);
    });
  });
});
