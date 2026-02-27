import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Sparkles } from 'lucide-react';
import { toast, useReferenceMention } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { testId } from '@/lib/utils';
import { useStagingStore } from '@/store/stagingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { operations } from '@/store/operationStore';
import { ReferenceMention } from './ReferenceMention';
import {
  Avatar,
  Checkbox,
  CheckboxField,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@/components/ui';
import { remoteApi, commitApi, signingApi, aiApi, hooksApi } from '@/services/api';
import type { SigningConfig } from '@/types';
import {
  COMMIT_TYPES,
  formatConventionalCommit,
  parseConventionalCommit,
  getEmptyCommitParts,
  type ConventionalCommitParts,
  type CommitType,
} from '@/lib/conventionalCommits';

export function CommitForm() {
  const { t } = useTranslation();
  const {
    status,
    commitMessage,
    isAmending,
    isCommitting,
    pushAfterCommit,
    structuredMode,
    commitParts,
    setCommitMessage,
    setIsAmending,
    setPushAfterCommit,
    setStructuredMode,
    setCommitParts,
    createCommit,
    amendCommit,
  } = useStagingStore();
  const { repository, branches, remotes } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.isHead);
  const { settings } = useSettingsStore();

  const [bypassHooks, setBypassHooks] = useState(false);
  // Initialize from settings, can be overridden per-commit
  const [signCommit, setSignCommit] = useState(settings?.signCommits ?? false);
  const [signOff, setSignOff] = useState(false);
  const [signingAvailable, setSigningAvailable] = useState(false);
  const [signingConfig, setSigningConfig] = useState<SigningConfig | null>(null);
  const [hasCommitHooks, setHasCommitHooks] = useState(false);
  const [author, setAuthor] = useState<{ name: string; email: string } | null>(null);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Integration state for reference mentions
  const {
    connectionStatus,
    detectedProvider,
    issues,
    pullRequests,
    isLoadingIssues,
    isLoadingPrs,
    loadIssues,
    loadPullRequests,
  } = useIntegrationStore();

  const isIntegrationConnected = !!(connectionStatus?.connected && detectedProvider);

  const loadIntegrationData = useCallback(() => {
    loadIssues();
    loadPullRequests();
  }, [loadIssues, loadPullRequests]);

  const referenceMention = useReferenceMention({
    issues,
    pullRequests,
    isConnected: isIntegrationConnected,
    isLoading: isLoadingIssues || isLoadingPrs,
    onLoadData: loadIntegrationData,
  });

  // Sync signCommit with settings when settings change
  useEffect(() => {
    if (settings) {
      setSignCommit(settings.signCommits);
    }
  }, [settings]);

  // Uncheck push after commit if no remotes
  useEffect(() => {
    if (remotes.length === 0) {
      setPushAfterCommit(false);
    }
  }, [remotes.length, setPushAfterCommit]);

  // Load author info when repository changes
  useEffect(() => {
    if (repository) {
      commitApi.getUserSignature().then(([name, email]) => {
        setAuthor({ name, email });
      });
    }
  }, [repository]);

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

  // Check for enabled commit hooks when repository changes or hooks are modified
  const checkCommitHooks = useCallback(async () => {
    if (!repository) return;
    try {
      const hooks = await hooksApi.list();
      // Check if any commit-related hooks exist and are enabled
      const commitHookTypes = ['PreCommit', 'PrepareCommitMsg', 'CommitMsg', 'PostCommit'];
      const hasEnabled = hooks.some(
        (h) => commitHookTypes.includes(h.hookType) && h.exists && h.enabled
      );
      setHasCommitHooks(hasEnabled);
    } catch {
      setHasCommitHooks(false);
    }
  }, [repository]);

  useEffect(() => {
    checkCommitHooks();
  }, [checkCommitHooks]);

  // Listen for hooks-changed event (from settings dialog)
  useEffect(() => {
    const handleHooksChanged = () => {
      checkCommitHooks();
    };
    document.addEventListener('hooks-changed', handleHooksChanged);
    return () => {
      document.removeEventListener('hooks-changed', handleHooksChanged);
    };
  }, [checkCommitHooks]);

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
    const cursorPosition = e.target.selectionStart ?? 0;
    setCommitMessage(value);
    referenceMention.handleInputChange(value, cursorPosition);
  };

  const handleStructuredModeToggle = (enabled: boolean) => {
    if (!settings?.conventionalCommitsEnabled) {
      toast.info(t('staging.conventionalNotEnabled'));
      return;
    }

    if (enabled) {
      // Try to parse existing message into structured parts
      const parsed = parseConventionalCommit(commitMessage);
      if (parsed) {
        setCommitParts(parsed);
      } else {
        // Reset to empty if can't parse
        setCommitParts(getEmptyCommitParts());
      }
    } else {
      // Format structured parts back to message
      const formatted = formatConventionalCommit(commitParts);
      if (formatted) {
        setCommitMessage(formatted);
      }
    }
    setStructuredMode(enabled);
  };

  const handleCommitPartChange = <K extends keyof ConventionalCommitParts>(
    key: K,
    value: ConventionalCommitParts[K]
  ) => {
    const newParts = { ...commitParts, [key]: value };
    setCommitParts(newParts);
    // Update the message in real-time
    const formatted = formatConventionalCommit(newParts);
    setCommitMessage(formatted);
  };

  const handleCommit = async () => {
    try {
      let finalMessage = commitMessage;

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
        await amendCommit(bypassHooks);
      } else {
        await createCommit(signCommit, bypassHooks);
      }
      setCommitMessage('');

      if (pushAfterCommit) {
        try {
          // Set upstream tracking if branch doesn't have one yet
          const needsUpstream = !currentBranch?.upstream;
          await remoteApi.pushCurrentBranch('origin', {
            force: false,
            setUpstream: needsUpstream,
            tags: false,
          });
        } catch (err) {
          console.error('Push failed:', err);
        }
      }
    } catch {
      // Error is already handled in the store
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check if reference mention should handle the key
    if (referenceMention.handleKeyDown(e)) {
      // Handle selection on Enter/Tab
      if (
        (e.key === 'Enter' || e.key === 'Tab') &&
        referenceMention.items[referenceMention.selectedIndex]
      ) {
        const newValue = referenceMention.handleSelect(
          referenceMention.items[referenceMention.selectedIndex]
        );
        if (newValue !== null) {
          setCommitMessage(newValue);
        }
      }
      return;
    }

    // Ctrl/Cmd + Enter to commit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    }
  };

  const handleGenerateMessage = async () => {
    const opId = operations.start('Generating commit message', {
      category: 'network',
      description: 'Generating AI commit message from staged changes',
    });

    try {
      setIsGeneratingMessage(true);
      const response = await aiApi.generateCommitMessage();
      setCommitMessage(response.message);

      // If in structured mode, try to parse the generated message
      if (structuredMode) {
        const parsed = parseConventionalCommit(response.message);
        if (parsed) {
          setCommitParts(parsed);
        }
      }

      toast.success(t('notifications.success.aiGenerated', { model: response.modelUsed }));
    } catch (err) {
      console.error('Failed to generate commit message:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setIsGeneratingMessage(false);
      operations.complete(opId);
    }
  };

  // Parse message when entering amend mode in structured mode
  useEffect(() => {
    if (isAmending && structuredMode && commitMessage) {
      const parsed = parseConventionalCommit(commitMessage);
      if (parsed) {
        setCommitParts(parsed);
      } else {
        // Fall back to free-form if message doesn't parse
        setStructuredMode(false);
        toast.info(t('staging.notConventionalFormat'));
      }
    }
  }, [isAmending, structuredMode, commitMessage, setCommitParts, setStructuredMode, t]);

  const stagedCount = status?.staged.length ?? 0;
  const canCommit = stagedCount > 0 && (commitMessage.trim() || isAmending);

  return (
    <div
      {...testId('e2e-commit-form')}
      className="flex flex-col h-full border-t border-(--border-color) bg-(--bg-secondary)"
    >
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color) shrink-0">
        <div className="flex items-center gap-2">
          {author && (
            <>
              <Avatar email={author.email} name={author.name} size={20} />
              <span className="text-xs text-(--text-primary)">
                {author.name} &lt;{author.email}&gt;
              </span>
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 py-1 px-2 border-none bg-transparent text-(--text-secondary) text-xs cursor-pointer rounded transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)">
              <span>{t('staging.commitOptions.title')}</span>
              <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-45" align="end">
            <DropdownMenuCheckboxItem checked={isAmending} onCheckedChange={setIsAmending}>
              {t('staging.commitOptions.amendLastCommit')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={bypassHooks}
              onCheckedChange={setBypassHooks}
              disabled={!hasCommitHooks}
            >
              {t('staging.commitOptions.bypassHooks')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={signCommit}
              onCheckedChange={setSignCommit}
              disabled={!signingAvailable}
            >
              {!signingAvailable && signingConfig
                ? t('staging.commitOptions.signCommitNoKey')
                : !signingAvailable
                  ? t('staging.commitOptions.signCommitUnavailable')
                  : t('staging.commitOptions.signCommit')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={signOff} onCheckedChange={setSignOff}>
              {t('staging.commitOptions.signOff')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={structuredMode}
              onCheckedChange={handleStructuredModeToggle}
              disabled={!settings?.conventionalCommitsEnabled}
            >
              {t('staging.commitOptions.structuredFormat')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleGenerateMessage}
              disabled={!settings?.aiEnabled || stagedCount === 0 || isGeneratingMessage}
              icon={Sparkles}
            >
              {isGeneratingMessage
                ? t('staging.commitOptions.generating')
                : t('staging.commitOptions.generateWithAi')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1 min-h-0">
        {structuredMode ? (
          <div className="cc-form">
            <div className="cc-row">
              <Select
                value={commitParts.type}
                onValueChange={(value) => handleCommitPartChange('type', value as CommitType | '')}
                className="cc-type-select"
                disabled={isCommitting}
                placeholder={t('staging.commitForm.type')}
              >
                {COMMIT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </Select>
              <Input
                type="text"
                value={commitParts.scope}
                onChange={(e) => handleCommitPartChange('scope', e.target.value)}
                placeholder={t('staging.commitForm.scope')}
                className="cc-scope-input"
                disabled={isCommitting}
                list="cc-scopes"
              />
              <datalist id="cc-scopes">
                {settings?.conventionalCommitsScopes?.map((scope) => (
                  <option key={scope} value={scope} />
                ))}
              </datalist>
              <label className="cc-breaking-label">
                <Checkbox
                  checked={commitParts.breaking}
                  onCheckedChange={(checked) =>
                    handleCommitPartChange('breaking', checked === true)
                  }
                  disabled={isCommitting}
                />
                <span>!</span>
              </label>
            </div>
            <Input
              type="text"
              value={commitParts.subject}
              onChange={(e) => handleCommitPartChange('subject', e.target.value)}
              placeholder={t('staging.commitForm.subject')}
              className="cc-subject-input"
              disabled={isCommitting}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleCommit();
                }
              }}
            />
            <div className="cc-char-count">
              <span
                className={
                  commitParts.subject.length > 72
                    ? 'text-error'
                    : commitParts.subject.length > 50
                      ? 'text-warning'
                      : ''
                }
              >
                {commitParts.subject.length}
              </span>
              /72
            </div>
            <Textarea
              resizable={false}
              className="p-2 bg-(--bg-primary) text-sm cc-body placeholder:text-(--text-tertiary)"
              placeholder={t('staging.commitForm.bodyOptional')}
              value={commitParts.body}
              onChange={(e) => handleCommitPartChange('body', e.target.value)}
              disabled={isCommitting}
              spellCheck={settings?.spellCheckCommitMessages ?? false}
            />
          </div>
        ) : (
          <div className="relative flex-1 min-h-15 overflow-visible">
            <Textarea
              ref={textareaRef}
              resizable={false}
              {...testId('e2e-commit-message-input')}
              className="h-full p-2 bg-(--bg-primary) text-base placeholder:text-(--text-tertiary)"
              placeholder={
                isAmending
                  ? t('staging.commitForm.amendPlaceholder')
                  : t('staging.commitForm.placeholder')
              }
              value={commitMessage}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              disabled={isCommitting}
              spellCheck={settings?.spellCheckCommitMessages ?? false}
            />
            <ReferenceMention
              isOpen={referenceMention.isOpen}
              items={referenceMention.items}
              selectedIndex={referenceMention.selectedIndex}
              anchorElement={textareaRef.current}
              cursorPosition={referenceMention.cursorPosition}
              onSelect={(item) => {
                const newValue = referenceMention.handleSelect(item);
                if (newValue !== null) {
                  setCommitMessage(newValue);
                }
              }}
              onClose={referenceMention.close}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 shrink-0">
          <CheckboxField
            id="push-after-commit"
            label={t('staging.commitForm.pushToOrigin', {
              branch: repository?.currentBranch || 'main',
            })}
            checked={pushAfterCommit}
            onCheckedChange={(checked) => setPushAfterCommit(checked)}
            disabled={remotes.length === 0}
            className="mb-0"
          />
          <button
            {...testId('e2e-commit-button')}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 border-none rounded bg-(--accent-color) text-white text-xs font-medium cursor-pointer transition-colors hover:not-disabled:bg-(--accent-color-hover) disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCommit}
            disabled={!canCommit || isCommitting}
          >
            {isCommitting
              ? t('staging.commitForm.committing')
              : isAmending
                ? t('staging.commitForm.amendButton')
                : t('staging.commitForm.commitButton')}
            {stagedCount > 0 && <span className="opacity-80 font-normal">({stagedCount})</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
