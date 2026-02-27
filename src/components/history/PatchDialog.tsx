import * as Tabs from '@radix-ui/react-tabs';
import { open } from '@tauri-apps/plugin-dialog';
import { Download, FileCode, FolderOpen, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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
  Label,
} from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { patchApi } from '../../services/api';
import type { PatchResult } from '../../types';

interface PatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'apply';
  commitOid?: string;
  commitSummary?: string;
  onSuccess?: () => void;
}

export function PatchDialog({
  isOpen,
  onClose,
  mode: initialMode = 'create',
  commitOid,
  commitSummary,
  onSuccess,
}: PatchDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'create' | 'apply'>(initialMode);

  // Create patch state
  const [outputDir, setOutputDir] = useState('');

  // Apply patch state
  const [patchPath, setPatchPath] = useState('');
  const [checkOnly, setCheckOnly] = useState(false);
  const [threeWay, setThreeWay] = useState(false);
  const [useAm, setUseAm] = useState(false);

  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setOutputDir('');
      setPatchPath('');
      setCheckOnly(false);
      setThreeWay(false);
      setUseAm(false);
      setError(null);
    }
  }, [isOpen, initialMode]);

  const handleBrowseOutputDir = async () => {
    try {
      const path = await open({
        directory: true,
        multiple: false,
        title: t('history.patch.selectOutputDir'),
      });

      if (path && typeof path === 'string') {
        setOutputDir(path);
      }
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  };

  const handleBrowsePatchFile = async () => {
    try {
      const path = await open({
        directory: false,
        multiple: false,
        filters: [
          { name: 'Patch Files', extensions: ['patch', 'diff'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        title: t('history.patch.selectPatchFileDialog'),
      });

      if (path && typeof path === 'string') {
        setPatchPath(path);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleCreatePatch = async () => {
    if (!outputDir.trim()) {
      setError(t('history.patch.outputDirRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let patchResult: PatchResult;

      if (commitOid) {
        // Create patch from specific commit
        patchResult = await patchApi.createPatch({
          commitOid: commitOid,
          outputDir: outputDir,
        });
      } else {
        // Create patch from HEAD (last commit)
        patchResult = await patchApi.formatPatch({
          range: '-1',
          outputDir: outputDir,
        });
      }

      onSuccess?.();
      onClose();
      toast.success(patchResult.message || t('history.patch.patchCreated'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!patchPath.trim()) {
      setError(t('history.patch.patchFileRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let patchResult: PatchResult;

      if (useAm) {
        // Use git am (creates commits)
        patchResult = await patchApi.applyMailbox({
          patchPaths: [patchPath],
          threeWay: threeWay,
        });
      } else {
        // Use git apply (applies to working tree)
        patchResult = await patchApi.applyPatch({
          patchPath: patchPath,
          checkOnly: checkOnly,
          threeWay: threeWay,
        });
      }

      onSuccess?.();
      onClose();
      toast.success(
        patchResult.message ||
          (checkOnly ? t('history.patch.patchValid') : t('history.patch.patchApplied'))
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-112.5">
        <DialogTitle icon={FileCode}>{t('history.patch.title')}</DialogTitle>

        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as 'create' | 'apply');
            resetState();
          }}
        >
          <Tabs.List className="flex border-b border-(--border-color) mb-4">
            <Tabs.Trigger
              value="create"
              className="flex items-center gap-1.5 px-4 py-2 text-base text-(--text-secondary) border-b-2 border-transparent data-[state=active]:text-(--accent-color) data-[state=active]:border-(--accent-color) hover:text-(--text-primary) transition-colors"
            >
              <Download size={14} />
              {t('history.patch.createTab')}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="apply"
              className="flex items-center gap-1.5 px-4 py-2 text-base text-(--text-secondary) border-b-2 border-transparent data-[state=active]:text-(--accent-color) data-[state=active]:border-(--accent-color) hover:text-(--text-primary) transition-colors"
            >
              <Upload size={14} />
              {t('history.patch.applyTab')}
            </Tabs.Trigger>
          </Tabs.List>

          <DialogBody className="pt-0">
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <Tabs.Content value="create">
              {commitOid && (
                <div className="field">
                  <Label>{t('history.patch.sourceCommit')}</Label>
                  <div className="flex items-center gap-2 p-2 bg-(--bg-tertiary) rounded text-base">
                    <span className="font-mono text-(--text-secondary)">
                      {commitOid.slice(0, 7)}
                    </span>
                    {commitSummary && (
                      <span className="text-(--text-tertiary) overflow-hidden text-ellipsis whitespace-nowrap">
                        - {commitSummary}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <FormField label={t('history.patch.outputDirectory')} htmlFor="output-dir">
                <div className="flex gap-2">
                  <Input
                    id="output-dir"
                    type="text"
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    placeholder={t('history.patch.selectDirectory')}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={handleBrowseOutputDir} disabled={isLoading}>
                    <FolderOpen size={14} />
                  </Button>
                </div>
              </FormField>
            </Tabs.Content>

            <Tabs.Content value="apply">
              <FormField label={t('history.patch.patchFile')} htmlFor="patch-path">
                <div className="flex gap-2">
                  <Input
                    id="patch-path"
                    type="text"
                    value={patchPath}
                    onChange={(e) => setPatchPath(e.target.value)}
                    placeholder={t('history.patch.selectPatchFile')}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={handleBrowsePatchFile} disabled={isLoading}>
                    <FolderOpen size={14} />
                  </Button>
                </div>
              </FormField>

              <div className="flex flex-col gap-3 mt-4">
                <CheckboxField
                  id="use-am"
                  label={t('history.patch.createCommitFromPatch')}
                  checked={useAm}
                  disabled={isLoading}
                  onCheckedChange={setUseAm}
                />

                <CheckboxField
                  id="check-only"
                  label={t('history.patch.checkOnly')}
                  checked={checkOnly}
                  disabled={isLoading || useAm}
                  onCheckedChange={setCheckOnly}
                />

                <CheckboxField
                  id="three-way"
                  label={t('history.patch.threeWayMerge')}
                  checked={threeWay}
                  disabled={isLoading}
                  onCheckedChange={setThreeWay}
                />
              </div>
            </Tabs.Content>
          </DialogBody>
        </Tabs.Root>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          {activeTab === 'create' ? (
            <Button
              variant="primary"
              onClick={handleCreatePatch}
              disabled={isLoading || !outputDir.trim()}
            >
              {isLoading ? t('history.patch.creating') : t('history.patch.createButton')}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleApplyPatch}
              disabled={isLoading || !patchPath.trim()}
            >
              {isLoading
                ? t('history.patch.applying')
                : checkOnly
                  ? t('history.patch.checkButton')
                  : t('history.patch.applyButton')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
