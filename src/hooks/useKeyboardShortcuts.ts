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
  useHotkeys('mod+,', (e) => {
    e.preventDefault();
    options.onOpenSettings?.();
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + O - Open repository
  useHotkeys('mod+o', (e) => {
    e.preventDefault();
    options.onOpenRepository?.();
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + R - Refresh
  useHotkeys('mod+r', (e) => {
    e.preventDefault();
    options.onRefresh?.();
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + Enter - Commit
  useHotkeys('mod+enter', (e) => {
    e.preventDefault();
    options.onCommit?.();
  }, { enableOnFormTags: ['input', 'textarea'] });

  // Cmd/Ctrl + Shift + P - Push
  useHotkeys('mod+shift+p', (e) => {
    e.preventDefault();
    options.onPush?.();
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + Shift + L - Pull
  useHotkeys('mod+shift+l', (e) => {
    e.preventDefault();
    options.onPull?.();
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + Shift + F - Fetch
  useHotkeys('mod+shift+f', (e) => {
    e.preventDefault();
    options.onFetch?.();
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + B - Create branch
  useHotkeys('mod+b', (e) => {
    e.preventDefault();
    options.onCreateBranch?.();
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + Shift + S - Stash
  useHotkeys('mod+shift+s', (e) => {
    e.preventDefault();
    options.onStash?.();
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + F - Search
  useHotkeys('mod+f', (e) => {
    e.preventDefault();
    options.onSearch?.();
  }, { enableOnFormTags: false });

  // Navigation shortcuts
  // 1 - File status view
  useHotkeys('1', () => {
    setCurrentView('file-status');
  }, { enableOnFormTags: false });

  // 2 - History view
  useHotkeys('2', () => {
    setCurrentView('history');
  }, { enableOnFormTags: false });

  // 3 - Search view
  useHotkeys('3', () => {
    setCurrentView('search');
  }, { enableOnFormTags: false });

  // Escape - General escape handler (dialogs handle their own)
  useHotkeys('escape', () => {
    // Can be used by parent components
  }, { enableOnFormTags: true });
}

// Keyboard shortcut definitions for help display
export const KEYBOARD_SHORTCUTS = [
  { key: '⌘/Ctrl + ,', description: 'Open Settings' },
  { key: '⌘/Ctrl + O', description: 'Open Repository' },
  { key: '⌘/Ctrl + R', description: 'Refresh' },
  { key: '⌘/Ctrl + Enter', description: 'Commit' },
  { key: '⌘/Ctrl + Shift + P', description: 'Push' },
  { key: '⌘/Ctrl + Shift + L', description: 'Pull' },
  { key: '⌘/Ctrl + Shift + F', description: 'Fetch' },
  { key: '⌘/Ctrl + B', description: 'Create Branch' },
  { key: '⌘/Ctrl + Shift + S', description: 'Stash' },
  { key: '⌘/Ctrl + F', description: 'Search' },
  { key: '1', description: 'File Status View' },
  { key: '2', description: 'History View' },
  { key: '3', description: 'Search View' },
  { key: 'Escape', description: 'Close Dialog' },
];
