import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLfsStore } from './lfsStore';
import type {
  LfsStatus,
  LfsTrackedPattern,
  LfsFile,
  LfsEnvironment,
  GitEnvironment,
  LfsResult,
  LfsPruneResult,
} from '@/bindings/api';

vi.mock('@/services/api', () => ({
  lfsApi: {
    getStatus: vi.fn(),
    listPatterns: vi.fn(),
    listFiles: vi.fn(),
    getEnv: vi.fn(),
    getGitEnvironment: vi.fn(),
    install: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    fetch: vi.fn(),
    pull: vi.fn(),
    push: vi.fn(),
    migrate: vi.fn(),
    prune: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        return `${key}: ${JSON.stringify(params)}`;
      }
      return key;
    },
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

const mockAddToast = vi.fn();
vi.mock('./toastStore', () => ({
  useToastStore: {
    getState: () => ({
      addToast: mockAddToast,
    }),
  },
}));

import { lfsApi } from '@/services/api';

describe('lfsStore', () => {
  const mockStatus: LfsStatus = {
    isInstalled: true,
    version: '3.0.0',
    isInitialized: true,
    trackedPatternsCount: 1,
    lfsFilesCount: 5,
  };

  const mockPattern: LfsTrackedPattern = {
    pattern: '*.bin',
    sourceFile: '.gitattributes',
  };

  const mockFile: LfsFile = {
    path: 'data.bin',
    oid: 'abc123',
    size: 1024,
    isDownloaded: true,
    status: 'Downloaded',
  };

  const mockEnvironment: LfsEnvironment = {
    version: '3.0.0',
    endpoint: 'https://lfs.example.com',
    storagePath: '/path/to/lfs',
    usesSsh: false,
  };

  const mockGitEnvironment: GitEnvironment = {
    gitVersion: '2.40.0',
    gitPath: '/usr/bin/git',
    libgit2Version: '1.5.0',
    lfsInstalled: true,
    lfsVersion: '3.0.0',
  };

  const mockLfsResult: LfsResult = {
    success: true,
    message: 'Operation completed',
    affectedFiles: [],
  };

  const mockLfsResultFailed: LfsResult = {
    success: false,
    message: 'Operation failed',
    affectedFiles: [],
  };

  const mockPruneResult: LfsPruneResult = {
    success: true,
    message: 'Pruned 5 objects',
    objectsPruned: 5,
    spaceReclaimed: 1024000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useLfsStore.setState({
      status: null,
      patterns: [],
      files: [],
      environment: null,
      gitEnvironment: null,
      isLoadingStatus: false,
      isLoadingPatterns: false,
      isLoadingFiles: false,
      isLoadingEnvironment: false,
      isInstalling: false,
      isFetching: false,
      isPulling: false,
      isPushing: false,
      isMigrating: false,
      isPruning: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadStatus', () => {
    it('should load LFS status', async () => {
      vi.mocked(lfsApi.getStatus).mockResolvedValue(mockStatus);

      await useLfsStore.getState().loadStatus();

      expect(lfsApi.getStatus).toHaveBeenCalled();
      expect(useLfsStore.getState().status).toEqual(mockStatus);
      expect(useLfsStore.getState().isLoadingStatus).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: LfsStatus) => void;
      const pendingPromise = new Promise<LfsStatus>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(lfsApi.getStatus).mockReturnValue(pendingPromise);

      const loadPromise = useLfsStore.getState().loadStatus();

      expect(useLfsStore.getState().isLoadingStatus).toBe(true);

      resolvePromise!(mockStatus);
      await loadPromise;

      expect(useLfsStore.getState().isLoadingStatus).toBe(false);
    });

    it('should handle errors silently', async () => {
      vi.mocked(lfsApi.getStatus).mockRejectedValue(new Error('Failed'));

      await useLfsStore.getState().loadStatus();

      expect(useLfsStore.getState().status).toBeNull();
      expect(useLfsStore.getState().isLoadingStatus).toBe(false);
    });
  });

  describe('loadPatterns', () => {
    it('should load LFS patterns', async () => {
      vi.mocked(lfsApi.listPatterns).mockResolvedValue([mockPattern]);

      await useLfsStore.getState().loadPatterns();

      expect(lfsApi.listPatterns).toHaveBeenCalled();
      expect(useLfsStore.getState().patterns).toHaveLength(1);
      expect(useLfsStore.getState().isLoadingPatterns).toBe(false);
    });
  });

  describe('loadFiles', () => {
    it('should load LFS files', async () => {
      vi.mocked(lfsApi.listFiles).mockResolvedValue([mockFile]);

      await useLfsStore.getState().loadFiles();

      expect(lfsApi.listFiles).toHaveBeenCalled();
      expect(useLfsStore.getState().files).toHaveLength(1);
      expect(useLfsStore.getState().isLoadingFiles).toBe(false);
    });
  });

  describe('loadEnvironment', () => {
    it('should load LFS environment', async () => {
      vi.mocked(lfsApi.getEnv).mockResolvedValue(mockEnvironment);

      await useLfsStore.getState().loadEnvironment();

      expect(lfsApi.getEnv).toHaveBeenCalled();
      expect(useLfsStore.getState().environment).toEqual(mockEnvironment);
      expect(useLfsStore.getState().isLoadingEnvironment).toBe(false);
    });
  });

  describe('loadGitEnvironment', () => {
    it('should load Git environment', async () => {
      vi.mocked(lfsApi.getGitEnvironment).mockResolvedValue(mockGitEnvironment);

      await useLfsStore.getState().loadGitEnvironment();

      expect(lfsApi.getGitEnvironment).toHaveBeenCalled();
      expect(useLfsStore.getState().gitEnvironment).toEqual(mockGitEnvironment);
    });
  });

  describe('loadAll', () => {
    it('should load status, patterns, and files', async () => {
      vi.mocked(lfsApi.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(lfsApi.listPatterns).mockResolvedValue([mockPattern]);
      vi.mocked(lfsApi.listFiles).mockResolvedValue([mockFile]);

      await useLfsStore.getState().loadAll();

      expect(lfsApi.getStatus).toHaveBeenCalled();
      expect(lfsApi.listPatterns).toHaveBeenCalled();
      expect(lfsApi.listFiles).toHaveBeenCalled();
    });
  });

  describe('install', () => {
    it('should install LFS and reload status on success', async () => {
      vi.mocked(lfsApi.install).mockResolvedValue(mockLfsResult);
      vi.mocked(lfsApi.getStatus).mockResolvedValue(mockStatus);

      const result = await useLfsStore.getState().install();

      expect(result).toBe(true);
      expect(lfsApi.install).toHaveBeenCalled();
      expect(lfsApi.getStatus).toHaveBeenCalled();
      expect(useLfsStore.getState().isInstalling).toBe(false);
    });

    it('should return false on failure', async () => {
      vi.mocked(lfsApi.install).mockResolvedValue(mockLfsResultFailed);

      const result = await useLfsStore.getState().install();

      expect(result).toBe(false);
      expect(mockAddToast).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(lfsApi.install).mockRejectedValue(new Error('Install failed'));

      const result = await useLfsStore.getState().install();

      expect(result).toBe(false);
      expect(useLfsStore.getState().isInstalling).toBe(false);
    });
  });

  describe('track', () => {
    it('should track pattern and reload patterns on success', async () => {
      vi.mocked(lfsApi.track).mockResolvedValue(mockLfsResult);
      vi.mocked(lfsApi.listPatterns).mockResolvedValue([mockPattern]);

      const result = await useLfsStore.getState().track('*.bin');

      expect(result).toBe(true);
      expect(lfsApi.track).toHaveBeenCalledWith('*.bin');
      expect(lfsApi.listPatterns).toHaveBeenCalled();
    });

    it('should return false on failure', async () => {
      vi.mocked(lfsApi.track).mockResolvedValue(mockLfsResultFailed);

      const result = await useLfsStore.getState().track('*.bin');

      expect(result).toBe(false);
    });
  });

  describe('untrack', () => {
    it('should untrack pattern and reload patterns on success', async () => {
      vi.mocked(lfsApi.untrack).mockResolvedValue(mockLfsResult);
      vi.mocked(lfsApi.listPatterns).mockResolvedValue([]);

      const result = await useLfsStore.getState().untrack('*.bin');

      expect(result).toBe(true);
      expect(lfsApi.untrack).toHaveBeenCalledWith('*.bin');
      expect(lfsApi.listPatterns).toHaveBeenCalled();
    });
  });

  describe('fetch', () => {
    it('should fetch LFS objects and reload files on success', async () => {
      vi.mocked(lfsApi.fetch).mockResolvedValue(mockLfsResult);
      vi.mocked(lfsApi.listFiles).mockResolvedValue([mockFile]);

      const result = await useLfsStore.getState().fetch();

      expect(result).toBe(true);
      expect(lfsApi.fetch).toHaveBeenCalled();
      expect(lfsApi.listFiles).toHaveBeenCalled();
      expect(useLfsStore.getState().isFetching).toBe(false);
    });

    it('should pass options to API', async () => {
      vi.mocked(lfsApi.fetch).mockResolvedValue(mockLfsResult);
      vi.mocked(lfsApi.listFiles).mockResolvedValue([]);

      await useLfsStore.getState().fetch({ all: true, recent: false, remote: 'origin', refs: [] });

      expect(lfsApi.fetch).toHaveBeenCalledWith({
        all: true,
        recent: false,
        remote: 'origin',
        refs: [],
      });
    });
  });

  describe('pull', () => {
    it('should pull LFS objects and reload files on success', async () => {
      vi.mocked(lfsApi.pull).mockResolvedValue(mockLfsResult);
      vi.mocked(lfsApi.listFiles).mockResolvedValue([mockFile]);

      const result = await useLfsStore.getState().pull();

      expect(result).toBe(true);
      expect(lfsApi.pull).toHaveBeenCalled();
      expect(useLfsStore.getState().isPulling).toBe(false);
    });
  });

  describe('push', () => {
    it('should push LFS objects on success', async () => {
      vi.mocked(lfsApi.push).mockResolvedValue(mockLfsResult);

      const result = await useLfsStore.getState().push();

      expect(result).toBe(true);
      expect(lfsApi.push).toHaveBeenCalled();
      expect(useLfsStore.getState().isPushing).toBe(false);
    });

    it('should pass options to API', async () => {
      vi.mocked(lfsApi.push).mockResolvedValue(mockLfsResult);

      await useLfsStore.getState().push({ remote: 'origin', all: true, dryRun: false });

      expect(lfsApi.push).toHaveBeenCalledWith({ remote: 'origin', all: true, dryRun: false });
    });
  });

  describe('migrate', () => {
    it('should migrate and reload all on success', async () => {
      vi.mocked(lfsApi.migrate).mockResolvedValue(mockLfsResult);
      vi.mocked(lfsApi.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(lfsApi.listPatterns).mockResolvedValue([]);
      vi.mocked(lfsApi.listFiles).mockResolvedValue([]);

      const result = await useLfsStore.getState().migrate({
        mode: 'Import',
        include: ['*.bin'],
        exclude: [],
        everything: false,
        refs: [],
        above: null,
      });

      expect(result).toBe(true);
      expect(lfsApi.migrate).toHaveBeenCalled();
      expect(useLfsStore.getState().isMigrating).toBe(false);
    });
  });

  describe('prune', () => {
    it('should prune LFS objects', async () => {
      vi.mocked(lfsApi.prune).mockResolvedValue(mockPruneResult);

      const result = await useLfsStore.getState().prune();

      expect(result).toBe(true);
      expect(lfsApi.prune).toHaveBeenCalled();
      expect(useLfsStore.getState().isPruning).toBe(false);
    });

    it('should pass options to API', async () => {
      vi.mocked(lfsApi.prune).mockResolvedValue(mockPruneResult);

      await useLfsStore.getState().prune({ dryRun: true, verifyRemote: true });

      expect(lfsApi.prune).toHaveBeenCalledWith({ dryRun: true, verifyRemote: true });
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useLfsStore.setState({
        status: mockStatus,
        patterns: [mockPattern],
        files: [mockFile],
        environment: mockEnvironment,
        gitEnvironment: mockGitEnvironment,
        isLoadingStatus: true,
        isLoadingPatterns: true,
        isLoadingFiles: true,
        isLoadingEnvironment: true,
        isInstalling: true,
        isFetching: true,
        isPulling: true,
        isPushing: true,
        isMigrating: true,
        isPruning: true,
      });

      useLfsStore.getState().reset();

      const state = useLfsStore.getState();
      expect(state.status).toBeNull();
      expect(state.patterns).toHaveLength(0);
      expect(state.files).toHaveLength(0);
      expect(state.environment).toBeNull();
      expect(state.gitEnvironment).toBeNull();
      expect(state.isLoadingStatus).toBe(false);
      expect(state.isInstalling).toBe(false);
      expect(state.isFetching).toBe(false);
      expect(state.isPulling).toBe(false);
      expect(state.isPushing).toBe(false);
      expect(state.isMigrating).toBe(false);
      expect(state.isPruning).toBe(false);
    });
  });
});
