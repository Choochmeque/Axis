import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui';
import { useRepositoryStore } from '@/store/repositoryStore';
import { cn } from '@/lib/utils';
import { BranchFilterType, BranchType, SortOrder } from '@/types';
import type { SortOrder as SortOrderType } from '@/types';

export function HistoryFilters() {
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
    if (branchFilter === BranchFilterType.All) return 'All Branches';
    if (branchFilter === BranchFilterType.Current) return 'Current Branch';
    if (typeof branchFilter === 'object' && 'Specific' in branchFilter) {
      return branchFilter.Specific;
    }
    return 'All Branches';
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
            <DropdownMenuRadioItem value="all">All Branches</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="current">Current Branch</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          {localBranches.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Branches</DropdownMenuLabel>
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
            <span>{includeRemotes ? 'Show Remote Branches' : 'Hide Remote Branches'}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={includeRemotes ? 'show' : 'hide'}
            onValueChange={(value) => setIncludeRemotes(value === 'show')}
          >
            <DropdownMenuRadioItem value="show">Show Remote Branches</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="hide">Hide Remote Branches</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Order Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="dropdown-button">
            <span>{sortOrder === SortOrder.DateOrder ? 'Date Order' : 'Ancestor Order'}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={sortOrder} onValueChange={handleSortOrderChange}>
            <DropdownMenuRadioItem value={SortOrder.DateOrder}>Date Order</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={SortOrder.AncestorOrder}>
              Ancestor Order
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
