import { ChevronDown, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="dropdown-button">
            <span>{getBranchFilterLabel()}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="dropdown-content" align="start" sideOffset={4}>
            <DropdownMenu.Item
              className="dropdown-item"
              onSelect={() => handleBranchFilterChange('all')}
            >
              {branchFilter === 'all' && <Check size={12} className="absolute left-2" />}
              All Branches
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="dropdown-item"
              onSelect={() => handleBranchFilterChange('current')}
            >
              {branchFilter === 'current' && <Check size={12} className="absolute left-2" />}
              Current Branch
            </DropdownMenu.Item>
            {localBranches.length > 0 && (
              <>
                <DropdownMenu.Separator className="dropdown-separator" />
                <DropdownMenu.Label className="dropdown-label">Branches</DropdownMenu.Label>
                {localBranches.map((branch) => (
                  <DropdownMenu.Item
                    key={branch.name}
                    className="dropdown-item"
                    onSelect={() => handleBranchFilterChange({ specific: branch.name })}
                  >
                    {typeof branchFilter === 'object' &&
                      'specific' in branchFilter &&
                      branchFilter.specific === branch.name && (
                        <Check size={12} className="absolute left-2" />
                      )}
                    <span className={cn(branch.is_head && 'font-semibold')}>{branch.name}</span>
                  </DropdownMenu.Item>
                ))}
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Remote Branches Toggle */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="dropdown-button">
            <span>{includeRemotes ? 'Show Remote Branches' : 'Hide Remote Branches'}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="dropdown-content" align="start" sideOffset={4}>
            <DropdownMenu.Item className="dropdown-item" onSelect={() => setIncludeRemotes(true)}>
              {includeRemotes && <Check size={12} className="absolute left-2" />}
              Show Remote Branches
            </DropdownMenu.Item>
            <DropdownMenu.Item className="dropdown-item" onSelect={() => setIncludeRemotes(false)}>
              {!includeRemotes && <Check size={12} className="absolute left-2" />}
              Hide Remote Branches
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Sort Order Dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="dropdown-button">
            <span>{sortOrder === 'date_order' ? 'Date Order' : 'Ancestor Order'}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="dropdown-content" align="start" sideOffset={4}>
            <DropdownMenu.Item
              className="dropdown-item"
              onSelect={() => handleSortOrderChange('date_order')}
            >
              {sortOrder === 'date_order' && <Check size={12} className="absolute left-2" />}
              Date Order
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="dropdown-item"
              onSelect={() => handleSortOrderChange('ancestor_order')}
            >
              {sortOrder === 'ancestor_order' && <Check size={12} className="absolute left-2" />}
              Ancestor Order
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
