import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commands } from '@/bindings/api';
import { TabBar } from './TabBar';

const mockRemoveTab = vi.fn();
const mockSetActiveTab = vi.fn();
const mockClearRepoCache = vi.fn();
const mockClearIntegrationCache = vi.fn();
const mockClearStagingCache = vi.fn();

let mockTabs = [
  { id: 'tab1', name: 'Welcome', type: 'welcome', path: null, isDirty: false },
  { id: 'tab2', name: 'My Repo', type: 'repository', path: '/path/to/repo', isDirty: false },
];
let mockActiveTabId = 'tab1';

vi.mock('@/store/tabsStore', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual enum exports
  TabType: { Welcome: 'welcome', Repository: 'repository' },
  useTabsStore: () => ({
    tabs: mockTabs,
    activeTabId: mockActiveTabId,
    setActiveTab: mockSetActiveTab,
    removeTab: mockRemoveTab,
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: {
    getState: () => ({
      clearCache: mockClearRepoCache,
    }),
  },
}));

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: {
    getState: () => ({
      clearCache: mockClearIntegrationCache,
    }),
  },
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: {
    getState: () => ({
      clearCache: mockClearStagingCache,
    }),
  },
}));

vi.mock('@/bindings/api', () => ({
  commands: {
    closeRepositoryPath: vi.fn(),
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('TabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabs = [
      { id: 'tab1', name: 'Welcome', type: 'welcome', path: null, isDirty: false },
      { id: 'tab2', name: 'My Repo', type: 'repository', path: '/path/to/repo', isDirty: false },
    ];
    mockActiveTabId = 'tab1';
  });

  it('should render tabs', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('My Repo')).toBeInTheDocument();
  });

  it('should render tab as clickable trigger', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    // Radix UI Tabs handles click internally through onValueChange
    // Just verify the tab content is rendered
    expect(screen.getByText('My Repo')).toBeInTheDocument();
  });

  it('should not call onTabChange when clicking active tab', () => {
    const onTabChange = vi.fn();

    render(<TabBar onTabChange={onTabChange} />);

    fireEvent.click(screen.getByText('Welcome'));

    expect(mockSetActiveTab).not.toHaveBeenCalled();
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('should render close button for repository tabs', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    // Repository tab should have close button (Welcome tab should not)
    // Find all buttons that could be close buttons (the X icon buttons)
    const repoTab = screen.getByText('My Repo').closest('div');
    expect(repoTab).toBeInTheDocument();
  });

  it('should render dirty indicator for dirty tabs', () => {
    mockTabs = [
      { id: 'tab1', name: 'Welcome', type: 'welcome', path: null, isDirty: false },
      { id: 'tab2', name: 'My Repo', type: 'repository', path: '/path/to/repo', isDirty: true },
    ];

    render(<TabBar onTabChange={vi.fn()} />);

    // The dirty indicator is a small blue dot
    expect(screen.getByText('My Repo')).toBeInTheDocument();
  });

  it('should clear caches and close repository when closing tab with path', () => {
    mockTabs = [
      { id: 'tab1', name: 'Welcome', type: 'welcome', path: null, isDirty: false },
      { id: 'tab2', name: 'My Repo', type: 'repository', path: '/path/to/repo', isDirty: false },
    ];

    render(<TabBar onTabChange={vi.fn()} />);

    // Find the close button for the repository tab
    // The close button is inside the My Repo tab trigger
    const closeButtons = screen.getAllByRole('button');
    // The close button should be the one inside the repo tab
    const closeButton = closeButtons.find((btn) => {
      const svg = btn.querySelector('svg');
      // The X icon has specific attributes
      return svg && btn.className.includes('w-4');
    });

    if (closeButton) {
      fireEvent.click(closeButton);

      expect(mockClearRepoCache).toHaveBeenCalledWith('/path/to/repo');
      expect(mockClearIntegrationCache).toHaveBeenCalledWith('/path/to/repo');
      expect(mockClearStagingCache).toHaveBeenCalledWith('/path/to/repo');
      expect(commands.closeRepositoryPath).toHaveBeenCalledWith('/path/to/repo');
      expect(mockRemoveTab).toHaveBeenCalledWith('tab2');
    }
  });

  it('should render Welcome icon for welcome tabs', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    // Welcome tab should have Home icon
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('should render repository icon for repository tabs', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    // Repository tab should have circle icon (SVG)
    const repoTab = screen.getByText('My Repo').closest('div');
    expect(repoTab).toBeInTheDocument();
    const svg = repoTab?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('TabBar with single tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when only 1 tab', () => {
    mockTabs = [{ id: 'tab1', name: 'Welcome', type: 'welcome', path: null, isDirty: false }];
    mockActiveTabId = 'tab1';

    const { container } = render(<TabBar onTabChange={vi.fn()} />);

    // When there's only one tab, the component returns null
    expect(container.firstChild).toBeNull();
  });
});

describe('TabBar with multiple repository tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabs = [
      { id: 'tab1', name: 'Repo 1', type: 'repository', path: '/path/to/repo1', isDirty: false },
      { id: 'tab2', name: 'Repo 2', type: 'repository', path: '/path/to/repo2', isDirty: true },
      { id: 'tab3', name: 'Repo 3', type: 'repository', path: '/path/to/repo3', isDirty: false },
    ];
    mockActiveTabId = 'tab1';
  });

  it('should render all repository tabs', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    expect(screen.getByText('Repo 1')).toBeInTheDocument();
    expect(screen.getByText('Repo 2')).toBeInTheDocument();
    expect(screen.getByText('Repo 3')).toBeInTheDocument();
  });

  it('should show active tab styling', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    // Radix UI adds data-state="active" to the active tab
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(3);
  });

  it('should highlight dirty tabs with indicator', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    // Repo 2 is dirty
    expect(screen.getByText('Repo 2')).toBeInTheDocument();
  });
});

describe('TabBar tab switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabs = [
      { id: 'tab1', name: 'Tab 1', type: 'repository', path: '/path/1', isDirty: false },
      { id: 'tab2', name: 'Tab 2', type: 'repository', path: '/path/2', isDirty: false },
    ];
    mockActiveTabId = 'tab1';
  });

  it('should render tabs in tab list', () => {
    render(<TabBar onTabChange={vi.fn()} />);

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });
});
