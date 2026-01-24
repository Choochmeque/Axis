import { useHotkeys } from 'react-hotkeys-hook';
import { useRepositoryStore } from '../store/repositoryStore';

interface KeyboardShortcutsOptions {
  onOpenSettings?: () => void;
  onOpenRepository?: () => void;
  onRefresh?: () => void;
  onCommit?: () => void;
  onPush?: () => void;
  onPull?: () => void;
  onFetch?: () => void;
  onCreateBranch?: () => void;
  onStash?: () => void;
  onSearch?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { setCurrentView } = useRepositoryStore();

  // Cmd/Ctrl + , - Open settings
  useHotkeys(
    'mod+,',
    (e) => {
      e.preventDefault();
      options.onOpenSettings?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + O - Open repository
  useHotkeys(
    'mod+o',
    (e) => {
      e.preventDefault();
      options.onOpenRepository?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + R - Refresh
  useHotkeys(
    'mod+r',
    (e) => {
      e.preventDefault();
      options.onRefresh?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + Enter - Commit
  useHotkeys(
    'mod+enter',
    (e) => {
      e.preventDefault();
      options.onCommit?.();
    },
    { enableOnFormTags: ['input', 'textarea'] }
  );

  // Cmd/Ctrl + Shift + P - Push
  useHotkeys(
    'mod+shift+p',
    (e) => {
      e.preventDefault();
      options.onPush?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + Shift + L - Pull
  useHotkeys(
    'mod+shift+l',
    (e) => {
      e.preventDefault();
      options.onPull?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + Shift + F - Fetch
  useHotkeys(
    'mod+shift+f',
    (e) => {
      e.preventDefault();
      options.onFetch?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + B - Create branch
  useHotkeys(
    'mod+b',
    (e) => {
      e.preventDefault();
      options.onCreateBranch?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + Shift + S - Stash
  useHotkeys(
    'mod+shift+s',
    (e) => {
      e.preventDefault();
      options.onStash?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + F - Search
  useHotkeys(
    'mod+f',
    (e) => {
      e.preventDefault();
      options.onSearch?.();
    },
    { enableOnFormTags: false }
  );

  // Navigation shortcuts
  // 1 - File status view
  useHotkeys(
    '1',
    () => {
      setCurrentView('file-status');
    },
    { enableOnFormTags: false }
  );

  // 2 - History view
  useHotkeys(
    '2',
    () => {
      setCurrentView('history');
    },
    { enableOnFormTags: false }
  );

  // 3 - Search view
  useHotkeys(
    '3',
    () => {
      setCurrentView('search');
    },
    { enableOnFormTags: false }
  );

  // Escape - General escape handler (dialogs handle their own)
  useHotkeys(
    'escape',
    () => {
      // Can be used by parent components
    },
    { enableOnFormTags: true }
  );
}

// Keyboard shortcut definitions for help display
// Note: descriptionKey should be translated using t() when displayed
export const KEYBOARD_SHORTCUTS = [
  { key: '⌘/Ctrl + ,', descriptionKey: 'shortcuts.openSettings' },
  { key: '⌘/Ctrl + O', descriptionKey: 'shortcuts.openRepository' },
  { key: '⌘/Ctrl + R', descriptionKey: 'shortcuts.refresh' },
  { key: '⌘/Ctrl + Enter', descriptionKey: 'shortcuts.commit' },
  { key: '⌘/Ctrl + Shift + P', descriptionKey: 'shortcuts.push' },
  { key: '⌘/Ctrl + Shift + L', descriptionKey: 'shortcuts.pull' },
  { key: '⌘/Ctrl + Shift + F', descriptionKey: 'shortcuts.fetch' },
  { key: '⌘/Ctrl + B', descriptionKey: 'shortcuts.createBranch' },
  { key: '⌘/Ctrl + Shift + S', descriptionKey: 'shortcuts.stash' },
  { key: '⌘/Ctrl + F', descriptionKey: 'shortcuts.search' },
  { key: '1', descriptionKey: 'shortcuts.fileStatusView' },
  { key: '2', descriptionKey: 'shortcuts.historyView' },
  { key: '3', descriptionKey: 'shortcuts.searchView' },
  { key: 'Escape', descriptionKey: 'shortcuts.closeDialog' },
];
