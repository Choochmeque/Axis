import { memo } from 'react';
import { type RowGraphData, GRAPH_COLORS } from '@/lib/graphLayout';

interface GraphCellProps {
  data: RowGraphData;
  rowHeight: number;
  columnWidth?: number;
  maxColumns: number;
  rowIndex?: number;
}

const NODE_RADIUS = 4;

export const GraphCell = memo(function GraphCell({
  data,
  rowHeight,
  columnWidth = 16,
  maxColumns,
  rowIndex = 0,
}: GraphCellProps) {
  const { column, color, isCommitted, passingLanes, incomingLines, outgoingLines } = data;

  const width = Math.max((maxColumns + 1) * columnWidth, columnWidth * 2);
  const centerY = rowHeight / 2;
  const nodeX = column * columnWidth + columnWidth / 2;
  // d value from graph.ts: config.grid.y * 0.8 for Rounded style
  const d = rowHeight * 0.8;

  const getColor = (colorIndex: number) => GRAPH_COLORS[(colorIndex ?? 0) % GRAPH_COLORS.length];
  const getX = (col: number) => col * columnWidth + columnWidth / 2;
  const getLineClass = (isCommitted: boolean, isMergePreview?: boolean) => {
    if (isMergePreview) return 'graph-line merge-preview';
    return isCommitted ? 'graph-line' : 'graph-line uncommitted';
  };

  // Generate unique clip path ID for this cell using row index
  const clipId = `graph-clip-${rowIndex}`;

  return (
    <svg className="graph-cell" width={width} height={rowHeight} style={{ display: 'block' }}>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={rowHeight} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Passing lanes - vertical lines that pass through without stopping */}
        {passingLanes.map((lane, i) => {
          const x = getX(lane.column);
          return (
            <line
              key={`pass-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={rowHeight}
              className={getLineClass(lane.isCommitted, lane.isMergePreview)}
              stroke={getColor(lane.color)}
            />
          );
        })}

        {/* Incoming lines - draw FULL curve from previous row center to this row center, clipped */}
        {incomingLines.map((line, i) => {
          const x1 = getX(line.fromColumn);
          const x2 = getX(line.toColumn);
          // In this cell's coords: previous row center is at -centerY, this row center is at centerY
          const y1 = -centerY;
          const y2 = centerY;

          if (line.fromColumn !== line.toColumn) {
            // Curved line - exact formula from graph.ts line 254-266
            // C x1,(y1+d) x2,(y2-d) x2,y2
            const path = `M ${x1} ${y1} C ${x1} ${y1 + d}, ${x2} ${y2 - d}, ${x2} ${y2}`;
            return (
              <path
                key={`in-${i}`}
                d={path}
                className={getLineClass(line.isCommitted, line.isMergePreview)}
                stroke={getColor(line.color)}
                fill="none"
              />
            );
          }

          // Straight vertical line
          return (
            <line
              key={`in-${i}`}
              x1={x2}
              y1={y1}
              x2={x2}
              y2={y2}
              className={getLineClass(line.isCommitted, line.isMergePreview)}
              stroke={getColor(line.color)}
            />
          );
        })}

        {/* Outgoing lines - draw FULL curve from this row center to next row center, clipped */}
        {outgoingLines.map((line, i) => {
          const x1 = getX(line.fromColumn);
          const x2 = getX(line.toColumn);
          // In this cell's coords: this row center is at centerY, next row center is at centerY + rowHeight
          const y1 = centerY;
          const y2 = centerY + rowHeight;

          if (line.fromColumn !== line.toColumn) {
            // Curved line - exact formula from graph.ts line 254-266
            // C x1,(y1+d) x2,(y2-d) x2,y2
            const path = `M ${x1} ${y1} C ${x1} ${y1 + d}, ${x2} ${y2 - d}, ${x2} ${y2}`;
            return (
              <path
                key={`out-${i}`}
                d={path}
                className={getLineClass(line.isCommitted, line.isMergePreview)}
                stroke={getColor(line.color)}
                fill="none"
              />
            );
          }

          // Straight vertical line
          return (
            <line
              key={`out-${i}`}
              x1={x1}
              y1={y1}
              x2={x1}
              y2={y2}
              className={getLineClass(line.isCommitted, line.isMergePreview)}
              stroke={getColor(line.color)}
            />
          );
        })}
      </g>

      {/* Node circle - drawn outside clip group so it's always fully visible */}
      <circle
        cx={nodeX}
        cy={centerY}
        r={NODE_RADIUS}
        className="graph-node"
        fill={
          isCommitted
            ? getColor(incomingLines.find((l) => l.toColumn === column)?.color ?? color)
            : 'var(--bg-primary)'
        }
        stroke={isCommitted ? undefined : 'var(--text-tertiary)'}
        strokeWidth={isCommitted ? undefined : 2}
      />
    </svg>
  );
});
