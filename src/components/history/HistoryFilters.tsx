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

  const dropdownButtonClass =
    'flex items-center gap-1 py-1 px-2 border border-(--border-color) bg-(--bg-secondary) text-(--text-primary) text-xs cursor-pointer rounded transition-colors hover:bg-(--bg-hover)';
  const dropdownContentClass =
    'min-w-40 max-h-80 overflow-y-auto bg-(--bg-secondary) border border-(--border-color) rounded-md p-1 shadow-lg z-50';
  const dropdownItemClass =
    'flex items-center py-1.5 px-2 pl-6 text-[13px] text-(--text-primary) rounded cursor-pointer outline-none relative hover:bg-(--bg-hover) data-[highlighted]:bg-(--bg-hover)';

  // Get local branches for the dropdown
  const localBranches = branches.filter((b) => b.branch_type === 'local');

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 border-b border-(--border-color) bg-(--bg-secondary)">
      {/* Branch Filter Dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className={dropdownButtonClass}>
            <span>{getBranchFilterLabel()}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={dropdownContentClass} align="start" sideOffset={4}>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => handleBranchFilterChange('all')}
            >
              {branchFilter === 'all' && <Check size={12} className="absolute left-2" />}
              All Branches
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => handleBranchFilterChange('current')}
            >
              {branchFilter === 'current' && <Check size={12} className="absolute left-2" />}
              Current Branch
            </DropdownMenu.Item>
            {localBranches.length > 0 && (
              <>
                <DropdownMenu.Separator className="h-px bg-(--border-color) my-1" />
                <DropdownMenu.Label className="px-2 py-1 text-[11px] text-(--text-tertiary) uppercase">
                  Branches
                </DropdownMenu.Label>
                {localBranches.map((branch) => (
                  <DropdownMenu.Item
                    key={branch.name}
                    className={dropdownItemClass}
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
          <button className={dropdownButtonClass}>
            <span>{includeRemotes ? 'Show Remote Branches' : 'Hide Remote Branches'}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={dropdownContentClass} align="start" sideOffset={4}>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => setIncludeRemotes(true)}
            >
              {includeRemotes && <Check size={12} className="absolute left-2" />}
              Show Remote Branches
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => setIncludeRemotes(false)}
            >
              {!includeRemotes && <Check size={12} className="absolute left-2" />}
              Hide Remote Branches
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Sort Order Dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className={dropdownButtonClass}>
            <span>{sortOrder === 'date_order' ? 'Date Order' : 'Ancestor Order'}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={dropdownContentClass} align="start" sideOffset={4}>
            <DropdownMenu.Item
              className={dropdownItemClass}
              onSelect={() => handleSortOrderChange('date_order')}
            >
              {sortOrder === 'date_order' && <Check size={12} className="absolute left-2" />}
              Date Order
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={dropdownItemClass}
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
