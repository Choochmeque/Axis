import { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { FileCode, AlertCircle, Check, FolderOpen, Upload, Download } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { patchApi } from '../../services/api';
import type { PatchResult } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Input,
  Label,
  CheckboxField,
  Alert,
} from '@/components/ui';

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
  const [result, setResult] = useState<PatchResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setOutputDir('');
      setPatchPath('');
      setCheckOnly(false);
      setThreeWay(false);
      setUseAm(false);
      setError(null);
      setResult(null);
    }
  }, [isOpen, initialMode]);

  const handleBrowseOutputDir = async () => {
    try {
      const path = await open({
        directory: true,
        multiple: false,
        title: 'Select Output Directory',
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
        title: 'Select Patch File',
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
      setError('Output directory is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let patchResult: PatchResult;

      if (commitOid) {
        // Create patch from specific commit
        patchResult = await patchApi.createPatch({
          commit_oid: commitOid,
          output_dir: outputDir,
        });
      } else {
        // Create patch from HEAD (last commit)
        patchResult = await patchApi.formatPatch({
          range: '-1',
          output_dir: outputDir,
        });
      }

      if (patchResult.success) {
        setResult(patchResult);
        onSuccess?.();
      } else {
        setError(patchResult.message);
      }
    } catch (err) {
      console.error('Failed to create patch:', err);
      setError(err instanceof Error ? err.message : 'Failed to create patch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!patchPath.trim()) {
      setError('Patch file is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let patchResult: PatchResult;

      if (useAm) {
        // Use git am (creates commits)
        patchResult = await patchApi.applyMailbox({
          patch_paths: [patchPath],
          three_way: threeWay,
        });
      } else {
        // Use git apply (applies to working tree)
        patchResult = await patchApi.applyPatch({
          patch_path: patchPath,
          check_only: checkOnly,
          three_way: threeWay,
        });
      }

      if (patchResult.success) {
        setResult(patchResult);
        onSuccess?.();
      } else {
        setError(patchResult.message);
      }
    } catch (err) {
      console.error('Failed to apply patch:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply patch');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setError(null);
    setResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-112.5">
        <DialogTitle>
          <FileCode size={18} />
          Patches
        </DialogTitle>

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
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] text-(--text-secondary) border-b-2 border-transparent data-[state=active]:text-(--accent-color) data-[state=active]:border-(--accent-color) hover:text-(--text-primary) transition-colors"
            >
              <Download size={14} />
              Create Patch
            </Tabs.Trigger>
            <Tabs.Trigger
              value="apply"
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] text-(--text-secondary) border-b-2 border-transparent data-[state=active]:text-(--accent-color) data-[state=active]:border-(--accent-color) hover:text-(--text-primary) transition-colors"
            >
              <Upload size={14} />
              Apply Patch
            </Tabs.Trigger>
          </Tabs.List>

          <DialogBody className="pt-0">
            {error && (
              <Alert variant="error" className="mb-4">
                <AlertCircle size={16} />
                <span>{error}</span>
              </Alert>
            )}

            {result && result.success ? (
              <Alert variant="success" className="mb-4">
                <Check size={16} />
                <div className="flex flex-col gap-1">
                  <span>{result.message}</span>
                  {result.patches.length > 0 && (
                    <div className="text-xs opacity-80 mt-1">
                      {result.patches.map((p, i) => (
                        <div key={i} className="font-mono truncate">
                          {p.split('/').pop()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Alert>
            ) : (
              <>
                <Tabs.Content value="create">
                  {commitOid && (
                    <div className="field">
                      <Label>Source Commit:</Label>
                      <div className="flex items-center gap-2 p-2 bg-(--bg-tertiary) rounded text-[13px]">
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

                  <FormField label="Output Directory:" htmlFor="output-dir">
                    <div className="flex gap-2">
                      <Input
                        id="output-dir"
                        type="text"
                        value={outputDir}
                        onChange={(e) => setOutputDir(e.target.value)}
                        placeholder="Select directory..."
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        variant="secondary"
                        onClick={handleBrowseOutputDir}
                        disabled={isLoading}
                      >
                        <FolderOpen size={14} />
                      </Button>
                    </div>
                  </FormField>
                </Tabs.Content>

                <Tabs.Content value="apply">
                  <FormField label="Patch File:" htmlFor="patch-path">
                    <div className="flex gap-2">
                      <Input
                        id="patch-path"
                        type="text"
                        value={patchPath}
                        onChange={(e) => setPatchPath(e.target.value)}
                        placeholder="Select patch file..."
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        variant="secondary"
                        onClick={handleBrowsePatchFile}
                        disabled={isLoading}
                      >
                        <FolderOpen size={14} />
                      </Button>
                    </div>
                  </FormField>

                  <div className="flex flex-col gap-3 mt-4">
                    <CheckboxField
                      id="use-am"
                      label="Create commit from patch (git am)"
                      checked={useAm}
                      disabled={isLoading}
                      onCheckedChange={setUseAm}
                    />

                    <CheckboxField
                      id="check-only"
                      label="Check only (don't apply)"
                      checked={checkOnly}
                      disabled={isLoading || useAm}
                      onCheckedChange={setCheckOnly}
                    />

                    <CheckboxField
                      id="three-way"
                      label="Use 3-way merge if patch fails"
                      checked={threeWay}
                      disabled={isLoading}
                      onCheckedChange={setThreeWay}
                    />
                  </div>
                </Tabs.Content>
              </>
            )}
          </DialogBody>
        </Tabs.Root>

        <DialogFooter>
          {result && result.success ? (
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              {activeTab === 'create' ? (
                <Button
                  variant="primary"
                  onClick={handleCreatePatch}
                  disabled={isLoading || !outputDir.trim()}
                >
                  {isLoading ? 'Creating...' : 'Create Patch'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleApplyPatch}
                  disabled={isLoading || !patchPath.trim()}
                >
                  {isLoading ? 'Applying...' : checkOnly ? 'Check Patch' : 'Apply Patch'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
