import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui';
import { useRepositoryStore } from '../../store/repositoryStore';
import { cn } from '../../lib/utils';
import type { BranchFilterType, SortOrder } from '../../types';

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
    if (branchFilter === 'all') return 'All Branches';
    if (branchFilter === 'current') return 'Current Branch';
    if (typeof branchFilter === 'object' && 'specific' in branchFilter) {
      return branchFilter.specific;
    }
    return 'All Branches';
  };

  const handleBranchFilterChange = (value: BranchFilterType) => {
    setBranchFilter(value);
  };

  const handleSortOrderChange = (value: SortOrder) => {
    setSortOrder(value);
  };

  // Get local branches for the dropdown
  const localBranches = branches.filter((b) => b.branch_type === 'local');

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
          <DropdownMenuItem onSelect={() => handleBranchFilterChange('all')}>
            {branchFilter === 'all' && <Check size={12} className="absolute left-2" />}
            All Branches
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleBranchFilterChange('current')}>
            {branchFilter === 'current' && <Check size={12} className="absolute left-2" />}
            Current Branch
          </DropdownMenuItem>
          {localBranches.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Branches</DropdownMenuLabel>
              {localBranches.map((branch) => (
                <DropdownMenuItem
                  key={branch.name}
                  onSelect={() => handleBranchFilterChange({ specific: branch.name })}
                >
                  {typeof branchFilter === 'object' &&
                    'specific' in branchFilter &&
                    branchFilter.specific === branch.name && (
                      <Check size={12} className="absolute left-2" />
                    )}
                  <span className={cn(branch.is_head && 'font-semibold')}>{branch.name}</span>
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
            <span>{sortOrder === 'date_order' ? 'Date Order' : 'Ancestor Order'}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => handleSortOrderChange('date_order')}>
            {sortOrder === 'date_order' && <Check size={12} className="absolute left-2" />}
            Date Order
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleSortOrderChange('ancestor_order')}>
            {sortOrder === 'ancestor_order' && <Check size={12} className="absolute left-2" />}
            Ancestor Order
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
