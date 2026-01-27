import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  StagingFilters,
  StagingSortBy,
  StagingShowOnly,
  StagingViewMode,
  StagingMode,
} from './StagingFilters';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

describe('StagingFilters', () => {
  const defaultProps = {
    sortBy: StagingSortBy.Path,
    showOnly: StagingShowOnly.Pending,
    viewMode: StagingViewMode.FlatSingle,
    stagingMode: StagingMode.SplitView,
    onSortByChange: vi.fn(),
    onShowOnlyChange: vi.fn(),
    onViewModeChange: vi.fn(),
    onStagingModeChange: vi.fn(),
  };

  it('should render filter buttons', () => {
    render(<StagingFilters {...defaultProps} />);

    // Should have dropdown buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should display sort label', () => {
    render(<StagingFilters {...defaultProps} />);

    // The label should be displayed
    expect(screen.getByText(/staging\.filters\.labels\.sortedBy/i)).toBeInTheDocument();
  });

  it('should have correct aria attributes on sort button', () => {
    render(<StagingFilters {...defaultProps} />);

    const sortButton = screen.getAllByRole('button')[0];
    expect(sortButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(sortButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should have view options button with title', () => {
    render(<StagingFilters {...defaultProps} />);

    const viewButton = screen.getByTitle('View options');
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('should display different label when showOnly is All', () => {
    render(<StagingFilters {...defaultProps} showOnly={StagingShowOnly.All} />);

    expect(screen.getByText(/staging\.filters\.labels\.allFiles/i)).toBeInTheDocument();
  });

  it('should display filename in label when sortBy is filename', () => {
    render(<StagingFilters {...defaultProps} sortBy={StagingSortBy.Filename} />);

    expect(screen.getByText(/name/i)).toBeInTheDocument();
  });

  it('should render with different view modes', () => {
    const { rerender } = render(
      <StagingFilters {...defaultProps} viewMode={StagingViewMode.FlatSingle} />
    );
    expect(screen.getByTitle('View options')).toBeInTheDocument();

    rerender(<StagingFilters {...defaultProps} viewMode={StagingViewMode.FlatMulti} />);
    expect(screen.getByTitle('View options')).toBeInTheDocument();

    rerender(<StagingFilters {...defaultProps} viewMode={StagingViewMode.Tree} />);
    expect(screen.getByTitle('View options')).toBeInTheDocument();
  });
});

describe('StagingSortBy enum', () => {
  it('should have all expected values', () => {
    expect(StagingSortBy.Path).toBe('path');
    expect(StagingSortBy.PathReversed).toBe('path_reversed');
    expect(StagingSortBy.Filename).toBe('filename');
    expect(StagingSortBy.FilenameReversed).toBe('filename_reversed');
    expect(StagingSortBy.Status).toBe('status');
    expect(StagingSortBy.Checked).toBe('checked');
  });
});

describe('StagingShowOnly enum', () => {
  it('should have all expected values', () => {
    expect(StagingShowOnly.Pending).toBe('pending');
    expect(StagingShowOnly.Conflicts).toBe('conflicts');
    expect(StagingShowOnly.Untracked).toBe('untracked');
    expect(StagingShowOnly.Ignored).toBe('ignored');
    expect(StagingShowOnly.Clean).toBe('clean');
    expect(StagingShowOnly.Modified).toBe('modified');
    expect(StagingShowOnly.All).toBe('all');
  });
});

describe('StagingViewMode enum', () => {
  it('should have all expected values', () => {
    expect(StagingViewMode.FlatSingle).toBe('flat_single');
    expect(StagingViewMode.FlatMulti).toBe('flat_multi');
    expect(StagingViewMode.Tree).toBe('tree');
  });
});

describe('StagingMode enum', () => {
  it('should have all expected values', () => {
    expect(StagingMode.NoStaging).toBe('no_staging');
    expect(StagingMode.Fluid).toBe('fluid');
    expect(StagingMode.SplitView).toBe('split_view');
  });
});
