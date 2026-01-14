import {
  ChevronDown,
  Check,
  List,
  Columns2,
  ListTree,
  Square,
  Rows3,
  LayoutPanelTop,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui';

/* eslint-disable @typescript-eslint/naming-convention */
export const StagingSortBy = {
  Path: 'path',
  PathReversed: 'path_reversed',
  Filename: 'filename',
  FilenameReversed: 'filename_reversed',
  Status: 'status',
  Checked: 'checked',
} as const;

export type StagingSortBy = (typeof StagingSortBy)[keyof typeof StagingSortBy];

export const StagingShowOnly = {
  Pending: 'pending',
  Conflicts: 'conflicts',
  Untracked: 'untracked',
  Ignored: 'ignored',
  Clean: 'clean',
  Modified: 'modified',
  All: 'all',
} as const;

export type StagingShowOnly = (typeof StagingShowOnly)[keyof typeof StagingShowOnly];

export const StagingViewMode = {
  FlatSingle: 'flat_single',
  FlatMulti: 'flat_multi',
  Tree: 'tree',
} as const;

export type StagingViewMode = (typeof StagingViewMode)[keyof typeof StagingViewMode];

export const StagingMode = {
  NoStaging: 'no_staging',
  Fluid: 'fluid',
  SplitView: 'split_view',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type StagingMode = (typeof StagingMode)[keyof typeof StagingMode];

interface StagingFiltersProps {
  sortBy: StagingSortBy;
  showOnly: StagingShowOnly;
  viewMode: StagingViewMode;
  stagingMode: StagingMode;
  onSortByChange: (sortBy: StagingSortBy) => void;
  onShowOnlyChange: (showOnly: StagingShowOnly) => void;
  onViewModeChange: (viewMode: StagingViewMode) => void;
  onStagingModeChange: (stagingMode: StagingMode) => void;
}

const sortByLabels: Record<StagingSortBy, string> = {
  [StagingSortBy.Path]: 'Path alphabetically',
  [StagingSortBy.PathReversed]: 'Path alphabetically (reversed)',
  [StagingSortBy.Filename]: 'File name alphabetically',
  [StagingSortBy.FilenameReversed]: 'File name alphabetically (reversed)',
  [StagingSortBy.Status]: 'File status',
  [StagingSortBy.Checked]: 'Checked / unchecked',
};

const showOnlyLabels: Record<StagingShowOnly, string> = {
  [StagingShowOnly.Pending]: 'Pending',
  [StagingShowOnly.Conflicts]: 'Conflicts',
  [StagingShowOnly.Untracked]: 'Untracked',
  [StagingShowOnly.Ignored]: 'Ignored',
  [StagingShowOnly.Clean]: 'Clean',
  [StagingShowOnly.Modified]: 'Modified',
  [StagingShowOnly.All]: 'All files',
};

export function StagingFilters({
  sortBy,
  showOnly,
  viewMode,
  stagingMode,
  onSortByChange,
  onShowOnlyChange,
  onViewModeChange,
  onStagingModeChange,
}: StagingFiltersProps) {
  const showOnlyOptions = Object.values(StagingShowOnly) as StagingShowOnly[];
  const sortByOptions = Object.values(StagingSortBy) as StagingSortBy[];

  // Get display text for sort dropdown
  const getSortLabel = (): string => {
    const showOnlyText = showOnly === StagingShowOnly.All ? 'All files' : showOnlyLabels[showOnly];
    const sortByText =
      sortBy === StagingSortBy.Path
        ? 'path'
        : sortBy === StagingSortBy.Filename
          ? 'name'
          : sortByLabels[sortBy];
    return `${showOnlyText}, sorted by ${sortByText}`;
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 border-b border-(--border-color) bg-(--bg-secondary)">
      {/* Sort & Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="dropdown-button">
            <span>{getSortLabel()}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {/* Show Only Section */}
          <DropdownMenuLabel>Show only</DropdownMenuLabel>
          {showOnlyOptions.map((option) => (
            <DropdownMenuItem key={option} onSelect={() => onShowOnlyChange(option)}>
              {showOnly === option && <Check size={12} className="absolute left-2" />}
              {showOnlyLabels[option]}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Sort By Section */}
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          {sortByOptions.map((option) => (
            <DropdownMenuItem key={option} onSelect={() => onSortByChange(option)}>
              {sortBy === option && <Check size={12} className="absolute left-2" />}
              {sortByLabels[option]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="dropdown-button" title="View options">
            {viewMode === StagingViewMode.FlatSingle && <List size={14} />}
            {viewMode === StagingViewMode.FlatMulti && <Columns2 size={14} />}
            {viewMode === StagingViewMode.Tree && <ListTree size={14} />}
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {/* View Mode Section */}
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onViewModeChange(StagingViewMode.FlatSingle)}>
            {viewMode === StagingViewMode.FlatSingle && (
              <Check size={12} className="absolute left-2" />
            )}
            <List size={14} className="mr-2" />
            Flat list (single column)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onViewModeChange(StagingViewMode.FlatMulti)}>
            {viewMode === StagingViewMode.FlatMulti && (
              <Check size={12} className="absolute left-2" />
            )}
            <Columns2 size={14} className="mr-2" />
            Flat list (multiple columns)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onViewModeChange(StagingViewMode.Tree)}>
            {viewMode === StagingViewMode.Tree && <Check size={12} className="absolute left-2" />}
            <ListTree size={14} className="mr-2" />
            Tree view
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Staging Mode Section */}
          <DropdownMenuLabel>Staging</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onStagingModeChange(StagingMode.NoStaging)}>
            {stagingMode === StagingMode.NoStaging && (
              <Check size={12} className="absolute left-2" />
            )}
            <Square size={14} className="mr-2" />
            No staging
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onStagingModeChange(StagingMode.Fluid)}>
            {stagingMode === StagingMode.Fluid && <Check size={12} className="absolute left-2" />}
            <Rows3 size={14} className="mr-2" />
            Fluid staging
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onStagingModeChange(StagingMode.SplitView)}>
            {stagingMode === StagingMode.SplitView && (
              <Check size={12} className="absolute left-2" />
            )}
            <LayoutPanelTop size={14} className="mr-2" />
            Split view staging
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
