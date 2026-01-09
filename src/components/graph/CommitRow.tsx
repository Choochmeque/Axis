import { formatDistanceToNow } from 'date-fns';
import type { GraphCommit, CommitRef } from '../../types';
import './CommitRow.css';

interface CommitRowProps {
  commit: GraphCommit;
  graphWidth: number;
  isSelected: boolean;
  onClick: () => void;
}

export function CommitRow({
  commit,
  graphWidth,
  isSelected,
  onClick,
}: CommitRowProps) {
  const timeAgo = formatDistanceToNow(new Date(commit.timestamp), {
    addSuffix: true,
  });

  return (
    <div
      className={`commit-row ${isSelected ? 'is-selected' : ''}`}
      onClick={onClick}
    >
      {/* Space for graph */}
      <div className="commit-row-graph" style={{ width: graphWidth }} />

      {/* Refs (branches, tags) */}
      <div className="commit-row-refs">
        {commit.refs.map((ref, index) => (
          <RefBadge key={`${ref.name}-${index}`} commitRef={ref} />
        ))}
      </div>

      {/* Commit message */}
      <div className="commit-row-message" title={commit.message}>
        {commit.summary}
      </div>

      {/* Author */}
      <div className="commit-row-author" title={commit.author.email}>
        {commit.author.name}
      </div>

      {/* Date */}
      <div className="commit-row-date" title={commit.timestamp}>
        {timeAgo}
      </div>

      {/* Short OID */}
      <div className="commit-row-oid">{commit.short_oid}</div>
    </div>
  );
}

interface RefBadgeProps {
  commitRef: CommitRef;
}

function RefBadge({ commitRef }: RefBadgeProps) {
  let className = 'ref-badge';

  switch (commitRef.ref_type) {
    case 'local_branch':
      className += ' ref-local-branch';
      if (commitRef.is_head) {
        className += ' ref-head';
      }
      break;
    case 'remote_branch':
      className += ' ref-remote-branch';
      break;
    case 'tag':
      className += ' ref-tag';
      break;
  }

  return (
    <span className={className} title={commitRef.name}>
      {commitRef.name}
    </span>
  );
}
