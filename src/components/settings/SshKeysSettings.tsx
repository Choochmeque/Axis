import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Upload, Download, Trash2, Copy, KeyRound, AlertTriangle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { copyToClipboard } from '@/lib/actions';
import { sshKeysApi } from '@/services/api';
import { SshKeyAlgorithm, SshKeyFormat } from '@/types';
import type { SshKeyInfo, SshKeyAlgorithm as SshKeyAlgorithmType } from '@/types';
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
  Select,
  SelectItem,
  CheckboxField,
  Alert,
} from '@/components/ui';

const sectionTitleClass =
  'm-0 mb-4 pb-2 border-b border-(--border-color) text-sm font-semibold text-(--text-primary) first:mt-0 not-first:mt-6';

export function SshKeysSettings() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<SshKeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState<SshKeyInfo | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const loaded = await sshKeysApi.list();
      setKeys(loaded);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPublicKey = (key: SshKeyInfo) => {
    sshKeysApi
      .getPublicKey(key.path)
      .then((publicKey) =>
        copyToClipboard(publicKey, t('settings.sshKeys.notifications.publicKeyCopied'))
      )
      .catch((err) =>
        toast.error(t('settings.sshKeys.notifications.copyFailed'), getErrorMessage(err))
      );
  };

  const handleExport = (key: SshKeyInfo) => {
    setSelectedKey(key);
    setShowExportDialog(true);
  };

  const handleDelete = (key: SshKeyInfo) => {
    setSelectedKey(key);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedKey) return;
    try {
      await sshKeysApi.delete(selectedKey.path);
      toast.success(t('settings.sshKeys.notifications.deleted'));
      setShowDeleteDialog(false);
      setSelectedKey(null);
      await loadKeys();
    } catch (err) {
      toast.error(t('settings.sshKeys.notifications.deleteFailed'), getErrorMessage(err));
    }
  };

  const keyName = (key: SshKeyInfo) => key.comment || key.path.split('/').pop() || key.path;

  return (
    <div>
      <h3 className={sectionTitleClass}>{t('settings.sshKeys.title')}</h3>

      <p className="text-xs text-(--text-muted) mb-4">{t('settings.sshKeys.description')}</p>

      <div className="flex gap-2 mb-4">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowGenerateDialog(true)}
          title={t('common.create')}
        >
          <Plus size={14} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowImportDialog(true)}
          title={t('settings.sshKeys.import.title')}
        >
          <Download size={14} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-20 text-(--text-muted)">
          {t('common.loading')}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-(--text-muted)">
          <KeyRound size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t('settings.sshKeys.noKeys')}</p>
          <p className="text-xs mt-1">{t('settings.sshKeys.noKeysHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.path}
              title={key.path}
              className="flex items-center justify-between p-3 bg-(--bg-tertiary) rounded-lg border border-(--border-color)"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-(--bg-primary) text-(--text-muted) font-mono uppercase">
                    {key.keyType}
                  </span>
                  {key.format === SshKeyFormat.OpenSsh && (
                    <span
                      className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-warning/15 text-warning"
                      title={`${t('settings.sshKeys.openSshFormatHint')}\n${t('settings.sshKeys.openSshFormatCommand', { keyPath: key.path })}`}
                    >
                      <AlertTriangle size={11} />
                      {t('settings.sshKeys.openSshFormat')}
                    </span>
                  )}
                  <span className="text-sm font-medium text-(--text-primary) truncate">
                    {keyName(key)}
                  </span>
                </div>
                {key.fingerprint && (
                  <p className="text-xs text-(--text-muted) mt-1 font-mono truncate">
                    {key.fingerprint}
                  </p>
                )}
              </div>
              <div className="flex gap-1 ml-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyPublicKey(key)}
                  title={t('settings.sshKeys.actions.copyPublicKey')}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExport(key)}
                  title={t('settings.sshKeys.actions.export')}
                >
                  <Upload size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(key)}
                  title={t('settings.sshKeys.actions.delete')}
                  className="text-error hover:text-error"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <GenerateKeyDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onSuccess={loadKeys}
      />

      <ImportKeyDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={loadKeys}
      />

      {selectedKey && (
        <>
          <ExportKeyDialog
            isOpen={showExportDialog}
            onClose={() => {
              setShowExportDialog(false);
              setSelectedKey(null);
            }}
            keyInfo={selectedKey}
          />

          <Dialog
            open={showDeleteDialog}
            onOpenChange={(open) => {
              if (!open) {
                setShowDeleteDialog(false);
                setSelectedKey(null);
              }
            }}
          >
            <DialogContent className="max-w-100">
              <DialogTitle>{t('settings.sshKeys.delete.title')}</DialogTitle>
              <DialogBody>
                <Alert variant="error">{t('settings.sshKeys.delete.warning')}</Alert>
                <p className="text-sm mt-3">
                  {t('settings.sshKeys.delete.confirmMessage', { name: keyName(selectedKey) })}
                </p>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{t('common.cancel')}</Button>
                </DialogClose>
                <Button variant="primary" onClick={handleDeleteConfirm} className="bg-error">
                  {t('common.delete')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

interface GenerateKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function GenerateKeyDialog({ isOpen, onClose, onSuccess }: GenerateKeyDialogProps) {
  const { t } = useTranslation();
  const [algorithm, setAlgorithm] = useState<SshKeyAlgorithmType>(SshKeyAlgorithm.Ed25519);
  const [comment, setComment] = useState('');
  const [filename, setFilename] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [bits, setBits] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAlgorithm(SshKeyAlgorithm.Ed25519);
      setComment('');
      setFilename('');
      setPassphrase('');
      setBits(null);
      setError(null);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!filename.trim()) {
      setError(t('settings.sshKeys.generate.filenameRequired'));
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      await sshKeysApi.generate({
        algorithm,
        comment: comment.trim() || null,
        passphrase: passphrase || null,
        filename: filename.trim(),
        bits,
      });
      toast.success(t('settings.sshKeys.notifications.generated'));
      onClose();
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const showBits = algorithm === SshKeyAlgorithm.Rsa || algorithm === SshKeyAlgorithm.Ecdsa;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-110">
        <DialogTitle>{t('settings.sshKeys.generate.title')}</DialogTitle>
        <DialogBody>
          <FormField
            label={t('settings.sshKeys.generate.algorithm.label')}
            htmlFor="ssh-algorithm"
            hint={t('settings.sshKeys.generate.algorithm.hint')}
          >
            <Select
              id="ssh-algorithm"
              value={algorithm}
              onValueChange={(value) => setAlgorithm(value as SshKeyAlgorithmType)}
            >
              <SelectItem value={SshKeyAlgorithm.Ed25519}>Ed25519</SelectItem>
              <SelectItem value={SshKeyAlgorithm.Rsa}>RSA</SelectItem>
              <SelectItem value={SshKeyAlgorithm.Ecdsa}>ECDSA</SelectItem>
            </Select>
          </FormField>

          <FormField
            label={t('settings.sshKeys.generate.filename.label')}
            htmlFor="ssh-filename"
            hint={t('settings.sshKeys.generate.filename.hint')}
          >
            <Input
              id="ssh-filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder={t('settings.sshKeys.generate.filename.placeholder')}
            />
          </FormField>

          <FormField
            label={t('settings.sshKeys.generate.comment.label')}
            htmlFor="ssh-comment"
            hint={t('settings.sshKeys.generate.comment.hint')}
          >
            <Input
              id="ssh-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('settings.sshKeys.generate.comment.placeholder')}
            />
          </FormField>

          <FormField
            label={t('settings.sshKeys.generate.passphrase.label')}
            htmlFor="ssh-passphrase"
            hint={t('settings.sshKeys.generate.passphrase.hint')}
          >
            <Input
              id="ssh-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={t('settings.sshKeys.generate.passphrase.placeholder')}
            />
          </FormField>

          {showBits && (
            <FormField
              label={t('settings.sshKeys.generate.bits.label')}
              htmlFor="ssh-bits"
              hint={t('settings.sshKeys.generate.bits.hint')}
            >
              <Input
                id="ssh-bits"
                type="number"
                value={bits ?? ''}
                onChange={(e) => setBits(e.target.value ? parseInt(e.target.value) : null)}
                min={1024}
                max={16384}
                className="w-full max-w-30"
              />
            </FormField>
          )}

          {error && (
            <Alert variant="error" className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating
              ? t('settings.sshKeys.generate.generating')
              : t('settings.sshKeys.generate.generateButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ImportKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ImportKeyDialog({ isOpen, onClose, onSuccess }: ImportKeyDialogProps) {
  const { t } = useTranslation();
  const [sourcePath, setSourcePath] = useState('');
  const [targetFilename, setTargetFilename] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSourcePath('');
      setTargetFilename('');
      setError(null);
    }
  }, [isOpen]);

  const handleBrowse = async () => {
    const selected = await open({
      title: t('settings.sshKeys.import.selectFile'),
      multiple: false,
      directory: false,
    });
    if (selected) {
      setSourcePath(selected);
      // Auto-fill target filename from source
      const name = selected.split('/').pop()?.split('\\').pop() || '';
      if (!targetFilename) {
        setTargetFilename(name);
      }
    }
  };

  const handleImport = async () => {
    if (!targetFilename.trim()) {
      setError(t('settings.sshKeys.import.filenameRequired'));
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      await sshKeysApi.import({
        sourcePath,
        targetFilename: targetFilename.trim(),
      });
      toast.success(t('settings.sshKeys.notifications.imported'));
      onClose();
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-110">
        <DialogTitle>{t('settings.sshKeys.import.title')}</DialogTitle>
        <DialogBody>
          <FormField label={t('settings.sshKeys.import.selectFile')} htmlFor="import-source">
            <div className="flex gap-2">
              <Input
                id="import-source"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder={t('settings.sshKeys.import.selectFile')}
                className="flex-1"
                readOnly
              />
              <Button variant="secondary" onClick={handleBrowse}>
                {t('common.browse')}
              </Button>
            </div>
          </FormField>

          <FormField
            label={t('settings.sshKeys.import.filename.label')}
            htmlFor="import-target"
            hint={t('settings.sshKeys.import.filename.hint')}
          >
            <Input
              id="import-target"
              value={targetFilename}
              onChange={(e) => setTargetFilename(e.target.value)}
              placeholder={t('settings.sshKeys.import.filename.placeholder')}
            />
          </FormField>

          {error && (
            <Alert variant="error" className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="primary" onClick={handleImport} disabled={isImporting || !sourcePath}>
            {isImporting
              ? t('settings.sshKeys.import.importing')
              : t('settings.sshKeys.import.importButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExportKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  keyInfo: SshKeyInfo;
}

function ExportKeyDialog({ isOpen, onClose, keyInfo }: ExportKeyDialogProps) {
  const { t } = useTranslation();
  const [targetDir, setTargetDir] = useState('');
  const [publicOnly, setPublicOnly] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetDir('');
      setPublicOnly(true);
      setError(null);
    }
  }, [isOpen]);

  const handleBrowse = async () => {
    const selected = await open({
      title: t('settings.sshKeys.export.selectDirectory'),
      multiple: false,
      directory: true,
    });
    if (selected) {
      setTargetDir(selected);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await sshKeysApi.export({
        keyPath: keyInfo.path,
        targetDir,
        publicOnly,
      });
      toast.success(t('settings.sshKeys.notifications.exported'));
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-110">
        <DialogTitle>{t('settings.sshKeys.export.title')}</DialogTitle>
        <DialogBody>
          <FormField label={t('settings.sshKeys.export.selectDirectory')} htmlFor="export-dir">
            <div className="flex gap-2">
              <Input
                id="export-dir"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder={t('settings.sshKeys.export.selectDirectory')}
                className="flex-1"
                readOnly
              />
              <Button variant="secondary" onClick={handleBrowse}>
                {t('common.browse')}
              </Button>
            </div>
          </FormField>

          <div className="mt-3">
            <CheckboxField
              id="export-public-only"
              label={t('settings.sshKeys.export.publicOnly')}
              description={t('settings.sshKeys.export.publicOnlyDesc')}
              checked={publicOnly}
              onCheckedChange={(checked) => setPublicOnly(checked === true)}
            />
          </div>

          {error && (
            <Alert variant="error" className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="primary" onClick={handleExport} disabled={isExporting || !targetDir}>
            {isExporting
              ? t('settings.sshKeys.export.exporting')
              : t('settings.sshKeys.export.exportButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
