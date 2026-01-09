import { useRepositoryStore } from '../../store/repositoryStore';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit, GitMerge } from 'lucide-react';
import { clsx } from 'clsx';
import './HistoryView.css';

export function HistoryView() {
  const { commits, isLoadingCommits } = useRepositoryStore();

  if (isLoadingCommits) {
    return (
      <div className="history-loading">
        <p>Loading commits...</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="history-empty">
        <GitCommit size={48} strokeWidth={1} />
        <p>No commits yet</p>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-header">
        <div className="history-col history-col-graph">Graph</div>
        <div className="history-col history-col-description">Description</div>
        <div className="history-col history-col-date">Date</div>
        <div className="history-col history-col-author">Author</div>
        <div className="history-col history-col-sha">SHA</div>
      </div>
      <div className="history-list">
        {commits.map((commit, index) => (
          <div
            key={commit.oid}
            className={clsx('history-row', { 'is-merge': commit.is_merge })}
          >
            <div className="history-col history-col-graph">
              <div className="commit-graph">
                <div className="graph-line graph-line-top" />
                <div className="graph-node">
                  {commit.is_merge ? (
                    <GitMerge size={12} />
                  ) : (
                    <div className="graph-dot" />
                  )}
                </div>
                {index < commits.length - 1 && (
                  <div className="graph-line graph-line-bottom" />
                )}
              </div>
            </div>
            <div className="history-col history-col-description">
              <span className="commit-summary">{commit.summary}</span>
            </div>
            <div className="history-col history-col-date">
              <span className="commit-date">
                {formatDistanceToNow(new Date(commit.timestamp), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <div className="history-col history-col-author">
              <span className="commit-author">{commit.author.name}</span>
            </div>
            <div className="history-col history-col-sha">
              <code className="commit-sha">{commit.short_oid}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
