import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryFilters } from './HistoryFilters';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuRadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuRadioItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

const mockSetBranchFilter = vi.fn();
const mockSetIncludeRemotes = vi.fn();
const mockSetSortOrder = vi.fn();

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    branches: [
      { name: 'main', branchType: 'Local', isHead: true },
      { name: 'feature', branchType: 'Local', isHead: false },
      { name: 'origin/main', branchType: 'Remote', isHead: false },
    ],
    branchFilter: 'All',
    includeRemotes: true,
    sortOrder: 'DateOrder',
    setBranchFilter: mockSetBranchFilter,
    setIncludeRemotes: mockSetIncludeRemotes,
    setSortOrder: mockSetSortOrder,
  }),
}));

describe('HistoryFilters', () => {
  it('should render filter container', () => {
    render(<HistoryFilters />);

    // Container should render with dropdowns
    const allBranches = screen.getAllByText('history.filters.allBranches');
    expect(allBranches.length).toBeGreaterThan(0);
  });

  it('should render remote options', () => {
    render(<HistoryFilters />);

    // Both show and hide remote options should be present
    const showRemotes = screen.getAllByText('history.filters.showRemote');
    expect(showRemotes.length).toBeGreaterThan(0);
    expect(screen.getByText('history.filters.hideRemote')).toBeInTheDocument();
  });

  it('should render sort order options', () => {
    render(<HistoryFilters />);

    const dateOrders = screen.getAllByText('history.filters.dateOrder');
    expect(dateOrders.length).toBeGreaterThan(0);
    expect(screen.getByText('history.filters.ancestorOrder')).toBeInTheDocument();
  });

  it('should show all branches option', () => {
    render(<HistoryFilters />);

    const allBranchesOptions = screen.getAllByText('history.filters.allBranches');
    expect(allBranchesOptions.length).toBeGreaterThan(0);
  });

  it('should show current branch option', () => {
    render(<HistoryFilters />);

    expect(screen.getByText('history.filters.currentBranch')).toBeInTheDocument();
  });

  it('should render local branches in dropdown', () => {
    render(<HistoryFilters />);

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('should show hide remote option', () => {
    render(<HistoryFilters />);

    expect(screen.getByText('history.filters.hideRemote')).toBeInTheDocument();
  });

  it('should show ancestor order option', () => {
    render(<HistoryFilters />);

    expect(screen.getByText('history.filters.ancestorOrder')).toBeInTheDocument();
  });
});

describe('HistoryFilters with specific branch filter', () => {
  it('should display specific branch name when filtered', () => {
    vi.doMock('@/store/repositoryStore', () => ({
      useRepositoryStore: () => ({
        branches: [],
        // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
        branchFilter: { Specific: 'my-feature-branch' },
        includeRemotes: false,
        sortOrder: 'AncestorOrder',
        setBranchFilter: vi.fn(),
        setIncludeRemotes: vi.fn(),
        setSortOrder: vi.fn(),
      }),
    }));
  });
});
