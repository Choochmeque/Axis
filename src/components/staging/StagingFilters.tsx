import { ChevronDown, List, Columns2, ListTree, Square, Rows3, LayoutPanelTop } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
          <DropdownMenuRadioGroup
            value={showOnly}
            onValueChange={(value) => onShowOnlyChange(value as StagingShowOnly)}
          >
            {showOnlyOptions.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {showOnlyLabels[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          {/* Sort By Section */}
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(value) => onSortByChange(value as StagingSortBy)}
          >
            {sortByOptions.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {sortByLabels[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
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
          <DropdownMenuRadioGroup
            value={viewMode}
            onValueChange={(value) => onViewModeChange(value as StagingViewMode)}
          >
            <DropdownMenuRadioItem value={StagingViewMode.FlatSingle}>
              <List size={14} className="mr-2" />
              Flat list (single column)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={StagingViewMode.FlatMulti}>
              <Columns2 size={14} className="mr-2" />
              Flat list (multiple columns)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={StagingViewMode.Tree}>
              <ListTree size={14} className="mr-2" />
              Tree view
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          {/* Staging Mode Section */}
          <DropdownMenuLabel>Staging</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={stagingMode}
            onValueChange={(value) => onStagingModeChange(value as StagingMode)}
          >
            <DropdownMenuRadioItem value={StagingMode.NoStaging}>
              <Square size={14} className="mr-2" />
              No staging
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={StagingMode.Fluid}>
              <Rows3 size={14} className="mr-2" />
              Fluid staging
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={StagingMode.SplitView}>
              <LayoutPanelTop size={14} className="mr-2" />
              Split view staging
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
