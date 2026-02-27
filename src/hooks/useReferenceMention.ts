import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Issue, IssueState, PrState, PullRequest } from '@/types';

export interface ReferenceItem {
  type: 'issue' | 'pr';
  number: number;
  title: string;
  state: IssueState | PrState;
}

interface UseReferenceMentionOptions {
  issues: Issue[];
  pullRequests: PullRequest[];
  isConnected: boolean;
  isLoading: boolean;
  onLoadData: () => void;
}

interface UseReferenceMentionReturn {
  isOpen: boolean;
  items: ReferenceItem[];
  selectedIndex: number;
  filterText: string;
  cursorPosition: number;
  handleInputChange: (value: string, cursorPosition: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  handleSelect: (item: ReferenceItem) => string | null;
  close: () => void;
}

export function useReferenceMention(
  options: UseReferenceMentionOptions
): UseReferenceMentionReturn {
  const { issues, pullRequests, isConnected, isLoading, onLoadData } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [triggerPosition, setTriggerPosition] = useState<number | null>(null);
  const [currentValue, setCurrentValue] = useState('');
  const [cursorPos, setCursorPos] = useState(0);

  const dataLoadedRef = useRef(false);

  const handleInputChange = useCallback(
    (value: string, cursorPosition: number) => {
      if (!isConnected) {
        setIsOpen(false);
        return;
      }

      setCurrentValue(value);
      setCursorPos(cursorPosition);

      const textBeforeCursor = value.slice(0, cursorPosition);

      // Match # not preceded by alphanumeric, followed by optional digits
      const match = textBeforeCursor.match(/(^|[^a-zA-Z0-9])#(\d*)$/);

      if (match) {
        setIsOpen(true);
        setTriggerPosition(cursorPosition - match[2].length - 1);
        setFilterText(match[2]);
        setSelectedIndex(0);

        // Load data if not already loaded
        if (!dataLoadedRef.current && issues.length === 0 && pullRequests.length === 0) {
          dataLoadedRef.current = true;
          onLoadData();
        }
      } else {
        setIsOpen(false);
        setTriggerPosition(null);
        setFilterText('');
      }
    },
    [isConnected, issues.length, pullRequests.length, onLoadData]
  );

  // Combine and filter items
  const items = useMemo(() => {
    const allItems: ReferenceItem[] = [
      ...pullRequests.map((pr) => ({
        type: 'pr' as const,
        number: pr.number,
        title: pr.title,
        state: pr.state,
      })),
      ...issues.map((issue) => ({
        type: 'issue' as const,
        number: issue.number,
        title: issue.title,
        state: issue.state,
      })),
    ];

    // Sort by number descending (most recent first)
    allItems.sort((a, b) => b.number - a.number);

    // Filter by number prefix if filterText is provided
    if (filterText) {
      return allItems.filter((item) => item.number.toString().startsWith(filterText));
    }

    return allItems.slice(0, 50); // Limit initial display
  }, [issues, pullRequests, filterText]);

  const handleSelect = useCallback(
    (item: ReferenceItem): string | null => {
      if (triggerPosition === null) return null;

      const before = currentValue.slice(0, triggerPosition);
      const after = currentValue.slice(cursorPos);

      const newValue = `${before}#${item.number}${after}`;

      setIsOpen(false);
      setTriggerPosition(null);
      setFilterText('');

      // Return the new cursor position for the caller to set
      return newValue;
    },
    [triggerPosition, currentValue, cursorPos]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isOpen || items.length === 0) return false;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
          return true;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return true;
        case 'Enter':
        case 'Tab':
          if (items[selectedIndex]) {
            e.preventDefault();
            return true; // Signal that selection should happen
          }
          return false;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          return true;
      }

      return false;
    },
    [isOpen, items, selectedIndex]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setTriggerPosition(null);
    setFilterText('');
  }, []);

  // Reset data loaded flag when disconnected
  useEffect(() => {
    if (!isConnected) {
      dataLoadedRef.current = false;
    }
  }, [isConnected]);

  return {
    isOpen: isOpen && !isLoading,
    items,
    selectedIndex,
    filterText,
    cursorPosition: cursorPos,
    handleInputChange,
    handleKeyDown,
    handleSelect,
    close,
  };
}
