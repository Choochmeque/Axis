import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollToCommit } from './useScrollToCommit';

const mockScrollToIndex = vi.fn();
const mockSetScrollTarget = vi.fn();
const mockLoadMoreCommits = vi.fn().mockResolvedValue(undefined);
let mockScrollTargetOid: string | null = null;
let mockCommits: Array<{ oid: string }> = [];
let mockHasMoreCommits = true;
let mockIsLoadingMoreCommits = false;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}: ${JSON.stringify(params)}`;
      return key;
    },
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        scrollTargetOid: mockScrollTargetOid,
        setScrollTarget: mockSetScrollTarget,
      }),
    {
      getState: () => ({
        commits: mockCommits,
        hasMoreCommits: mockHasMoreCommits,
        isLoadingMoreCommits: mockIsLoadingMoreCommits,
        loadMoreCommits: mockLoadMoreCommits,
      }),
    }
  ),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useScrollToCommit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockScrollTargetOid = null;
    mockCommits = [];
    mockHasMoreCommits = true;
    mockIsLoadingMoreCommits = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return scroll functions and state', () => {
    const { result } = renderHook(() => useScrollToCommit({ scrollToIndex: mockScrollToIndex }));

    expect(result.current.scrollToCommit).toBeInstanceOf(Function);
    expect(result.current.cancelScroll).toBeInstanceOf(Function);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('should scroll immediately if commit already loaded', async () => {
    mockCommits = [{ oid: 'abc123' }, { oid: 'def456' }];

    const { result } = renderHook(() => useScrollToCommit({ scrollToIndex: mockScrollToIndex }));

    await act(async () => {
      await result.current.scrollToCommit('def456');
    });

    expect(mockScrollToIndex).toHaveBeenCalledWith(1);
  });

  it('should set isSearching when loading more commits', async () => {
    mockCommits = [{ oid: 'abc123' }];
    mockHasMoreCommits = true;

    // Make loadMoreCommits add the commit we're looking for
    mockLoadMoreCommits.mockImplementation(async () => {
      mockCommits = [...mockCommits, { oid: 'target-oid' }];
    });

    const { result } = renderHook(() => useScrollToCommit({ scrollToIndex: mockScrollToIndex }));

    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.scrollToCommit('target-oid');
    });

    expect(result.current.isSearching).toBe(true);

    await act(async () => {
      await searchPromise;
    });

    expect(result.current.isSearching).toBe(false);
  });

  it('should cancel search', async () => {
    mockCommits = [];
    mockHasMoreCommits = true;

    const { result } = renderHook(() => useScrollToCommit({ scrollToIndex: mockScrollToIndex }));

    act(() => {
      result.current.scrollToCommit('never-found');
    });

    expect(result.current.isSearching).toBe(true);

    act(() => {
      result.current.cancelScroll();
    });

    expect(result.current.isSearching).toBe(false);
    expect(mockSetScrollTarget).toHaveBeenCalledWith(null);
  });
});
