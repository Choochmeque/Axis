import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
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

export function RebasePreviewDiagram({ preview, currentBranch }: RebasePreviewDiagramProps) {
  const { t } = useTranslation();
  const { beforeData, afterData, svgHeight, hasMoreCommits, extraCommitCount } = useMemo(() => {
    const commitsToRebase = preview.commitsToRebase;
    const targetAhead = preview.targetCommitsAhead;

    // Limit commits shown
    const shownCommits = commitsToRebase.slice(0, MAX_COMMITS_SHOWN);
    const hasMore = commitsToRebase.length > MAX_COMMITS_SHOWN;
    const extraCount = commitsToRebase.length - MAX_COMMITS_SHOWN;

    // Calculate rows needed
    // Before: current branch commits + merge base + target commits ahead (max 2)
    // After: rebased commits + target tip + target commits (max 2)
    const targetCommitsShown = Math.min(Number(targetAhead), 2);
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
    beforeData.commits.forEach((commit: { shortOid: string }, i: number) => {
      // Commit node
      elements.push(
        <circle
          key={`before-commit-${i}`}
          cx={LANE_OFFSET + 20}
          cy={y}
          r={NODE_RADIUS}
          fill="var(--accent-color)"
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
          {commit.shortOid}
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
            stroke="var(--accent-color)"
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
          {t('merge.rebasePreview.more', { count: extraCommitCount })}
        </text>
      );
      elements.push(
        <circle
          key="before-more-dot"
          cx={LANE_OFFSET + 20}
          cy={y}
          r={3}
          fill="var(--accent-color)"
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
        stroke="var(--accent-color)"
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
        fill="var(--text-muted)"
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
        {preview.mergeBase.shortOid}
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
          stroke="var(--color-branch-local)"
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
          fill="var(--color-branch-local)"
        />
      );
      if (i === 0) {
        elements.push(
          <text
            key={`before-target-label-${i}`}
            x={LANE_OFFSET + TEXT_OFFSET}
            y={y + 4}
            className="rebase-preview-branch-label"
            fill="var(--color-branch-local)"
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
    beforeData.commits.forEach((commit: { shortOid: string }, i: number) => {
      // Commit node
      elements.push(
        <circle
          key={`after-commit-${i}`}
          cx={LANE_OFFSET}
          cy={y}
          r={NODE_RADIUS}
          fill="var(--color-branch-remote)"
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
          {commit.shortOid}'
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
            i < beforeData.commits.length - 1 || hasMoreCommits
              ? 'var(--color-branch-remote)'
              : 'var(--color-branch-local)'
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
          {t('merge.rebasePreview.more', { count: extraCommitCount })}
        </text>
      );
      elements.push(
        <circle
          key="after-more-dot"
          cx={LANE_OFFSET}
          cy={y}
          r={3}
          fill="var(--color-branch-remote)"
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
          stroke="var(--color-branch-local)"
          strokeWidth={2}
        />
      );
      y += ROW_HEIGHT;
    }

    // Target tip (now the new base)
    elements.push(
      <circle
        key="after-target-tip"
        cx={LANE_OFFSET}
        cy={y}
        r={NODE_RADIUS}
        fill="var(--color-branch-local)"
      />
    );
    elements.push(
      <text
        key="after-target-tip-label"
        x={LANE_OFFSET + TEXT_OFFSET}
        y={y + 4}
        className="rebase-preview-branch-label"
        fill="var(--color-branch-local)"
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
          stroke="var(--color-branch-local)"
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
          fill="var(--color-branch-local)"
        />
      );
      y += ROW_HEIGHT;
    }

    return elements;
  };

  // Don't render if no commits to rebase
  if (preview.commitsToRebase.length === 0) {
    return (
      <div className="rebase-preview-empty">
        <span className="text-sm text-(--text-secondary)">
          {t('merge.rebasePreview.noCommits')}
        </span>
      </div>
    );
  }

  return (
    <div className="rebase-preview">
      <div className="rebase-preview-panel">
        <div className="rebase-preview-header">{t('merge.rebasePreview.before')}</div>
        <div className="rebase-preview-branch-info">
          <span className="rebase-preview-branch-name" style={{ color: 'var(--accent-color)' }}>
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
        <div className="rebase-preview-header">{t('merge.rebasePreview.after')}</div>
        <div className="rebase-preview-branch-info">
          <span
            className="rebase-preview-branch-name"
            style={{ color: 'var(--color-branch-remote)' }}
          >
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
