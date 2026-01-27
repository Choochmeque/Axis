import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { KEYBOARD_SHORTCUTS, useKeyboardShortcuts } from './useKeyboardShortcuts';

// Store registered hotkey handlers
const hotkeyHandlers: Record<string, (e: KeyboardEvent) => void> = {};

const mockSetCurrentView = vi.fn();

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn((key: string, handler: (e: KeyboardEvent) => void) => {
    hotkeyHandlers[key] = handler;
  }),
}));

vi.mock('../store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    setCurrentView: mockSetCurrentView,
  }),
}));

describe('useKeyboardShortcuts', () => {
  describe('KEYBOARD_SHORTCUTS constant', () => {
    it('should export keyboard shortcuts array', () => {
      expect(Array.isArray(KEYBOARD_SHORTCUTS)).toBe(true);
      expect(KEYBOARD_SHORTCUTS.length).toBeGreaterThan(0);
    });

    it('should have correct structure for each shortcut', () => {
      for (const shortcut of KEYBOARD_SHORTCUTS) {
        expect(shortcut).toHaveProperty('key');
        expect(shortcut).toHaveProperty('descriptionKey');
        expect(typeof shortcut.key).toBe('string');
        expect(typeof shortcut.descriptionKey).toBe('string');
      }
    });

    it('should include settings shortcut', () => {
      const settingsShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.openSettings'
      );
      expect(settingsShortcut).toBeDefined();
      expect(settingsShortcut?.key).toContain(',');
    });

    it('should include repository shortcut', () => {
      const repoShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.openRepository'
      );
      expect(repoShortcut).toBeDefined();
      expect(repoShortcut?.key).toContain('O');
    });

    it('should include refresh shortcut', () => {
      const refreshShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.refresh'
      );
      expect(refreshShortcut).toBeDefined();
      expect(refreshShortcut?.key).toContain('R');
    });

    it('should include commit shortcut', () => {
      const commitShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.commit'
      );
      expect(commitShortcut).toBeDefined();
      expect(commitShortcut?.key).toContain('Enter');
    });

    it('should include push shortcut', () => {
      const pushShortcut = KEYBOARD_SHORTCUTS.find((s) => s.descriptionKey === 'shortcuts.push');
      expect(pushShortcut).toBeDefined();
      expect(pushShortcut?.key).toContain('P');
    });

    it('should include pull shortcut', () => {
      const pullShortcut = KEYBOARD_SHORTCUTS.find((s) => s.descriptionKey === 'shortcuts.pull');
      expect(pullShortcut).toBeDefined();
      expect(pullShortcut?.key).toContain('L');
    });

    it('should include fetch shortcut', () => {
      const fetchShortcut = KEYBOARD_SHORTCUTS.find((s) => s.descriptionKey === 'shortcuts.fetch');
      expect(fetchShortcut).toBeDefined();
      expect(fetchShortcut?.key).toContain('F');
    });

    it('should include branch creation shortcut', () => {
      const branchShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.createBranch'
      );
      expect(branchShortcut).toBeDefined();
      expect(branchShortcut?.key).toContain('B');
    });

    it('should include stash shortcut', () => {
      const stashShortcut = KEYBOARD_SHORTCUTS.find((s) => s.descriptionKey === 'shortcuts.stash');
      expect(stashShortcut).toBeDefined();
      expect(stashShortcut?.key).toContain('S');
    });

    it('should include search shortcut', () => {
      const searchShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.search'
      );
      expect(searchShortcut).toBeDefined();
      expect(searchShortcut?.key).toContain('F');
    });

    it('should include view navigation shortcuts', () => {
      const fileStatusShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.fileStatusView'
      );
      const historyShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.historyView'
      );
      const searchViewShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.searchView'
      );

      expect(fileStatusShortcut).toBeDefined();
      expect(fileStatusShortcut?.key).toBe('1');

      expect(historyShortcut).toBeDefined();
      expect(historyShortcut?.key).toBe('2');

      expect(searchViewShortcut).toBeDefined();
      expect(searchViewShortcut?.key).toBe('3');
    });

    it('should include escape shortcut', () => {
      const escapeShortcut = KEYBOARD_SHORTCUTS.find(
        (s) => s.descriptionKey === 'shortcuts.closeDialog'
      );
      expect(escapeShortcut).toBeDefined();
      expect(escapeShortcut?.key).toBe('Escape');
    });
  });

  describe('useKeyboardShortcuts hook', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Clear all registered handlers
      Object.keys(hotkeyHandlers).forEach((key) => delete hotkeyHandlers[key]);
    });

    it('should register hotkeys when hook is called', () => {
      const mockOptions = {
        onOpenSettings: vi.fn(),
        onOpenRepository: vi.fn(),
        onRefresh: vi.fn(),
        onCommit: vi.fn(),
        onPush: vi.fn(),
        onPull: vi.fn(),
        onFetch: vi.fn(),
        onCreateBranch: vi.fn(),
        onStash: vi.fn(),
        onSearch: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(mockOptions));

      // Check that all hotkeys are registered
      expect(hotkeyHandlers['mod+,']).toBeDefined();
      expect(hotkeyHandlers['mod+o']).toBeDefined();
      expect(hotkeyHandlers['mod+r']).toBeDefined();
      expect(hotkeyHandlers['mod+enter']).toBeDefined();
      expect(hotkeyHandlers['mod+shift+p']).toBeDefined();
      expect(hotkeyHandlers['mod+shift+l']).toBeDefined();
      expect(hotkeyHandlers['mod+shift+f']).toBeDefined();
      expect(hotkeyHandlers['mod+b']).toBeDefined();
      expect(hotkeyHandlers['mod+shift+s']).toBeDefined();
      expect(hotkeyHandlers['mod+f']).toBeDefined();
      expect(hotkeyHandlers['1']).toBeDefined();
      expect(hotkeyHandlers['2']).toBeDefined();
      expect(hotkeyHandlers['3']).toBeDefined();
      expect(hotkeyHandlers['escape']).toBeDefined();
    });

    it('should call onOpenSettings when mod+, is pressed', () => {
      const mockOptions = { onOpenSettings: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+,']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onOpenSettings).toHaveBeenCalled();
    });

    it('should call onOpenRepository when mod+o is pressed', () => {
      const mockOptions = { onOpenRepository: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+o']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onOpenRepository).toHaveBeenCalled();
    });

    it('should call onRefresh when mod+r is pressed', () => {
      const mockOptions = { onRefresh: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+r']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onRefresh).toHaveBeenCalled();
    });

    it('should call onCommit when mod+enter is pressed', () => {
      const mockOptions = { onCommit: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+enter']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onCommit).toHaveBeenCalled();
    });

    it('should call onPush when mod+shift+p is pressed', () => {
      const mockOptions = { onPush: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+shift+p']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onPush).toHaveBeenCalled();
    });

    it('should call onPull when mod+shift+l is pressed', () => {
      const mockOptions = { onPull: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+shift+l']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onPull).toHaveBeenCalled();
    });

    it('should call onFetch when mod+shift+f is pressed', () => {
      const mockOptions = { onFetch: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+shift+f']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onFetch).toHaveBeenCalled();
    });

    it('should call onCreateBranch when mod+b is pressed', () => {
      const mockOptions = { onCreateBranch: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+b']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onCreateBranch).toHaveBeenCalled();
    });

    it('should call onStash when mod+shift+s is pressed', () => {
      const mockOptions = { onStash: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+shift+s']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onStash).toHaveBeenCalled();
    });

    it('should call onSearch when mod+f is pressed', () => {
      const mockOptions = { onSearch: vi.fn() };
      renderHook(() => useKeyboardShortcuts(mockOptions));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyHandlers['mod+f']?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOptions.onSearch).toHaveBeenCalled();
    });

    it('should set file-status view when 1 is pressed', () => {
      renderHook(() => useKeyboardShortcuts({}));

      hotkeyHandlers['1']?.({} as KeyboardEvent);

      expect(mockSetCurrentView).toHaveBeenCalledWith('file-status');
    });

    it('should set history view when 2 is pressed', () => {
      renderHook(() => useKeyboardShortcuts({}));

      hotkeyHandlers['2']?.({} as KeyboardEvent);

      expect(mockSetCurrentView).toHaveBeenCalledWith('history');
    });

    it('should set search view when 3 is pressed', () => {
      renderHook(() => useKeyboardShortcuts({}));

      hotkeyHandlers['3']?.({} as KeyboardEvent);

      expect(mockSetCurrentView).toHaveBeenCalledWith('search');
    });

    it('should register escape handler', () => {
      renderHook(() => useKeyboardShortcuts({}));

      // Escape handler should be registered but does nothing by default
      expect(hotkeyHandlers['escape']).toBeDefined();
      expect(() => hotkeyHandlers['escape']?.({} as KeyboardEvent)).not.toThrow();
    });

    it('should work with empty options', () => {
      expect(() => {
        renderHook(() => useKeyboardShortcuts());
      }).not.toThrow();
    });

    it('should not throw when callback is undefined', () => {
      renderHook(() => useKeyboardShortcuts({}));

      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      // Should not throw when callback is not provided
      expect(() => hotkeyHandlers['mod+,']?.(mockEvent)).not.toThrow();
      expect(() => hotkeyHandlers['mod+o']?.(mockEvent)).not.toThrow();
      expect(() => hotkeyHandlers['mod+r']?.(mockEvent)).not.toThrow();
    });
  });
});
