import { CircleDot, GitPullRequest } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { ReferenceItem } from '@/hooks/useReferenceMention';

interface ReferenceMentionProps {
  isOpen: boolean;
  items: ReferenceItem[];
  selectedIndex: number;
  anchorElement: HTMLTextAreaElement | HTMLInputElement | null;
  cursorPosition: number;
  onSelect: (item: ReferenceItem) => void;
  onClose: () => void;
}

const DROPDOWN_WIDTH = 320;

// Get cursor position (both X and Y) using canvas text measurement
function getCursorOffset(
  element: HTMLTextAreaElement | HTMLInputElement,
  cursorIndex: number
): { x: number; y: number } {
  const computed = window.getComputedStyle(element);
  const text = element.value.substring(0, cursorIndex);

  const paddingLeft = parseFloat(computed.paddingLeft) || 0;
  const paddingTop = parseFloat(computed.paddingTop) || 0;
  const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
  const borderTop = parseFloat(computed.borderTopWidth) || 0;
  const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;

  const lines = text.split('\n');
  const lineNumber = lines.length - 1;
  const currentLineText = lines[lines.length - 1];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      x: borderLeft + paddingLeft,
      y: borderTop + paddingTop + lineNumber * lineHeight,
    };
  }

  ctx.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  const textWidth = ctx.measureText(currentLineText).width;

  return {
    x: borderLeft + paddingLeft + textWidth - element.scrollLeft,
    y: borderTop + paddingTop + lineNumber * lineHeight - element.scrollTop,
  };
}

export function ReferenceMention({
  isOpen,
  items,
  selectedIndex,
  anchorElement,
  cursorPosition,
  onSelect,
  onClose,
}: ReferenceMentionProps) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Position dropdown and continuously track position for panel resize
  useLayoutEffect(() => {
    if (!isOpen || !anchorElement) {
      return;
    }

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      if (rect.width === 0) return;

      const cursorOffset = getCursorOffset(anchorElement, cursorPosition);
      const dropdownHeight = dropdownRef.current?.offsetHeight ?? 200;

      // Calculate cursor position in viewport
      const cursorTop = rect.top + cursorOffset.y;
      let left = rect.left + cursorOffset.x;

      // Clamp left to screen bounds
      if (left + DROPDOWN_WIDTH > window.innerWidth - 10) {
        left = window.innerWidth - DROPDOWN_WIDTH - 10;
      }
      if (left < 10) left = 10;

      // Position above cursor if there's space, otherwise below
      let top: number;
      if (cursorTop - dropdownHeight - 4 > 10) {
        top = cursorTop - dropdownHeight - 4;
      } else {
        const computed = window.getComputedStyle(anchorElement);
        const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
        top = cursorTop + lineHeight + 4;
      }

      setPosition({ top, left });
    };

    updatePosition();

    // Continuously update position via RAF (handles panel resize)
    let rafId: number;
    const trackPosition = () => {
      updatePosition();
      rafId = requestAnimationFrame(trackPosition);
    };
    rafId = requestAnimationFrame(trackPosition);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isOpen, anchorElement, cursorPosition, items.length]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        anchorElement &&
        !anchorElement.contains(target)
      ) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, anchorElement, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const selectedElement = dropdownRef.current.querySelector('[data-selected="true"]');
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, selectedIndex]);

  if (!isOpen || !position) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="reference-mention-dropdown"
      style={{ top: position.top, left: position.left }}
    >
      {items.length === 0 ? (
        <div className="reference-mention-empty">{t('staging.referenceMention.noMatches')}</div>
      ) : (
        items.map((item, index) => (
          <div
            key={`${item.type}-${item.number}`}
            className="reference-mention-item"
            data-selected={index === selectedIndex}
            onClick={() => onSelect(item)}
          >
            {item.type === 'pr' ? (
              <GitPullRequest size={14} className="reference-mention-icon" />
            ) : (
              <CircleDot size={14} className="reference-mention-icon" />
            )}
            <span className="reference-mention-number">#{item.number}</span>
            <span className="reference-mention-title">{item.title}</span>
          </div>
        ))
      )}
    </div>,
    document.body
  );
}
