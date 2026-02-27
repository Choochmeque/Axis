import { render } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphCommit } from '@/types';
import {
  buildCommitLookup,
  CommitGraph,
  defaultGraphConfig,
  defaultMuteConfig,
} from './CommitGraph';

// Mock the Graph class
const mockRender = vi.fn();
const mockGetSvg = vi.fn(() => document.createElement('svg'));

vi.mock('@/lib/graph', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual exports
  Graph: vi.fn().mockImplementation(() => ({
    loadCommits: vi.fn(),
    render: mockRender,
    getSvg: mockGetSvg,
  })),
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual exports
  GG: {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual exports
    GraphStyle: { Rounded: 'rounded' },
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches actual exports
    GraphUncommittedChangesStyle: { OpenCircleAtTheCheckedOutCommit: 0 },
  },
}));

describe('buildCommitLookup', () => {
  it('should build lookup map from commits', () => {
    const commits = [
      {
        oid: 'abc123',
        shortOid: 'abc',
        summary: 'First commit',
        parentOids: [],
        timestamp: '2024-01-01T00:00:00Z',
        author: { name: 'John', email: 'john@example.com', timestamp: '2024-01-01T00:00:00Z' },
        committer: { name: 'John', email: 'john@example.com', timestamp: '2024-01-01T00:00:00Z' },
      },
      {
        oid: 'def456',
        shortOid: 'def',
        summary: 'Second commit',
        parentOids: ['abc123'],
        timestamp: '2024-01-02T00:00:00Z',
        author: { name: 'Jane', email: 'jane@example.com', timestamp: '2024-01-02T00:00:00Z' },
        committer: { name: 'Jane', email: 'jane@example.com', timestamp: '2024-01-02T00:00:00Z' },
      },
    ] as unknown as GraphCommit[];

    const lookup = buildCommitLookup(commits);

    expect(lookup).toEqual({
      abc123: 0,
      def456: 1,
    });
  });

  it('should return empty object for empty commits', () => {
    const lookup = buildCommitLookup([]);
    expect(lookup).toEqual({});
  });
});

describe('defaultGraphConfig', () => {
  it('should have correct structure', () => {
    expect(defaultGraphConfig).toHaveProperty('colours');
    expect(defaultGraphConfig).toHaveProperty('style');
    expect(defaultGraphConfig).toHaveProperty('grid');
    expect(defaultGraphConfig.colours).toHaveLength(8);
  });

  it('should have grid properties', () => {
    expect(defaultGraphConfig.grid).toHaveProperty('x');
    expect(defaultGraphConfig.grid).toHaveProperty('y');
    expect(defaultGraphConfig.grid).toHaveProperty('offsetX');
    expect(defaultGraphConfig.grid).toHaveProperty('offsetY');
    expect(defaultGraphConfig.grid).toHaveProperty('expandY');
  });
});

describe('defaultMuteConfig', () => {
  it('should have correct defaults', () => {
    expect(defaultMuteConfig.mergeCommits).toBe(false);
    expect(defaultMuteConfig.commitsNotAncestorsOfHead).toBe(false);
  });
});

describe('CommitGraph', () => {
  const mockGraph = {
    loadCommits: vi.fn(),
    render: mockRender,
    getSvg: mockGetSvg,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper component to test CommitGraph with refs
  function TestCommitGraph({ expandedCommitIndex }: { expandedCommitIndex: number | null }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tableHeaderRef = useRef<HTMLTableRowElement>(null);

    return (
      <div>
        <table>
          <thead>
            <tr ref={tableHeaderRef}>
              <th>Header</th>
            </tr>
          </thead>
        </table>
        <div ref={containerRef} data-testid="graph-container" />
        <CommitGraph
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          graph={mockGraph as any}
          expandedCommitIndex={expandedCommitIndex}
          containerRef={containerRef}
          tableHeaderRef={tableHeaderRef}
        />
      </div>
    );
  }

  it('should render nothing visible', () => {
    const { container } = render(<TestCommitGraph expandedCommitIndex={null} />);

    // CommitGraph returns null, rendering is done via ref
    const graphContainer = container.querySelector('[data-testid="graph-container"]');
    expect(graphContainer).toBeInTheDocument();
  });

  it('should call graph.render when mounted', () => {
    render(<TestCommitGraph expandedCommitIndex={null} />);

    expect(mockRender).toHaveBeenCalled();
    expect(mockGetSvg).toHaveBeenCalled();
  });

  it('should call graph.render with expanded commit info', () => {
    render(<TestCommitGraph expandedCommitIndex={5} />);

    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 5,
      })
    );
  });

  it('should call graph.render with null when no expanded commit', () => {
    render(<TestCommitGraph expandedCommitIndex={null} />);

    expect(mockRender).toHaveBeenCalledWith(null);
  });

  it('should re-render when expandedCommitIndex changes', () => {
    const { rerender } = render(<TestCommitGraph expandedCommitIndex={null} />);

    expect(mockRender).toHaveBeenCalledTimes(1);

    rerender(<TestCommitGraph expandedCommitIndex={3} />);

    expect(mockRender).toHaveBeenCalledTimes(2);
  });

  it('should append SVG to container', () => {
    const { container } = render(<TestCommitGraph expandedCommitIndex={null} />);

    const graphContainer = container.querySelector('[data-testid="graph-container"]');
    expect(graphContainer?.querySelector('svg')).toBeInTheDocument();
  });
});
