import { useCallback, useEffect, useMemo } from 'react';
import { useCustomActionsStore } from '@/store/customActionsStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { ActionVariables, CustomAction } from '@/types';
import { ActionContext } from '@/types';

interface ParsedShortcut {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

/**
 * Parse a shortcut string like "mod+shift+1" into components
 */
function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split('+');
  return {
    mod: parts.includes('mod') || parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    key:
      parts.filter((p) => !['mod', 'ctrl', 'cmd', 'shift', 'alt', 'option'].includes(p))[0] || '',
  };
}

/**
 * Check if a keyboard event matches a parsed shortcut
 */
function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modPressed = isMac ? event.metaKey : event.ctrlKey;

  if (parsed.mod !== modPressed) return false;
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;

  // Normalize key comparison
  const eventKey = event.key.toLowerCase();
  const expectedKey = parsed.key.toLowerCase();

  // Handle number keys and other special cases
  if (eventKey === expectedKey) return true;
  if (event.code.toLowerCase() === `key${expectedKey}`) return true;
  if (event.code.toLowerCase() === `digit${expectedKey}`) return true;

  return false;
}

/**
 * Build action variables from current repository state
 */
function buildVariables(
  repository: ReturnType<typeof useRepositoryStore.getState>
): ActionVariables {
  const { repository: repo, branches } = repository;
  const currentBranch = branches.find((b) => b.isHead);

  return {
    repoPath: repo?.path?.toString() ?? '',
    branch: currentBranch?.name ?? null,
    file: null,
    selectedFiles: null,
    commitHash: null,
    commitShort: null,
    commitMessage: null,
    remoteUrl: null,
    tag: null,
    stashRef: null,
  };
}

/**
 * Hook to register keyboard shortcuts for custom actions.
 * Only actions with the Repository context work via shortcuts since
 * context-specific variables (file, commit, etc.) aren't available globally.
 */
export function useCustomActionShortcuts() {
  const globalActions = useCustomActionsStore((s) => s.globalActions);
  const repoActions = useCustomActionsStore((s) => s.repoActions);
  const confirmAndExecute = useCustomActionsStore((s) => s.confirmAndExecute);
  const repository = useRepositoryStore((s) => s.repository);

  // Get all enabled actions with shortcuts
  const actionsWithShortcuts = useMemo(() => {
    const allActions = [...repoActions, ...globalActions];
    const seenIds = new Set<string>();
    const result: Array<{ action: CustomAction; parsed: ParsedShortcut }> = [];

    for (const action of allActions) {
      if (seenIds.has(action.id)) continue;
      seenIds.add(action.id);

      if (action.enabled && action.shortcut && action.contexts.includes(ActionContext.Repository)) {
        result.push({
          action,
          parsed: parseShortcut(action.shortcut),
        });
      }
    }

    return result;
  }, [globalActions, repoActions]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger in form elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // No repository open - skip
      if (!repository) return;

      for (const { action, parsed } of actionsWithShortcuts) {
        if (matchesShortcut(event, parsed)) {
          event.preventDefault();
          event.stopPropagation();

          const variables = buildVariables(useRepositoryStore.getState());
          confirmAndExecute(action, variables);
          return;
        }
      }
    },
    [actionsWithShortcuts, confirmAndExecute, repository]
  );

  useEffect(() => {
    if (actionsWithShortcuts.length === 0) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionsWithShortcuts, handleKeyDown]);
}
