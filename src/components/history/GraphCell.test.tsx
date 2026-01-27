import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GraphCell } from './GraphCell';
import type { RowGraphData } from '@/lib/graphLayout';

vi.mock('@/lib/graphLayout', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Mock matches actual constant name
  GRAPH_COLORS: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
}));

describe('GraphCell', () => {
  const baseData: RowGraphData = {
    column: 0,
    color: 0,
    isCommitted: true,
    isCurrent: false,
    isMerge: false,
    hasChildren: false,
    hasParents: false,
    passingLanes: [],
    incomingLines: [],
    outgoingLines: [],
  };

  it('should render svg with correct dimensions', () => {
    const { container } = render(
      <GraphCell data={baseData} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '64'); // (3 + 1) * 16
    expect(svg).toHaveAttribute('height', '24');
  });

  it('should render node circle', () => {
    const { container } = render(
      <GraphCell data={baseData} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const circle = container.querySelector('circle');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveClass('graph-node');
    expect(circle).toHaveAttribute('r', '4');
  });

  it('should position node at correct column', () => {
    const data: RowGraphData = { ...baseData, column: 2 };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const circle = container.querySelector('circle');
    // cx = column * columnWidth + columnWidth / 2 = 2 * 16 + 8 = 40
    expect(circle).toHaveAttribute('cx', '40');
    expect(circle).toHaveAttribute('cy', '12'); // centerY = 24 / 2
  });

  it('should render uncommitted node with stroke', () => {
    const data: RowGraphData = { ...baseData, isCommitted: false };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const circle = container.querySelector('circle');
    expect(circle).toHaveAttribute('stroke', 'var(--text-tertiary)');
    expect(circle).toHaveAttribute('stroke-width', '2');
  });

  it('should render passing lanes', () => {
    const data: RowGraphData = {
      ...baseData,
      passingLanes: [
        { column: 1, color: 1, isCommitted: true },
        { column: 2, color: 2, isCommitted: true },
      ],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const lines = container.querySelectorAll('line.graph-line');
    expect(lines.length).toBe(2);
  });

  it('should render uncommitted passing lane with correct class', () => {
    const data: RowGraphData = {
      ...baseData,
      passingLanes: [{ column: 1, color: 0, isCommitted: false }],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const line = container.querySelector('line.graph-line');
    expect(line).toHaveClass('uncommitted');
  });

  it('should render merge preview passing lane with correct class', () => {
    const data: RowGraphData = {
      ...baseData,
      passingLanes: [{ column: 1, color: 0, isCommitted: true, isMergePreview: true }],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const line = container.querySelector('line.graph-line');
    expect(line).toHaveClass('merge-preview');
  });

  it('should render straight incoming line', () => {
    const data: RowGraphData = {
      ...baseData,
      incomingLines: [
        { fromColumn: 0, toColumn: 0, fromRow: 0, toRow: 1, color: 0, isCommitted: true },
      ],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    // There should be a line element for straight lines
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should render curved incoming line', () => {
    const data: RowGraphData = {
      ...baseData,
      incomingLines: [
        { fromColumn: 1, toColumn: 0, fromRow: 0, toRow: 1, color: 0, isCommitted: true },
      ],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('d');
    // Should be a cubic bezier curve
    expect(path?.getAttribute('d')).toContain('C');
  });

  it('should render straight outgoing line', () => {
    const data: RowGraphData = {
      ...baseData,
      outgoingLines: [
        { fromColumn: 0, toColumn: 0, fromRow: 1, toRow: 2, color: 0, isCommitted: true },
      ],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should render curved outgoing line', () => {
    const data: RowGraphData = {
      ...baseData,
      outgoingLines: [
        { fromColumn: 0, toColumn: 1, fromRow: 1, toRow: 2, color: 0, isCommitted: true },
      ],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
  });

  it('should create unique clip path id per row', () => {
    const { container } = render(
      <GraphCell data={baseData} rowHeight={24} maxColumns={3} rowIndex={5} />
    );

    const clipPath = container.querySelector('clipPath');
    expect(clipPath).toHaveAttribute('id', 'graph-clip-5');
  });

  it('should use default columnWidth', () => {
    const { container } = render(<GraphCell data={baseData} rowHeight={24} maxColumns={3} />);

    const svg = container.querySelector('svg');
    // Default columnWidth is 16, so width = (3 + 1) * 16 = 64
    expect(svg).toHaveAttribute('width', '64');
  });

  it('should handle empty data gracefully', () => {
    const { container } = render(
      <GraphCell data={baseData} rowHeight={24} columnWidth={16} maxColumns={0} />
    );

    const svg = container.querySelector('svg');
    // width = Math.max((0 + 1) * 16, 16 * 2) = Math.max(16, 32) = 32
    expect(svg).toHaveAttribute('width', '32');
  });

  it('should apply color from GRAPH_COLORS', () => {
    const data: RowGraphData = {
      ...baseData,
      color: 1,
      passingLanes: [{ column: 1, color: 1, isCommitted: true }],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const line = container.querySelector('line');
    expect(line).toHaveAttribute('stroke', '#00FF00'); // Index 1 in mock
  });

  it('should cycle colors when index exceeds array', () => {
    const data: RowGraphData = {
      ...baseData,
      color: 5, // Should wrap to index 1 (5 % 4 = 1)
      passingLanes: [{ column: 1, color: 5, isCommitted: true }],
    };
    const { container } = render(
      <GraphCell data={data} rowHeight={24} columnWidth={16} maxColumns={3} />
    );

    const line = container.querySelector('line');
    expect(line).toHaveAttribute('stroke', '#00FF00'); // 5 % 4 = 1
  });
});
