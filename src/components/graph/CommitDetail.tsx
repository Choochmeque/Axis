import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { GitCommit, User, Clock, Hash, GitBranch, Tag } from 'lucide-react';
import { diffApi } from '../../services/api';
import type { GraphCommit, FileDiff } from '../../types';
import './CommitDetail.css';

interface CommitDetailProps {
  commit: GraphCommit | null;
  onFileSelect?: (path: string) => void;
}

export function CommitDetail({ commit, onFileSelect }: CommitDetailProps) {
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!commit) {
      setFiles([]);
      return;
    }

    const loadDiff = async () => {
      setIsLoading(true);
      try {
        const diffs = await diffApi.getCommit(commit.oid);
        setFiles(diffs);
      } catch (error) {
        console.error('Failed to load commit diff:', error);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDiff();
  }, [commit?.oid]);

  if (!commit) {
    return (
      <div className="commit-detail-empty">
        <GitCommit size={32} />
        <p>Select a commit to view details</p>
      </div>
    );
  }

  const formattedDate = format(new Date(commit.timestamp), 'PPpp');
  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <div className="commit-detail">
      <div className="commit-detail-header">
        <h3 className="commit-detail-summary">{commit.summary}</h3>

        {commit.refs.length > 0 && (
          <div className="commit-detail-refs">
            {commit.refs.map((ref, index) => (
              <span
                key={`${ref.name}-${index}`}
                className={`commit-detail-ref ${ref.ref_type}`}
              >
                {ref.ref_type === 'tag' ? <Tag size={12} /> : <GitBranch size={12} />}
                {ref.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="commit-detail-meta">
        <div className="commit-detail-meta-row">
          <User size={14} />
          <span className="commit-detail-author">
            {commit.author.name} &lt;{commit.author.email}&gt;
          </span>
        </div>
        <div className="commit-detail-meta-row">
          <Clock size={14} />
          <span className="commit-detail-date">{formattedDate}</span>
        </div>
        <div className="commit-detail-meta-row">
          <Hash size={14} />
          <span className="commit-detail-oid">{commit.oid}</span>
        </div>
        {commit.parent_oids.length > 0 && (
          <div className="commit-detail-meta-row">
            <GitCommit size={14} />
            <span className="commit-detail-parents">
              Parents: {commit.parent_oids.map((oid) => oid.slice(0, 7)).join(', ')}
            </span>
          </div>
        )}
      </div>

      {commit.message !== commit.summary && (
        <div className="commit-detail-message">
          <pre>{commit.message}</pre>
        </div>
      )}

      <div className="commit-detail-files">
        <div className="commit-detail-files-header">
          <span>
            {files.length} file{files.length !== 1 ? 's' : ''} changed
          </span>
          {(additions > 0 || deletions > 0) && (
            <span className="commit-detail-stats">
              <span className="stat-additions">+{additions}</span>
              <span className="stat-deletions">-{deletions}</span>
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="commit-detail-loading">Loading files...</div>
        ) : (
          <ul className="commit-detail-file-list">
            {files.map((file) => {
              const path = file.new_path || file.old_path || '';
              return (
                <li
                  key={path}
                  className={`commit-detail-file status-${file.status}`}
                  onClick={() => onFileSelect?.(path)}
                >
                  <span className="file-status-indicator">{getStatusChar(file.status)}</span>
                  <span className="file-path">{path}</span>
                  <span className="file-stats">
                    {file.additions > 0 && (
                      <span className="stat-additions">+{file.additions}</span>
                    )}
                    {file.deletions > 0 && (
                      <span className="stat-deletions">-{file.deletions}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function getStatusChar(status: string): string {
  switch (status) {
    case 'added':
      return 'A';
    case 'deleted':
      return 'D';
    case 'modified':
      return 'M';
    case 'renamed':
      return 'R';
    case 'copied':
      return 'C';
    case 'type_changed':
      return 'T';
    default:
      return '?';
  }
}
