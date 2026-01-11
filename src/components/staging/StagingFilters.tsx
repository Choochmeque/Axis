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
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

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
  const dropdownButtonClass =
    'flex items-center gap-1 py-1 px-2 border border-(--border-color) bg-(--bg-secondary) text-(--text-primary) text-xs cursor-pointer rounded transition-colors hover:bg-(--bg-hover)';
  const dropdownContentClass =
    'min-w-48 max-h-80 overflow-y-auto bg-(--bg-secondary) border border-(--border-color) rounded-md p-1 shadow-lg z-50';
  const dropdownItemClass =
    'flex items-center py-1.5 px-2 pl-6 text-[13px] text-(--text-primary) rounded cursor-pointer outline-none relative hover:bg-(--bg-hover) data-[highlighted]:bg-(--bg-hover)';
  const dropdownLabelClass = 'px-2 py-1 text-[11px] text-(--text-tertiary) uppercase';
  const dropdownSeparatorClass = 'h-px bg-(--border-color) my-1';

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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className={dropdownButtonClass}>
            <span>{getSortLabel()}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={dropdownContentClass} align="start" sideOffset={4}>
            {/* Show Only Section */}
            <DropdownMenu.Label className={dropdownLabelClass}>Show only</DropdownMenu.Label>
            {(Object.keys(showOnlyLabels) as StagingShowOnly[]).map((option) => (
              <DropdownMenu.Item
                key={option}
                className={dropdownItemClass}
                onSelect={() => onShowOnlyChange(option)}
              >
                {showOnly === option && <Check size={12} className="absolute left-2" />}
                {showOnlyLabels[option]}
              </DropdownMenu.Item>
            ))}

            <DropdownMenu.Separator className={dropdownSeparatorClass} />

            {/* Sort By Section */}
            <DropdownMenu.Label className={dropdownLabelClass}>Sort by</DropdownMenu.Label>
            {(Object.keys(sortByLabels) as StagingSortBy[]).map((option) => (
              <DropdownMenu.Item
                key={option}
                className={dropdownItemClass}
                onSelect={() => onSortByChange(option)}
              >
                {sortBy === option && <Check size={12} className="absolute left-2" />}
                {sortByLabels[option]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* View Options Dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className={dropdownButtonClass} title="View options">
            {viewMode === 'flat_single' && <List size={14} />}
            {viewMode === 'flat_multi' && <Columns2 size={14} />}
            {viewMode === 'tree' && <ListTree size={14} />}
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={dropdownContentClass} align="start" sideOffset={4}>
            {/* View Mode Section */}
            <DropdownMenu.Label className={dropdownLabelClass}>View</DropdownMenu.Label>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => onViewModeChange('flat_single')}
            >
              {viewMode === 'flat_single' && <Check size={12} className="absolute left-2" />}
              <List size={14} className="mr-2" />
              Flat list (single column)
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => onViewModeChange('flat_multi')}
            >
              {viewMode === 'flat_multi' && <Check size={12} className="absolute left-2" />}
              <Columns2 size={14} className="mr-2" />
              Flat list (multiple columns)
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => onViewModeChange('tree')}
            >
              {viewMode === 'tree' && <Check size={12} className="absolute left-2" />}
              <ListTree size={14} className="mr-2" />
              Tree view
            </DropdownMenu.Item>

            <DropdownMenu.Separator className={dropdownSeparatorClass} />

            {/* Staging Mode Section */}
            <DropdownMenu.Label className={dropdownLabelClass}>Staging</DropdownMenu.Label>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => onStagingModeChange('no_staging')}
            >
              {stagingMode === 'no_staging' && <Check size={12} className="absolute left-2" />}
              <Square size={14} className="mr-2" />
              No staging
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => onStagingModeChange('fluid')}
            >
              {stagingMode === 'fluid' && <Check size={12} className="absolute left-2" />}
              <Rows3 size={14} className="mr-2" />
              Fluid staging
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => onStagingModeChange('split_view')}
            >
              {stagingMode === 'split_view' && <Check size={12} className="absolute left-2" />}
              <LayoutPanelTop size={14} className="mr-2" />
              Split view staging
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
