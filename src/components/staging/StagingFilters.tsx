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

export type StagingSortBy =
  | 'path'
  | 'path_reversed'
  | 'filename'
  | 'filename_reversed'
  | 'status'
  | 'checked';

export type StagingShowOnly =
  | 'pending'
  | 'conflicts'
  | 'untracked'
  | 'ignored'
  | 'clean'
  | 'modified'
  | 'all';

export type StagingViewMode = 'flat_single' | 'flat_multi' | 'tree';

export type StagingMode = 'no_staging' | 'fluid' | 'split_view';

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
  path: 'Path alphabetically',
  path_reversed: 'Path alphabetically (reversed)',
  filename: 'File name alphabetically',
  filename_reversed: 'File name alphabetically (reversed)',
  status: 'File status',
  checked: 'Checked / unchecked',
};

const showOnlyLabels: Record<StagingShowOnly, string> = {
  pending: 'Pending',
  conflicts: 'Conflicts',
  untracked: 'Untracked',
  ignored: 'Ignored',
  clean: 'Clean',
  modified: 'Modified',
  all: 'All files',
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
  // Get display text for sort dropdown
  const getSortLabel = (): string => {
    const showOnlyText = showOnly === 'all' ? 'All files' : showOnlyLabels[showOnly];
    const sortByText =
      sortBy === 'path' ? 'path' : sortBy === 'filename' ? 'name' : sortByLabels[sortBy];
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
          {(Object.keys(showOnlyLabels) as StagingShowOnly[]).map((option) => (
            <DropdownMenuItem key={option} onSelect={() => onShowOnlyChange(option)}>
              {showOnly === option && <Check size={12} className="absolute left-2" />}
              {showOnlyLabels[option]}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Sort By Section */}
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          {(Object.keys(sortByLabels) as StagingSortBy[]).map((option) => (
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
            {viewMode === 'flat_single' && <List size={14} />}
            {viewMode === 'flat_multi' && <Columns2 size={14} />}
            {viewMode === 'tree' && <ListTree size={14} />}
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {/* View Mode Section */}
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onViewModeChange('flat_single')}>
            {viewMode === 'flat_single' && <Check size={12} className="absolute left-2" />}
            <List size={14} className="mr-2" />
            Flat list (single column)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onViewModeChange('flat_multi')}>
            {viewMode === 'flat_multi' && <Check size={12} className="absolute left-2" />}
            <Columns2 size={14} className="mr-2" />
            Flat list (multiple columns)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onViewModeChange('tree')}>
            {viewMode === 'tree' && <Check size={12} className="absolute left-2" />}
            <ListTree size={14} className="mr-2" />
            Tree view
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Staging Mode Section */}
          <DropdownMenuLabel>Staging</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onStagingModeChange('no_staging')}>
            {stagingMode === 'no_staging' && <Check size={12} className="absolute left-2" />}
            <Square size={14} className="mr-2" />
            No staging
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onStagingModeChange('fluid')}>
            {stagingMode === 'fluid' && <Check size={12} className="absolute left-2" />}
            <Rows3 size={14} className="mr-2" />
            Fluid staging
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onStagingModeChange('split_view')}>
            {stagingMode === 'split_view' && <Check size={12} className="absolute left-2" />}
            <LayoutPanelTop size={14} className="mr-2" />
            Split view staging
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
