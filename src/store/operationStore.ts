import type { GitOperationType, ProgressStage } from '@/types';
import { create } from 'zustand';

export type OperationCategory = 'git' | 'file' | 'network' | 'general';

export interface OperationProgress {
  stage: ProgressStage;
  totalObjects?: number;
  receivedObjects?: number;
  indexedObjects?: number;
  receivedBytes: number;
  totalDeltas?: number;
  indexedDeltas?: number;
  message?: string;
}

export interface Operation {
  id: string;
  name: string;
  description?: string;
  category: OperationCategory;
  startedAt: number;
  operationType?: GitOperationType;
  progress?: OperationProgress;
  cancellable?: boolean;
}

interface OperationState {
  operations: Map<string, Operation>;

  startOperation: (
    name: string,
    options?: {
      id?: string;
      description?: string;
      category?: OperationCategory;
      operationType?: GitOperationType;
      cancellable?: boolean;
    }
  ) => string;
  updateOperation: (id: string, updates: Partial<Pick<Operation, 'description'>>) => void;
  updateProgress: (id: string, progress: OperationProgress) => void;
  completeOperation: (id: string) => void;
  clearAll: () => void;
}

let operationCounter = 0;

export const useOperationStore = create<OperationState>((set, get) => ({
  operations: new Map(),

  startOperation: (name, options = {}) => {
    const id = options.id ?? `op-${++operationCounter}-${Date.now()}`;

    // If operation with this ID already exists, don't create duplicate
    if (get().operations.has(id)) {
      return id;
    }

    const operation: Operation = {
      id,
      name,
      description: options.description,
      category: options.category ?? 'general',
      startedAt: Date.now(),
      operationType: options.operationType,
      cancellable: options.cancellable,
    };

    set((state) => {
      const newOps = new Map(state.operations);
      newOps.set(id, operation);
      return { operations: newOps };
    });

    return id;
  },

  updateOperation: (id, updates) => {
    set((state) => {
      const op = state.operations.get(id);
      if (!op) return state;

      const newOps = new Map(state.operations);
      newOps.set(id, { ...op, ...updates });
      return { operations: newOps };
    });
  },

  updateProgress: (id, progress) => {
    set((state) => {
      const op = state.operations.get(id);
      if (!op) return state;

      const newOps = new Map(state.operations);
      newOps.set(id, { ...op, progress });
      return { operations: newOps };
    });
  },

  completeOperation: (id) => {
    set((state) => {
      const newOps = new Map(state.operations);
      newOps.delete(id);
      return { operations: newOps };
    });
  },

  clearAll: () => set({ operations: new Map() }),
}));

// Standalone helper for non-component code (stores, services, etc.)
export const operations = {
  start: (
    name: string,
    options?: {
      id?: string;
      description?: string;
      category?: OperationCategory;
      operationType?: GitOperationType;
      cancellable?: boolean;
    }
  ) => useOperationStore.getState().startOperation(name, options),
  update: (id: string, updates: Partial<Pick<Operation, 'description'>>) =>
    useOperationStore.getState().updateOperation(id, updates),
  updateProgress: (id: string, progress: OperationProgress) =>
    useOperationStore.getState().updateProgress(id, progress),
  complete: (id: string) => useOperationStore.getState().completeOperation(id),
  clearAll: () => useOperationStore.getState().clearAll(),
};
