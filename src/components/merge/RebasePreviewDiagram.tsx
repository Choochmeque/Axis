import { useMemo, type ReactElement } from 'react';
import { ArrowRight } from 'lucide-react';
import type { RebasePreview } from '../../types';

interface RebasePreviewDiagramProps {
  preview: RebasePreview;
  currentBranch: string;
}

// Visual constants
const NODE_RADIUS = 5;
const ROW_HEIGHT = 28;
const LANE_OFFSET = 24;
const TEXT_OFFSET = 16;
const MAX_COMMITS_SHOWN = 4;

// Colors
const COLORS = {
  current: '#0078d4', // Blue - current branch commits
  target: '#107c10', // Green - target branch
  rebased: '#5c2d91', // Purple - rebased commits (after)
  mergeBase: '#6e6e6e', // Gray - merge base
  line: '#404040', // Line color
};

export function RebasePreviewDiagram({ preview, currentBranch }: RebasePreviewDiagramProps) {
  const { beforeData, afterData, svgHeight, hasMoreCommits, extraCommitCount } = useMemo(() => {
    const commitsToRebase = preview.commits_to_rebase;
    const targetAhead = preview.target_commits_ahead;

    // Limit commits shown
    const shownCommits = commitsToRebase.slice(0, MAX_COMMITS_SHOWN);
    const hasMore = commitsToRebase.length > MAX_COMMITS_SHOWN;
    const extraCount = commitsToRebase.length - MAX_COMMITS_SHOWN;

    // Calculate rows needed
    // Before: current branch commits + merge base + target commits ahead (max 2)
    // After: rebased commits + target tip + target commits (max 2)
    const targetCommitsShown = Math.min(targetAhead, 2);
    const beforeRows = shownCommits.length + 1 + targetCommitsShown + (hasMore ? 1 : 0);
    const afterRows = shownCommits.length + 1 + targetCommitsShown + (hasMore ? 1 : 0);
    const maxRows = Math.max(beforeRows, afterRows);
    const height = maxRows * ROW_HEIGHT + 20;

    return {
      beforeData: {
        commits: shownCommits,
        targetCommitsShown,
      },
      afterData: {
        commits: shownCommits,
        targetCommitsShown,
      },
      svgHeight: height,
      hasMoreCommits: hasMore,
      extraCommitCount: extraCount,
    };
  }, [preview]);

  const renderBeforeDiagram = () => {
    const elements: ReactElement[] = [];
    let y = 14;

    // Current branch commits (top, branching off)
    beforeData.commits.forEach((commit, i) => {
      // Commit node
      elements.push(
        <circle
          key={`before-commit-${i}`}
          cx={LANE_OFFSET + 20}
          cy={y}
          r={NODE_RADIUS}
          fill={COLORS.current}
        />
      );
      // Commit label
      elements.push(
        <text
          key={`before-label-${i}`}
          x={LANE_OFFSET + 20 + TEXT_OFFSET}
          y={y + 4}
          className="rebase-preview-commit-label"
          fill="var(--text-secondary)"
        >
          {commit.short_oid}
        </text>
      );
      // Line to next
      if (i < beforeData.commits.length - 1 || hasMoreCommits) {
        elements.push(
          <line
            key={`before-line-${i}`}
            x1={LANE_OFFSET + 20}
            y1={y + NODE_RADIUS}
            x2={LANE_OFFSET + 20}
            y2={y + ROW_HEIGHT - NODE_RADIUS}
            stroke={COLORS.current}
            strokeWidth={2}
          />
        );
      }
      y += ROW_HEIGHT;
    });

    // "... and N more" indicator
    if (hasMoreCommits) {
      elements.push(
        <text
          key="before-more"
          x={LANE_OFFSET + 20 + TEXT_OFFSET}
          y={y + 4}
          className="rebase-preview-commit-label"
          fill="var(--text-tertiary)"
          fontStyle="italic"
        >
          +{extraCommitCount} more
        </text>
      );
      elements.push(
        <circle
          key="before-more-dot"
          cx={LANE_OFFSET + 20}
          cy={y}
          r={3}
          fill={COLORS.current}
          opacity={0.5}
        />
      );
      y += ROW_HEIGHT;
    }

    // Branch line from current to merge base
    elements.push(
      <path
        key="before-branch-curve"
        d={`M ${LANE_OFFSET + 20} ${y - ROW_HEIGHT + NODE_RADIUS}
            C ${LANE_OFFSET + 20} ${y - ROW_HEIGHT / 2},
              ${LANE_OFFSET} ${y - ROW_HEIGHT / 2},
              ${LANE_OFFSET} ${y - NODE_RADIUS}`}
        stroke={COLORS.current}
        strokeWidth={2}
        fill="none"
      />
    );

    // Merge base
    elements.push(
      <circle
        key="before-merge-base"
        cx={LANE_OFFSET}
        cy={y}
        r={NODE_RADIUS}
        fill={COLORS.mergeBase}
      />
    );
    elements.push(
      <text
        key="before-merge-base-label"
        x={LANE_OFFSET + TEXT_OFFSET}
        y={y + 4}
        className="rebase-preview-commit-label"
        fill="var(--text-tertiary)"
      >
        {preview.merge_base.short_oid}
      </text>
    );

    // Line from merge base down
    if (beforeData.targetCommitsShown > 0) {
      elements.push(
        <line
          key="before-main-line"
          x1={LANE_OFFSET}
          y1={y + NODE_RADIUS}
          x2={LANE_OFFSET}
          y2={y + ROW_HEIGHT * beforeData.targetCommitsShown - NODE_RADIUS}
          stroke={COLORS.target}
          strokeWidth={2}
        />
      );
    }

    y += ROW_HEIGHT;

    // Target commits (below merge base)
    for (let i = 0; i < beforeData.targetCommitsShown; i++) {
      elements.push(
        <circle
          key={`before-target-${i}`}
          cx={LANE_OFFSET}
          cy={y}
          r={NODE_RADIUS}
          fill={COLORS.target}
        />
      );
      if (i === 0) {
        elements.push(
          <text
            key={`before-target-label-${i}`}
            x={LANE_OFFSET + TEXT_OFFSET}
            y={y + 4}
            className="rebase-preview-branch-label"
            fill={COLORS.target}
          >
            {preview.target.name}
          </text>
        );
      }
      y += ROW_HEIGHT;
    }

    return elements;
  };

  const renderAfterDiagram = () => {
    const elements: ReactElement[] = [];
    let y = 14;

    // Rebased commits (top, on main line)
    beforeData.commits.forEach((commit, i) => {
      // Commit node
      elements.push(
        <circle
          key={`after-commit-${i}`}
          cx={LANE_OFFSET}
          cy={y}
          r={NODE_RADIUS}
          fill={COLORS.rebased}
        />
      );
      // Commit label with prime notation
      elements.push(
        <text
          key={`after-label-${i}`}
          x={LANE_OFFSET + TEXT_OFFSET}
          y={y + 4}
          className="rebase-preview-commit-label"
          fill="var(--text-secondary)"
        >
          {commit.short_oid}'
        </text>
      );
      // Line to next
      elements.push(
        <line
          key={`after-line-${i}`}
          x1={LANE_OFFSET}
          y1={y + NODE_RADIUS}
          x2={LANE_OFFSET}
          y2={y + ROW_HEIGHT - NODE_RADIUS}
          stroke={
            i < beforeData.commits.length - 1 || hasMoreCommits ? COLORS.rebased : COLORS.target
          }
          strokeWidth={2}
        />
      );
      y += ROW_HEIGHT;
    });

    // "... and N more" indicator
    if (hasMoreCommits) {
      elements.push(
        <text
          key="after-more"
          x={LANE_OFFSET + TEXT_OFFSET}
          y={y + 4}
          className="rebase-preview-commit-label"
          fill="var(--text-tertiary)"
          fontStyle="italic"
        >
          +{extraCommitCount} more
        </text>
      );
      elements.push(
        <circle
          key="after-more-dot"
          cx={LANE_OFFSET}
          cy={y}
          r={3}
          fill={COLORS.rebased}
          opacity={0.5}
        />
      );
      elements.push(
        <line
          key="after-more-line"
          x1={LANE_OFFSET}
          y1={y + NODE_RADIUS}
          x2={LANE_OFFSET}
          y2={y + ROW_HEIGHT - NODE_RADIUS}
          stroke={COLORS.target}
          strokeWidth={2}
        />
      );
      y += ROW_HEIGHT;
    }

    // Target tip (now the new base)
    elements.push(
      <circle key="after-target-tip" cx={LANE_OFFSET} cy={y} r={NODE_RADIUS} fill={COLORS.target} />
    );
    elements.push(
      <text
        key="after-target-tip-label"
        x={LANE_OFFSET + TEXT_OFFSET}
        y={y + 4}
        className="rebase-preview-branch-label"
        fill={COLORS.target}
      >
        {preview.target.name}
      </text>
    );

    // Line from target tip down
    if (afterData.targetCommitsShown > 0) {
      elements.push(
        <line
          key="after-main-line"
          x1={LANE_OFFSET}
          y1={y + NODE_RADIUS}
          x2={LANE_OFFSET}
          y2={y + ROW_HEIGHT * afterData.targetCommitsShown}
          stroke={COLORS.target}
          strokeWidth={2}
        />
      );
    }

    y += ROW_HEIGHT;

    // Remaining target commits
    for (let i = 1; i < afterData.targetCommitsShown; i++) {
      elements.push(
        <circle
          key={`after-target-${i}`}
          cx={LANE_OFFSET}
          cy={y}
          r={NODE_RADIUS}
          fill={COLORS.target}
        />
      );
      y += ROW_HEIGHT;
    }

    return elements;
  };

  // Don't render if no commits to rebase
  if (preview.commits_to_rebase.length === 0) {
    return (
      <div className="rebase-preview-empty">
        <span className="text-sm text-(--text-secondary)">
          No commits to rebase. Branch is already up to date.
        </span>
      </div>
    );
  }

  return (
    <div className="rebase-preview">
      <div className="rebase-preview-panel">
        <div className="rebase-preview-header">Before</div>
        <div className="rebase-preview-branch-info">
          <span className="rebase-preview-branch-name" style={{ color: COLORS.current }}>
            {currentBranch}
          </span>
        </div>
        <svg className="rebase-preview-svg" width="100%" height={svgHeight}>
          {renderBeforeDiagram()}
        </svg>
      </div>

      <div className="rebase-preview-arrow">
        <ArrowRight size={20} />
      </div>

      <div className="rebase-preview-panel">
        <div className="rebase-preview-header">After</div>
        <div className="rebase-preview-branch-info">
          <span className="rebase-preview-branch-name" style={{ color: COLORS.rebased }}>
            {currentBranch}
          </span>
        </div>
        <svg className="rebase-preview-svg" width="100%" height={svgHeight}>
          {renderAfterDiagram()}
        </svg>
      </div>
    </div>
  );
}
