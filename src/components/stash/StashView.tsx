import { AlertCircle, Archive, GitBranch, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  CheckboxField,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  Input,
} from '@/components/ui';
import { formatTimestamp } from '@/lib/dateUtils';
import { getErrorMessage } from '@/lib/errorUtils';
import { useRepositoryStore } from '@/store/repositoryStore';
import { cn } from '../../lib/utils';
import { stashApi } from '../../services/api';
import type { StashEntry } from '../../types';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnSmallClass =
  'flex items-center gap-1 py-1 px-2 text-xs rounded cursor-pointer transition-colors border';

interface StashViewProps {
  onRefresh?: () => void;
}

export function StashView({ onRefresh }: StashViewProps) {
  const { t } = useTranslation();
  const [stashes, setStashes] = useState<StashEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [keepIndex, setKeepIndex] = useState(false);

  const loadStashes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stashList = await stashApi.list();
      setStashes(stashList);
    } catch (err) {
      console.error('Failed to load stashes:', err);
      setError(t('stash.view.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStashes();
  }, [loadStashes]);

  const handleSave = async () => {
    try {
      await stashApi.save({
        message: stashMessage || null,
        includeUntracked: includeUntracked,
        keepIndex: keepIndex,
        includeIgnored: false,
      });

      setShowCreateDialog(false);
      setStashMessage('');
      setIncludeUntracked(false);
      setKeepIndex(false);
      await loadStashes();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save stash:', err);
      setError(getErrorMessage(err));
    }
  };

  const { applyStash, popStash } = useRepositoryStore();

  const handleApply = async (index: number) => {
    const success = await applyStash(index);
    if (success) {
      onRefresh?.();
    }
  };

  const handlePop = async (index: number) => {
    const success = await popStash(index);
    if (success) {
      await loadStashes();
      onRefresh?.();
    }
  };

  const handleDrop = async (index: number) => {
    try {
      await stashApi.drop(index);
      await loadStashes();
      setSelectedIndex(null);
    } catch (err) {
      console.error('Failed to drop stash:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleBranch = async (index: number) => {
    const branchName = prompt(t('stash.view.enterBranchName'));
    if (!branchName) return;

    try {
      await stashApi.branch(branchName, index);
      await loadStashes();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to create branch from stash:', err);
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <Archive size={16} />
          <span>{t('stash.view.title')}</span>
          <span className="px-1.5 text-xs bg-(--bg-tertiary) rounded-full text-(--text-secondary)">
            {stashes.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            className={btnIconClass}
            onClick={() => setShowCreateDialog(true)}
            title={t('stash.view.createStash')}
          >
            <Plus size={16} />
          </button>
          <button
            className={btnIconClass}
            onClick={loadStashes}
            title={t('common.refresh')}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-error/10 text-error rounded text-xs">
          <AlertCircle size={14} />
          <span className="flex-1">{error}</span>
          <button
            className="p-0.5 bg-transparent border-none text-inherit cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => setError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {stashes.length === 0 ? (
          <div className="py-6 text-center text-(--text-muted) text-sm">
            {t('stash.view.noStashes')}
          </div>
        ) : (
          stashes.map((stash) => (
            <div
              key={stash.stashRef}
              className={cn(
                'p-3 mb-2 rounded-md cursor-pointer transition-colors border',
                selectedIndex === stash.index
                  ? 'bg-(--bg-active) border-(--accent-color)'
                  : 'bg-(--bg-primary) border-transparent hover:bg-(--bg-hover)'
              )}
              onClick={() => setSelectedIndex(stash.index)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-semibold text-(--accent-color)">
                  {stash.stashRef}
                </span>
                {stash.branch && (
                  <span className="px-1.5 py-0.5 text-xs bg-(--bg-tertiary) rounded text-(--text-secondary)">
                    {stash.branch}
                  </span>
                )}
              </div>
              <div className="text-sm text-(--text-primary) mb-1">{stash.message}</div>
              <div className="flex items-center gap-3 text-xs text-(--text-muted)">
                <span>{stash.author}</span>
                <span>{formatTimestamp(stash.timestamp)}</span>
              </div>
              {selectedIndex === stash.index && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-(--border-color)">
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(stash.index);
                    }}
                    title={t('stash.view.applyHint')}
                  >
                    <Play size={12} />
                    {t('common.apply')}
                  </button>
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-(--accent-color) border-(--accent-color) text-white hover:opacity-90'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePop(stash.index);
                    }}
                    title={t('stash.view.popHint')}
                  >
                    {t('stash.pop')}
                  </button>
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBranch(stash.index);
                    }}
                    title={t('stash.view.branchHint')}
                  >
                    <GitBranch size={12} />
                  </button>
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-error/10 border-error text-error hover:bg-error/20'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDrop(stash.index);
                    }}
                    title={t('stash.view.dropHint')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle icon={Archive}>{t('stash.createDialog.title')}</DialogTitle>

          <DialogBody>
            <FormField label={t('stash.createDialog.messageLabel')} htmlFor="stash-message">
              <Input
                id="stash-message"
                type="text"
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                placeholder={t('stash.createDialog.messagePlaceholder')}
              />
            </FormField>
            <CheckboxField
              id="include-untracked"
              label={t('stash.createDialog.includeUntracked')}
              checked={includeUntracked}
              onCheckedChange={(checked) => setIncludeUntracked(checked === true)}
            />
            <CheckboxField
              id="keep-index"
              label={t('stash.createDialog.keepIndex')}
              checked={keepIndex}
              onCheckedChange={(checked) => setKeepIndex(checked === true)}
            />
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t('common.cancel')}</Button>
            </DialogClose>
            <Button variant="primary" onClick={handleSave}>
              {t('stash.createDialog.createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
