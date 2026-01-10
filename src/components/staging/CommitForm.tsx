import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useStagingStore } from '../../store/stagingStore';
import { useRepositoryStore } from '../../store/repositoryStore';
import { remoteApi, commitApi } from '../../services/api';
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
  const { repository } = useRepositoryStore();

  const [localMessage, setLocalMessage] = useState(commitMessage);
  const [pushAfterCommit, setPushAfterCommit] = useState(false);
  const [bypassHooks, setBypassHooks] = useState(false);
  const [signCommit, setSignCommit] = useState(false);
  const [signOff, setSignOff] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalMessage(commitMessage);
  }, [commitMessage]);

  // Listen for menu focus event
  useEffect(() => {
    const handleFocusCommitForm = () => {
      textareaRef.current?.focus();
    };

    document.addEventListener('focus-commit-form', handleFocusCommitForm);
    return () => {
      document.removeEventListener('focus-commit-form', handleFocusCommitForm);
    };
  }, []);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalMessage(value);
    setCommitMessage(value);
  };

  const handleCommit = async () => {
    try {
      let finalMessage = localMessage;

      // Handle sign-off by appending to message
      if (signOff && !isAmending) {
        try {
          const [name, email] = await commitApi.getUserSignature();
          const signOffLine = `\n\nSigned-off-by: ${name} <${email}>`;
          // Only add if not already present
          if (!finalMessage.includes('Signed-off-by:')) {
            finalMessage = finalMessage + signOffLine;
            setCommitMessage(finalMessage);
          }
        } catch (err) {
          console.error('Failed to get user signature:', err);
        }
      }

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 10));

      if (isAmending) {
        await amendCommit();
      } else {
        await createCommit();
      }
      setLocalMessage('');

      if (pushAfterCommit) {
        try {
          await remoteApi.pushCurrentBranch('origin');
        } catch (err) {
          console.error('Push failed:', err);
        }
      }
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
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="commit-options-trigger">
              <span>Commit Options...</span>
              <ChevronDown size={12} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="commit-options-content" align="end" sideOffset={4}>
              <DropdownMenu.CheckboxItem
                className="commit-options-item"
                checked={isAmending}
                onCheckedChange={setIsAmending}
              >
                <DropdownMenu.ItemIndicator className="commit-options-indicator">
                  ✓
                </DropdownMenu.ItemIndicator>
                Amend last commit
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                className="commit-options-item"
                checked={bypassHooks}
                onCheckedChange={setBypassHooks}
              >
                <DropdownMenu.ItemIndicator className="commit-options-indicator">
                  ✓
                </DropdownMenu.ItemIndicator>
                Bypass commit hooks
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                className="commit-options-item"
                checked={signCommit}
                onCheckedChange={setSignCommit}
              >
                <DropdownMenu.ItemIndicator className="commit-options-indicator">
                  ✓
                </DropdownMenu.ItemIndicator>
                Sign commit
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                className="commit-options-item"
                checked={signOff}
                onCheckedChange={setSignOff}
              >
                <DropdownMenu.ItemIndicator className="commit-options-indicator">
                  ✓
                </DropdownMenu.ItemIndicator>
                Sign off
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.Separator className="commit-options-separator" />
              <DropdownMenu.Item className="commit-options-item disabled" disabled>
                Create pull request
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="commit-form-body">
        <div className="commit-message-wrapper">
          <textarea
            ref={textareaRef}
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

        <div className="commit-form-footer">
          <label className="commit-push-checkbox">
            <input
              type="checkbox"
              checked={pushAfterCommit}
              onChange={(e) => setPushAfterCommit(e.target.checked)}
            />
            <span>Push to origin/{repository?.current_branch || 'main'}</span>
          </label>
          <button
            className="commit-button"
            onClick={handleCommit}
            disabled={!canCommit || isCommitting}
          >
            {isCommitting ? 'Committing...' : isAmending ? 'Amend' : 'Commit'}
            {stagedCount > 0 && (
              <span className="commit-count">({stagedCount})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
