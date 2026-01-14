import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStagingStore } from '../../store/stagingStore';
import {
  Checkbox,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui';
import { useRepositoryStore } from '../../store/repositoryStore';
import { remoteApi, commitApi, signingApi } from '../../services/api';
import { cn } from '../../lib/utils';
import type { SigningConfig } from '../../types';

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
  const [signingAvailable, setSigningAvailable] = useState(false);
  const [signingConfig, setSigningConfig] = useState<SigningConfig | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalMessage(commitMessage);
  }, [commitMessage]);

  // Check signing availability when repository changes
  useEffect(() => {
    const checkSigning = async () => {
      try {
        const config = await signingApi.getConfig();
        setSigningConfig(config);
        if (config.signingKey) {
          const available = await signingApi.isAvailable(config);
          setSigningAvailable(available);
        } else {
          setSigningAvailable(false);
        }
      } catch {
        setSigningAvailable(false);
        setSigningConfig(null);
      }
    };
    if (repository) {
      checkSigning();
    }
  }, [repository]);

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
      await new Promise((resolve) => setTimeout(resolve, 10));

      if (isAmending) {
        await amendCommit();
      } else {
        await createCommit(signCommit);
      }
      setLocalMessage('');

      if (pushAfterCommit) {
        try {
          await remoteApi.pushCurrentBranch('origin');
        } catch (err) {
          console.error('Push failed:', err);
        }
      }
    } catch {
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
    <div className="flex flex-col h-full border-t border-(--border-color) bg-(--bg-secondary)">
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color) shrink-0">
        <span className="text-xs font-semibold uppercase text-(--text-secondary)">
          {isAmending ? 'Amend Commit' : 'Commit'}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 py-1 px-2 border-none bg-transparent text-(--text-secondary) text-xs cursor-pointer rounded transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)">
              <span>Commit Options...</span>
              <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-45" align="end">
            <DropdownMenuCheckboxItem checked={isAmending} onCheckedChange={setIsAmending}>
              Amend last commit
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={bypassHooks}
              onCheckedChange={setBypassHooks}
              disabled
            >
              Bypass commit hooks
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={signCommit}
              onCheckedChange={setSignCommit}
              disabled={!signingAvailable}
            >
              Sign commit
              {!signingAvailable && signingConfig
                ? ' (no key configured)'
                : !signingAvailable
                  ? ' (unavailable)'
                  : ''}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={signOff} onCheckedChange={setSignOff}>
              Sign off
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Create pull request</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1 min-h-0">
        <div className="relative flex flex-col flex-1 min-h-0">
          <textarea
            ref={textareaRef}
            className={cn(
              'w-full p-2 border border-(--border-color) rounded bg-(--bg-primary) text-(--text-primary) font-sans text-[13px] resize-none flex-1 min-h-15 focus:outline-none focus:border-(--accent-color) placeholder:text-(--text-tertiary)',
              isSummaryTooLong && 'border-warning'
            )}
            placeholder={isAmending ? 'Leave empty to keep existing message' : 'Commit message'}
            value={localMessage}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            disabled={isCommitting}
          />
          <div className="flex justify-end mt-1 shrink-0">
            <span
              className={cn(
                'text-[11px] text-(--text-tertiary)',
                isSummaryTooLong && 'text-warning'
              )}
            >
              {summary.length}/72
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="push-after-commit"
              checked={pushAfterCommit}
              onCheckedChange={(checked) => setPushAfterCommit(checked === true)}
            />
            <label
              htmlFor="push-after-commit"
              className="text-xs text-(--text-secondary) cursor-pointer select-none"
            >
              Push to origin/{repository?.currentBranch || 'main'}
            </label>
          </div>
          <button
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 border-none rounded bg-(--accent-color) text-white text-xs font-medium cursor-pointer transition-colors hover:not-disabled:bg-[#0066b8] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCommit}
            disabled={!canCommit || isCommitting}
          >
            {isCommitting ? 'Committing...' : isAmending ? 'Amend' : 'Commit'}
            {stagedCount > 0 && <span className="opacity-80 font-normal">({stagedCount})</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
