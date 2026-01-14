import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui';
import { useRepositoryStore } from '@/store/repositoryStore';
import { cn } from '@/lib/utils';
import { BranchFilterType, BranchType, SortOrder } from '@/types';
import type { BranchFilterType as BranchFilterTypeType, SortOrder as SortOrderType } from '@/types';

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

  const handleBranchFilterChange = (value: BranchFilterTypeType) => {
    setBranchFilter(value);
  };

  const handleSortOrderChange = (value: SortOrderType) => {
    setSortOrder(value);
  };

  // Get local branches for the dropdown
  const localBranches = branches.filter((b) => b.branchType === BranchType.Local);

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
          <DropdownMenuItem onSelect={() => handleBranchFilterChange(BranchFilterType.All)}>
            {branchFilter === BranchFilterType.All && (
              <Check size={12} className="absolute left-2" />
            )}
            All Branches
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleBranchFilterChange(BranchFilterType.Current)}>
            {branchFilter === BranchFilterType.Current && (
              <Check size={12} className="absolute left-2" />
            )}
            Current Branch
          </DropdownMenuItem>
          {localBranches.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Branches</DropdownMenuLabel>
              {localBranches.map((branch) => (
                <DropdownMenuItem
                  key={branch.name}
                  onSelect={() => handleBranchFilterChange({ Specific: branch.name })}
                >
                  {typeof branchFilter === 'object' &&
                    'Specific' in branchFilter &&
                    branchFilter.Specific === branch.name && (
                      <Check size={12} className="absolute left-2" />
                    )}
                  <span className={cn(branch.isHead && 'font-semibold')}>{branch.name}</span>
                </DropdownMenuItem>
              ))}
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
          <DropdownMenuItem onSelect={() => setIncludeRemotes(true)}>
            {includeRemotes && <Check size={12} className="absolute left-2" />}
            Show Remote Branches
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIncludeRemotes(false)}>
            {!includeRemotes && <Check size={12} className="absolute left-2" />}
            Hide Remote Branches
          </DropdownMenuItem>
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
          <DropdownMenuItem onSelect={() => handleSortOrderChange(SortOrder.DateOrder)}>
            {sortOrder === SortOrder.DateOrder && <Check size={12} className="absolute left-2" />}
            Date Order
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleSortOrderChange(SortOrder.AncestorOrder)}>
            {sortOrder === SortOrder.AncestorOrder && (
              <Check size={12} className="absolute left-2" />
            )}
            Ancestor Order
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
