import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReferenceMention } from './useReferenceMention';
import type { Issue, PullRequest } from '@/types';

describe('useReferenceMention', () => {
  const mockIssues: Issue[] = [
    {
      provider: 'GitHub',
      number: 1,
      title: 'First Issue',
      state: 'Open',
      url: 'https://github.com/test/repo/issues/1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { login: 'user', avatarUrl: '', url: '' },
      labels: [],
      commentsCount: 0,
    },
    {
      provider: 'GitHub',
      number: 42,
      title: 'Second Issue',
      state: 'Closed',
      url: 'https://github.com/test/repo/issues/42',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { login: 'user', avatarUrl: '', url: '' },
      labels: [],
      commentsCount: 0,
    },
  ];

  const mockPullRequests: PullRequest[] = [
    {
      provider: 'GitHub',
      number: 10,
      title: 'First PR',
      state: 'Open',
      url: 'https://github.com/test/repo/pulls/10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { login: 'user', avatarUrl: '', url: '' },
      sourceBranch: 'feature',
      targetBranch: 'main',
      draft: false,
    },
  ];

  const mockOnLoadData = vi.fn();

  const defaultOptions = {
    issues: mockIssues,
    pullRequests: mockPullRequests,
    isConnected: true,
    isLoading: false,
    onLoadData: mockOnLoadData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useReferenceMention(defaultOptions));

    expect(result.current.isOpen).toBe(false);
    // Items are computed from issues/PRs even when closed (memoized)
    expect(result.current.items).toHaveLength(3); // 2 issues + 1 PR
    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.filterText).toBe('');
  });

  it('should return empty items when no issues/PRs provided', () => {
    const { result } = renderHook(() =>
      useReferenceMention({
        ...defaultOptions,
        issues: [],
        pullRequests: [],
      })
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.items).toHaveLength(0);
  });

  describe('handleInputChange', () => {
    it('should not open when not connected', () => {
      const { result } = renderHook(() =>
        useReferenceMention({ ...defaultOptions, isConnected: false })
      );

      act(() => {
        result.current.handleInputChange('Hello #', 7);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should open when # is typed', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('Hello #', 7);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should not open when # is preceded by alphanumeric', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('Hello abc#', 10);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should open when # follows a space', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('Fix #', 5);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should filter items based on number prefix', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('Fix #4', 6);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.filterText).toBe('4');
      // Items starting with 4: #42
      expect(result.current.items.some((i) => i.number === 42)).toBe(true);
    });

    it('should close when # is removed', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('Fix #', 5);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleInputChange('Fix ', 4);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should load data when triggered with empty issues/PRs', () => {
      const { result } = renderHook(() =>
        useReferenceMention({
          ...defaultOptions,
          issues: [],
          pullRequests: [],
        })
      );

      act(() => {
        result.current.handleInputChange('Fix #', 5);
      });

      expect(mockOnLoadData).toHaveBeenCalled();
    });
  });

  describe('items', () => {
    it('should combine and sort items by number descending', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('#', 1);
      });

      // Items should be sorted: 42, 10, 1
      expect(result.current.items[0].number).toBe(42);
      expect(result.current.items[1].number).toBe(10);
      expect(result.current.items[2].number).toBe(1);
    });

    it('should limit initial display to 50 items', () => {
      const manyIssues: Issue[] = Array.from({ length: 100 }, (_, i) => ({
        provider: 'GitHub' as const,
        number: i + 1,
        title: `Issue ${i + 1}`,
        state: 'Open' as const,
        url: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: { login: 'user', avatarUrl: '', url: '' },
        labels: [],
        commentsCount: 0,
      }));

      const { result } = renderHook(() =>
        useReferenceMention({
          ...defaultOptions,
          issues: manyIssues,
          pullRequests: [],
        })
      );

      act(() => {
        result.current.handleInputChange('#', 1);
      });

      expect(result.current.items.length).toBeLessThanOrEqual(50);
    });
  });

  describe('handleKeyDown', () => {
    it('should return false when not open', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      let handled: boolean = false;
      act(() => {
        handled = result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(handled).toBe(false);
    });

    it('should navigate down with ArrowDown', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('#', 1);
      });

      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      act(() => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(result.current.selectedIndex).toBe(1);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should navigate up with ArrowUp', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('#', 1);
      });

      // Move down first
      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.selectedIndex).toBe(1);

      // Move up
      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should not go below 0', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('#', 1);
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should close on Escape', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('#', 1);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleKeyDown({
          key: 'Escape',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should return true on Enter when item selected', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('#', 1);
      });

      let handled: boolean = false;
      act(() => {
        handled = result.current.handleKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(handled).toBe(true);
    });
  });

  describe('handleSelect', () => {
    it('should return new value with reference inserted', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('Fix #', 5);
      });

      const selectedItem = result.current.items[0];
      let newValue: string | null = null;

      act(() => {
        newValue = result.current.handleSelect(selectedItem);
      });

      expect(newValue).toContain(`#${selectedItem.number}`);
      expect(result.current.isOpen).toBe(false);
    });

    it('should return null if no trigger position', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      // Don't open the menu, so no trigger position
      let newValue: string | null = 'initial';

      act(() => {
        newValue = result.current.handleSelect({
          type: 'issue',
          number: 1,
          title: 'Test',
          state: 'Open',
        });
      });

      expect(newValue).toBeNull();
    });
  });

  describe('close', () => {
    it('should close the menu and reset state', () => {
      const { result } = renderHook(() => useReferenceMention(defaultOptions));

      act(() => {
        result.current.handleInputChange('#4', 2);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.filterText).toBe('4');

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.filterText).toBe('');
    });
  });

  describe('isLoading state', () => {
    it('should not show as open when loading', () => {
      const { result } = renderHook(() =>
        useReferenceMention({ ...defaultOptions, isLoading: true })
      );

      act(() => {
        result.current.handleInputChange('#', 1);
      });

      // Internal state is open but isOpen returns false during loading
      expect(result.current.isOpen).toBe(false);
    });
  });
});
