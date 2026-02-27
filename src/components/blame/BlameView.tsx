import { useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, FileText } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';
import type { BlameLine } from '@/types';

interface BlameViewProps {
  lines: BlameLine[];
  isLoading: boolean;
  error: string | null;
  hoveredCommitOid: string | null;
  onHoverCommit: (oid: string | null) => void;
  onClickCommit?: (oid: string) => void;
}

export function BlameView({
  lines,
  isLoading,
  error,
  hoveredCommitOid,
  onHoverCommit,
  onClickCommit,
}: BlameViewProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate column widths based on content
  const maxLineNumber = lines.length;
  const lineNumberWidth = Math.max(3, String(maxLineNumber).length);

  // Track which group each line belongs to for alternating backgrounds
  const lineGroups = useMemo(() => {
    let groupIndex = 0;
    return lines.map((line, index) => {
      if (line.isGroupStart && index > 0) {
        groupIndex++;
      }
      return groupIndex;
    });
  }, [lines]);

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 22,
    overscan: 20,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-(--text-secondary)">
        <Loader2 size={20} className="animate-spin" />
        <span>{t('blame.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-(--text-secondary)">
        <FileText size={48} strokeWidth={1} />
        <p>{t('blame.errorLoading')}</p>
        <p className="text-xs text-(--text-tertiary)">{error}</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-(--text-secondary)">
        <FileText size={48} strokeWidth={1} />
        <p>{t('blame.noContent')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center py-2 shrink-0 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary)">
        <span className="shrink-0 px-2 text-right" style={{ width: `${lineNumberWidth + 2}ch` }}>
          {t('blame.header.line')}
        </span>
        <div className="shrink-0 w-64 flex items-center gap-2 px-2 border-l border-r border-(--border-color)/30">
          <span className="w-14">{t('blame.header.commit')}</span>
          <span className="flex-1">{t('blame.header.author')}</span>
          <span className="shrink-0">{t('blame.header.date')}</span>
        </div>
        <div className="flex-1 px-3">{t('blame.header.content')}</div>
      </div>

      {/* Content */}
      <div ref={parentRef} className="flex-1 overflow-auto font-mono text-sm">
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const line = lines[virtualRow.index];
            const groupIndex = lineGroups[virtualRow.index];
            const isEvenGroup = groupIndex % 2 === 0;
            const isHovered = hoveredCommitOid === line.commitOid;

            return (
              <div
                key={line.lineNumber}
                className={cn(
                  'absolute top-0 left-0 w-full flex items-stretch',
                  'border-b border-(--border-color)/30',
                  line.isGroupStart && virtualRow.index > 0 && 'border-t border-(--border-color)',
                  isHovered
                    ? 'bg-(--bg-hover)'
                    : isEvenGroup
                      ? 'bg-(--bg-primary)'
                      : 'bg-(--bg-secondary)'
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onMouseEnter={() => onHoverCommit(line.commitOid)}
                onMouseLeave={() => onHoverCommit(null)}
              >
                {/* Line number */}
                <span
                  className="shrink-0 px-2 text-right text-(--text-tertiary) select-none bg-(--bg-secondary)/50"
                  style={{ width: `${lineNumberWidth + 2}ch` }}
                >
                  {line.lineNumber}
                </span>

                {/* Commit info - only show on group start */}
                <div className="shrink-0 w-64 flex items-center gap-2 px-2 border-l border-r border-(--border-color)/30">
                  {line.isGroupStart ? (
                    <>
                      <button
                        type="button"
                        className="text-xs font-mono text-(--text-link) hover:underline cursor-pointer"
                        onClick={() => onClickCommit?.(line.commitOid)}
                      >
                        {line.shortOid}
                      </button>
                      <span className="text-xs text-(--text-secondary) truncate flex-1">
                        {line.author}
                      </span>
                      <span className="text-xs text-(--text-tertiary) shrink-0">
                        {formatRelativeTime(line.timestamp)}
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Content */}
                <div className="flex-1 px-3 overflow-hidden">
                  <code className="whitespace-pre">{line.content}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
