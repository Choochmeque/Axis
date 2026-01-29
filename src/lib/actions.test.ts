import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Branch } from '@/types';
import { BranchType } from '@/types';

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockShowInFolder = vi.fn();
const mockNotify = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  },
}));

vi.mock('@/services/api', () => ({
  shellApi: {
    showInFolder: (...args: unknown[]) => mockShowInFolder(...args),
  },
}));

const mockWriteText = vi.fn();
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: (...args: unknown[]) => mockWriteText(...args),
}));

vi.mock('@/services/nativeNotification', () => ({
  notify: (title: string, body: string) => mockNotify(title, body),
}));

// Import after mocks
import { copyToClipboard, showInFinder, notifyNewCommits } from './actions';

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('should copy text to clipboard successfully', async () => {
    const result = await copyToClipboard('test text');

    expect(mockWriteText).toHaveBeenCalledWith('test text');
    expect(mockToastSuccess).toHaveBeenCalledWith('notifications.success.copiedToClipboard');
    expect(result).toBe(true);
  });

  it('should show custom success message', async () => {
    await copyToClipboard('test', 'Custom message');

    expect(mockToastSuccess).toHaveBeenCalledWith('Custom message');
  });

  it('should handle clipboard error', async () => {
    mockWriteText.mockRejectedValue(new Error('Copy failed'));

    const result = await copyToClipboard('test');

    expect(mockToastError).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

describe('showInFinder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowInFolder.mockResolvedValue(undefined);
  });

  it('should show path in finder successfully', async () => {
    const result = await showInFinder('/path/to/file');

    expect(mockShowInFolder).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should handle error', async () => {
    mockShowInFolder.mockRejectedValue(new Error('Failed to open'));

    const result = await showInFinder('/path/to/file');

    expect(mockToastError).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

describe('notifyNewCommits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should notify when current branch is behind', () => {
    const branches = [
      {
        name: 'main',
        branchType: BranchType.Local,
        isHead: true,
        behind: 3,
        ahead: 0,
        targetOid: 'abc123',
        fullName: 'refs/heads/main',
        upstream: null,
        lastCommitSummary: 'Test commit',
        lastCommitTime: '2024-01-01T00:00:00Z',
      },
    ] as Branch[];

    notifyNewCommits(branches);

    expect(mockNotify).toHaveBeenCalledWith(
      'lib.actions.newCommitsAvailable',
      expect.stringContaining('lib.actions.commitsToPull')
    );
  });

  it('should not notify when current branch is not behind', () => {
    const branches = [
      {
        name: 'main',
        branchType: BranchType.Local,
        isHead: true,
        behind: 0,
        ahead: 0,
        targetOid: 'abc123',
        fullName: 'refs/heads/main',
        upstream: null,
        lastCommitSummary: 'Test commit',
        lastCommitTime: '2024-01-01T00:00:00Z',
      },
    ] as Branch[];

    notifyNewCommits(branches);

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('should not notify when no current branch', () => {
    const branches = [
      {
        name: 'main',
        branchType: BranchType.Local,
        isHead: false,
        behind: 5,
        ahead: 0,
        targetOid: 'abc123',
        fullName: 'refs/heads/main',
        upstream: null,
        lastCommitSummary: 'Test commit',
        lastCommitTime: '2024-01-01T00:00:00Z',
      },
    ] as Branch[];

    notifyNewCommits(branches);

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('should not notify when behind is null', () => {
    const branches = [
      {
        name: 'main',
        branchType: BranchType.Local,
        isHead: true,
        behind: null,
        ahead: null,
        targetOid: 'abc123',
        fullName: 'refs/heads/main',
        upstream: null,
        lastCommitSummary: 'Test commit',
        lastCommitTime: '2024-01-01T00:00:00Z',
      },
    ] as Branch[];

    notifyNewCommits(branches);

    expect(mockNotify).not.toHaveBeenCalled();
  });
});
