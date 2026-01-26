import { describe, it, expect, vi } from 'vitest';
import { KEYBOARD_SHORTCUTS } from './useKeyboardShortcuts';

// Note: Testing useKeyboardShortcuts hook directly is complex because it uses
// react-hotkeys-hook which requires a full browser environment. Instead, we test
// the exported KEYBOARD_SHORTCUTS constant and the structure of the hook.

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('../store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    setCurrentView: vi.fn(),
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
});
