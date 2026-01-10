import { Copy, GitCommit, User, Calendar, GitBranch, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import type { Commit, GraphCommit } from '../../types';
import { useRepositoryStore } from '../../store/repositoryStore';
import './CommitInfo.css';

interface CommitInfoProps {
  commit: Commit | GraphCommit;
}

export function CommitInfo({ commit }: CommitInfoProps) {
  const { selectCommit } = useRepositoryStore();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleParentClick = (parentOid: string) => {
    selectCommit(parentOid);
  };

  return (
    <div className="commit-info">
      <div className="commit-info-header">
        <GitCommit size={16} />
        <span className="commit-info-title">Commit Details</span>
      </div>

      <div className="commit-info-content">
        <div className="commit-info-row">
          <span className="commit-info-label">SHA</span>
          <div className="commit-info-value">
            <code className="commit-sha-full">{commit.oid}</code>
            <button
              className="commit-info-copy"
              onClick={() => copyToClipboard(commit.oid)}
              title="Copy SHA"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        {commit.parent_oids.length > 0 && (
          <div className="commit-info-row">
            <span className="commit-info-label">
              {commit.parent_oids.length === 1 ? 'Parent' : 'Parents'}
            </span>
            <div className="commit-info-value commit-parents">
              {commit.parent_oids.map((parentOid) => (
                <button
                  key={parentOid}
                  className="commit-parent-link"
                  onClick={() => handleParentClick(parentOid)}
                  title="Go to parent commit"
                >
                  {parentOid.substring(0, 7)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="commit-info-row">
          <span className="commit-info-label">
            <User size={12} />
            Author
          </span>
          <div className="commit-info-value">
            <span className="commit-author-name">{commit.author.name}</span>
            <span className="commit-author-email">&lt;{commit.author.email}&gt;</span>
          </div>
        </div>

        <div className="commit-info-row">
          <span className="commit-info-label">
            <Calendar size={12} />
            Date
          </span>
          <div className="commit-info-value">
            {format(new Date(commit.timestamp), 'PPpp')}
          </div>
        </div>

        {'refs' in commit && commit.refs.length > 0 && (
          <div className="commit-info-row">
            <span className="commit-info-label">Refs</span>
            <div className="commit-info-value commit-info-refs">
              {commit.refs.map((ref: GraphCommit['refs'][0], idx: number) => (
                <span
                  key={idx}
                  className={clsx('commit-info-ref', `ref-${ref.ref_type}`, {
                    'is-head': ref.is_head,
                  })}
                >
                  {ref.ref_type === 'tag' ? (
                    <Tag size={10} />
                  ) : (
                    <GitBranch size={10} />
                  )}
                  {ref.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="commit-info-message-section">
          <span className="commit-info-label">Message</span>
          <div className="commit-info-message">{commit.message}</div>
        </div>
      </div>
    </div>
  );
}
