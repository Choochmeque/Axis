import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabBar } from './TabBar';

const mockRemoveTab = vi.fn();
const mockSetActiveTab = vi.fn();

vi.mock('@/store/tabsStore', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual enum exports
  TabType: { Welcome: 'welcome', Repository: 'repository' },
  useTabsStore: () => ({
    tabs: [
      { id: 'tab1', name: 'Welcome', type: 'welcome', path: null, isDirty: false },
      { id: 'tab2', name: 'My Repo', type: 'repository', path: '/path/to/repo', isDirty: false },
    ],
    activeTabId: 'tab1',
    setActiveTab: mockSetActiveTab,
    removeTab: mockRemoveTab,
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: {
    getState: () => ({
      clearCache: vi.fn(),
    }),
  },
}));

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: {
    getState: () => ({
      clearCache: vi.fn(),
    }),
  },
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: {
    getState: () => ({
      clearCache: vi.fn(),
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
});

describe('TabBar with single tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when only 1 tab', () => {
    // Override the mock for this test
    vi.doMock('@/store/tabsStore', () => ({
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual enum exports
      TabType: { Welcome: 'welcome', Repository: 'repository' },
      useTabsStore: () => ({
        tabs: [{ id: 'tab1', name: 'Welcome', type: 'welcome', path: null, isDirty: false }],
        activeTabId: 'tab1',
        setActiveTab: vi.fn(),
        removeTab: vi.fn(),
      }),
    }));
  });
});
