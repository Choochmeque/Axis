import { ChevronDown, ChevronRight, GitCommit } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import type { Commit } from '@/types';

interface CommitCompareListProps {
  aheadCommits: Commit[];
  behindCommits: Commit[];
  selectedCommit: Commit | null;
  onSelectCommit: (commit: Commit) => void;
  isLoading?: boolean;
}

const listClass = 'flex flex-col h-full min-h-0 overflow-hidden bg-(--bg-primary)';
const headerClass =
  'flex items-center gap-2 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary) shrink-0';

export function CommitCompareList({
  aheadCommits,
  behindCommits,
  selectedCommit,
  onSelectCommit,
  isLoading = false,
}: CommitCompareListProps) {
  const [aheadExpanded, setAheadExpanded] = useState(true);
  const [behindExpanded, setBehindExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className={listClass}>
        <div className={headerClass}>
          <span className="flex-1">Commits</span>
        </div>
        <div className="p-6 text-center text-(--text-secondary) text-base">Loading...</div>
      </div>
    );
  }

  const totalCommits = aheadCommits.length + behindCommits.length;

  if (totalCommits === 0) {
    return (
      <div className={listClass}>
        <div className={headerClass}>
          <span className="flex-1">Commits</span>
        </div>
        <div className="p-6 text-center text-(--text-secondary) text-base">
          Branches are identical
        </div>
      </div>
    );
  }

  return (
    <div className={listClass}>
      <div className={headerClass}>
        <span className="flex-1">Commits</span>
        <span className="badge text-sm font-normal">{totalCommits}</span>
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {aheadCommits.length > 0 && (
          <CommitSection
            title="Ahead"
            count={aheadCommits.length}
            commits={aheadCommits}
            expanded={aheadExpanded}
            onToggle={() => setAheadExpanded(!aheadExpanded)}
            selectedCommit={selectedCommit}
            onSelectCommit={onSelectCommit}
            variant="ahead"
          />
        )}
        {behindCommits.length > 0 && (
          <CommitSection
            title="Behind"
            count={behindCommits.length}
            commits={behindCommits}
            expanded={behindExpanded}
            onToggle={() => setBehindExpanded(!behindExpanded)}
            selectedCommit={selectedCommit}
            onSelectCommit={onSelectCommit}
            variant="behind"
          />
        )}
      </div>
    </div>
  );
}

interface CommitSectionProps {
  title: string;
  count: number;
  commits: Commit[];
  expanded: boolean;
  onToggle: () => void;
  selectedCommit: Commit | null;
  onSelectCommit: (commit: Commit) => void;
  variant: 'ahead' | 'behind';
}

function CommitSection({
  title,
  count,
  commits,
  expanded,
  onToggle,
  selectedCommit,
  onSelectCommit,
  variant,
}: CommitSectionProps) {
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="flex flex-col">
      <button
        className={cn(
          'flex items-center gap-2 py-2 px-3 bg-(--bg-secondary) border-b border-(--border-color) cursor-pointer hover:bg-(--bg-hover) transition-colors text-left w-full',
          variant === 'ahead' && 'border-l-2 border-l-success',
          variant === 'behind' && 'border-l-2 border-l-warning'
        )}
        onClick={onToggle}
      >
        <ChevronIcon size={14} className="text-(--text-secondary) shrink-0" />
        <span className="flex-1 text-sm font-medium text-(--text-primary)">{title}</span>
        <span
          className={cn(
            'badge text-xs',
            variant === 'ahead' && 'bg-success/15 text-success',
            variant === 'behind' && 'bg-warning/15 text-warning'
          )}
        >
          {count}
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col">
          {commits.map((commit) => (
            <CommitItem
              key={commit.oid}
              commit={commit}
              isSelected={selectedCommit?.oid === commit.oid}
              onSelect={() => onSelectCommit(commit)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommitItemProps {
  commit: Commit;
  isSelected: boolean;
  onSelect: () => void;
}

function CommitItem({ commit, isSelected, onSelect }: CommitItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 py-2 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)',
        isSelected && 'bg-(--bg-active)'
      )}
      onClick={onSelect}
    >
      <GitCommit size={14} className="text-(--text-tertiary) shrink-0 mt-0.5" />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm text-(--text-primary) whitespace-nowrap overflow-hidden text-ellipsis">
          {commit.summary}
        </span>
        <div className="flex items-center gap-2 text-xs text-(--text-tertiary)">
          <span className="font-mono">{commit.shortOid}</span>
          <span>•</span>
          <Avatar
            email={commit.author.email}
            sha={commit.oid}
            name={commit.author.name}
            size={14}
          />
          <span>{commit.author.name}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(commit.timestamp), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}
