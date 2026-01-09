import { useState, useEffect } from 'react';
import { Check, Edit3 } from 'lucide-react';
import { useStagingStore } from '../../store/stagingStore';
import './CommitForm.css';

export function CommitForm() {
  const {
    status,
    commitMessage,
    isAmending,
    isCommitting,
    setCommitMessage,
    setIsAmending,
    createCommit,
    amendCommit,
  } = useStagingStore();

  const [localMessage, setLocalMessage] = useState(commitMessage);

  useEffect(() => {
    setLocalMessage(commitMessage);
  }, [commitMessage]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalMessage(value);
    setCommitMessage(value);
  };

  const handleCommit = async () => {
    try {
      if (isAmending) {
        await amendCommit();
      } else {
        await createCommit();
      }
      setLocalMessage('');
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to commit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    }
  };

  const stagedCount = status?.staged.length ?? 0;
  const canCommit = stagedCount > 0 && (localMessage.trim() || isAmending);

  // Split message into summary and body for character count
  const lines = localMessage.split('\n');
  const summary = lines[0] || '';
  const isSummaryTooLong = summary.length > 72;

  return (
    <div className="commit-form">
      <div className="commit-form-header">
        <span className="commit-form-title">
          {isAmending ? 'Amend Commit' : 'Commit'}
        </span>
        <button
          className={`commit-form-amend-toggle ${isAmending ? 'active' : ''}`}
          onClick={() => setIsAmending(!isAmending)}
          title={isAmending ? 'Cancel amend' : 'Amend last commit'}
        >
          <Edit3 size={14} />
        </button>
      </div>

      <div className="commit-form-body">
        <div className="commit-message-wrapper">
          <textarea
            className={`commit-message-input ${isSummaryTooLong ? 'warning' : ''}`}
            placeholder={isAmending ? 'Leave empty to keep existing message' : 'Commit message'}
            value={localMessage}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={isCommitting}
          />
          <div className="commit-message-hints">
            <span className={`char-count ${isSummaryTooLong ? 'warning' : ''}`}>
              {summary.length}/72
            </span>
          </div>
        </div>

        <button
          className="commit-button"
          onClick={handleCommit}
          disabled={!canCommit || isCommitting}
        >
          <Check size={16} />
          {isCommitting ? 'Committing...' : isAmending ? 'Amend' : 'Commit'}
          {stagedCount > 0 && (
            <span className="commit-count">({stagedCount} file{stagedCount !== 1 ? 's' : ''})</span>
          )}
        </button>

        <div className="commit-shortcut-hint">
          Press Ctrl+Enter to commit
        </div>
      </div>
    </div>
  );
}
