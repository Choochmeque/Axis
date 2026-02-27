import { ChevronDown } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { SortOrder as SortOrderType } from '@/types';
import { BranchFilterType, BranchType, SortOrder } from '@/types';

export function HistoryFilters() {
  const { t } = useTranslation();
  const {
    branches,
    branchFilter,
    includeRemotes,
    sortOrder,
    setBranchFilter,
    setIncludeRemotes,
    setSortOrder,
  } = useRepositoryStore();

  // Get display text for branch filter
  const getBranchFilterLabel = (): string => {
    if (branchFilter === BranchFilterType.All) return t('history.filters.allBranches');
    if (branchFilter === BranchFilterType.Current) return t('history.filters.currentBranch');
    if (typeof branchFilter === 'object' && 'Specific' in branchFilter) {
      return branchFilter.Specific;
    }
    return t('history.filters.allBranches');
  };

  const handleBranchFilterChange = (value: string) => {
    if (value === 'all') {
      setBranchFilter(BranchFilterType.All);
      return;
    }
    if (value === 'current') {
      setBranchFilter(BranchFilterType.Current);
      return;
    }
    if (value.startsWith('specific:')) {
      const name = decodeURIComponent(value.replace('specific:', ''));
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
      setBranchFilter({ Specific: name });
    }
  };

  const handleSortOrderChange = (value: string) => {
    setSortOrder(value as SortOrderType);
  };

  // Get local branches for the dropdown
  const localBranches = branches.filter((b) => b.branchType === BranchType.Local);
  const branchFilterValue =
    branchFilter === BranchFilterType.All
      ? 'all'
      : branchFilter === BranchFilterType.Current
        ? 'current'
        : typeof branchFilter === 'object' && 'Specific' in branchFilter
          ? `specific:${encodeURIComponent(branchFilter.Specific)}`
          : 'all';

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 border-b border-(--border-color) bg-(--bg-secondary)">
      {/* Branch Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="dropdown-button">
            <span>{getBranchFilterLabel()}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={branchFilterValue}
            onValueChange={handleBranchFilterChange}
          >
            <DropdownMenuRadioItem value="all">
              {t('history.filters.allBranches')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="current">
              {t('history.filters.currentBranch')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          {localBranches.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('history.filters.branches')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={branchFilterValue}
                onValueChange={handleBranchFilterChange}
              >
                {localBranches.map((branch) => (
                  <DropdownMenuRadioItem
                    key={branch.name}
                    value={`specific:${encodeURIComponent(branch.name)}`}
                  >
                    <span className={cn(branch.isHead && 'font-semibold')}>{branch.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remote Branches Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="dropdown-button">
            <span>
              {includeRemotes ? t('history.filters.showRemote') : t('history.filters.hideRemote')}
            </span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={includeRemotes ? 'show' : 'hide'}
            onValueChange={(value) => setIncludeRemotes(value === 'show')}
          >
            <DropdownMenuRadioItem value="show">
              {t('history.filters.showRemote')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="hide">
              {t('history.filters.hideRemote')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Order Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="dropdown-button">
            <span>
              {sortOrder === SortOrder.DateOrder
                ? t('history.filters.dateOrder')
                : t('history.filters.ancestorOrder')}
            </span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={sortOrder} onValueChange={handleSortOrderChange}>
            <DropdownMenuRadioItem value={SortOrder.DateOrder}>
              {t('history.filters.dateOrder')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={SortOrder.AncestorOrder}>
              {t('history.filters.ancestorOrder')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
