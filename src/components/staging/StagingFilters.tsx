import { ChevronDown, Columns2, LayoutPanelTop, List, ListTree, Rows3, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

const sortByKeys: Record<StagingSortBy, string> = {
  [StagingSortBy.Path]: 'staging.filters.sortBy.path',
  [StagingSortBy.PathReversed]: 'staging.filters.sortBy.pathReversed',
  [StagingSortBy.Filename]: 'staging.filters.sortBy.filename',
  [StagingSortBy.FilenameReversed]: 'staging.filters.sortBy.filenameReversed',
  [StagingSortBy.Status]: 'staging.filters.sortBy.status',
  [StagingSortBy.Checked]: 'staging.filters.sortBy.checked',
};

const showOnlyKeys: Record<StagingShowOnly, string> = {
  [StagingShowOnly.Pending]: 'staging.filters.showOnly.pending',
  [StagingShowOnly.Conflicts]: 'staging.filters.showOnly.conflicts',
  [StagingShowOnly.Untracked]: 'staging.filters.showOnly.untracked',
  [StagingShowOnly.Ignored]: 'staging.filters.showOnly.ignored',
  [StagingShowOnly.Clean]: 'staging.filters.showOnly.clean',
  [StagingShowOnly.Modified]: 'staging.filters.showOnly.modified',
  [StagingShowOnly.All]: 'staging.filters.showOnly.all',
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
  const { t } = useTranslation();
  const showOnlyOptions = Object.values(StagingShowOnly) as StagingShowOnly[];
  const sortByOptions = Object.values(StagingSortBy) as StagingSortBy[];

  // Get display text for sort dropdown
  const getSortLabel = (): string => {
    const showOnlyText =
      showOnly === StagingShowOnly.All
        ? t('staging.filters.labels.allFiles')
        : t(showOnlyKeys[showOnly]);
    const sortByText =
      sortBy === StagingSortBy.Path
        ? 'path'
        : sortBy === StagingSortBy.Filename
          ? 'name'
          : t(sortByKeys[sortBy]);
    return t('staging.filters.labels.sortedBy', { showOnly: showOnlyText, sortBy: sortByText });
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
          <DropdownMenuLabel>{t('staging.filters.labels.showOnly')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={showOnly}
            onValueChange={(value) => onShowOnlyChange(value as StagingShowOnly)}
          >
            {showOnlyOptions.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {t(showOnlyKeys[option])}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          {/* Sort By Section */}
          <DropdownMenuLabel>{t('staging.filters.labels.sortBy')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(value) => onSortByChange(value as StagingSortBy)}
          >
            {sortByOptions.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {t(sortByKeys[option])}
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
          <DropdownMenuLabel>{t('staging.filters.labels.view')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={viewMode}
            onValueChange={(value) => onViewModeChange(value as StagingViewMode)}
          >
            <DropdownMenuRadioItem value={StagingViewMode.FlatSingle}>
              <List size={14} className="mr-2" />
              {t('staging.filters.viewMode.flatSingle')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={StagingViewMode.FlatMulti}>
              <Columns2 size={14} className="mr-2" />
              {t('staging.filters.viewMode.flatMulti')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={StagingViewMode.Tree}>
              <ListTree size={14} className="mr-2" />
              {t('staging.filters.viewMode.tree')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          {/* Staging Mode Section */}
          <DropdownMenuLabel>{t('staging.filters.labels.staging')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={stagingMode}
            onValueChange={(value) => onStagingModeChange(value as StagingMode)}
          >
            <DropdownMenuRadioItem value={StagingMode.NoStaging}>
              <Square size={14} className="mr-2" />
              {t('staging.filters.stagingMode.noStaging')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={StagingMode.Fluid}>
              <Rows3 size={14} className="mr-2" />
              {t('staging.filters.stagingMode.fluid')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={StagingMode.SplitView}>
              <LayoutPanelTop size={14} className="mr-2" />
              {t('staging.filters.stagingMode.splitView')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
