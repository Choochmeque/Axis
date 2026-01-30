import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import CodeEditor from '@uiw/react-textarea-code-editor';
import {
  Settings,
  User,
  Globe,
  Plus,
  Pencil,
  Trash2,
  FileCode2,
  ToggleLeft,
  ToggleRight,
  Terminal,
} from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { KeyRound } from 'lucide-react';
import { repoSettingsApi, remoteApi, hooksApi, sshKeysApi, remoteSshKeysApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { RepositorySettings, Remote, HookInfo, HookTemplate, SshKeyInfo } from '@/types';
import { GitHookType, SshKeyFormat } from '@/types';
import { cn } from '@/lib/utils';
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
  Alert,
  Select,
  SelectItem,
} from '@/components/ui';
import { RepoActionsSettings } from './RepoActionsSettings';

interface RepositorySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'identity' | 'remotes' | 'hooks' | 'actions';

export function RepositorySettingsDialog({ isOpen, onClose }: RepositorySettingsDialogProps) {
  const { t } = useTranslation();
  const repository = useRepositoryStore((s) => s.repository);
  const [activeTab, setActiveTab] = useState<SettingsTab>('identity');
  const [settings, setSettings] = useState<RepositorySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && repository) {
      loadSettings();
    }
  }, [isOpen, repository]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await repoSettingsApi.get();
      setSettings(loaded);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'identity', label: t('repoSettings.tabs.identity'), icon: <User size={16} /> },
    { id: 'remotes', label: t('repoSettings.tabs.remotes'), icon: <Globe size={16} /> },
    { id: 'hooks', label: t('repoSettings.tabs.hooks'), icon: <FileCode2 size={16} /> },
    { id: 'actions', label: t('repoSettings.tabs.actions'), icon: <Terminal size={16} /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-150 max-h-[80vh] flex flex-col overflow-hidden">
        <DialogTitle icon={Settings}>
          {t('repoSettings.title')}
          {repository && (
            <span className="ml-2 text-sm font-normal text-(--text-secondary)">
              {repository.name}
            </span>
          )}
        </DialogTitle>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-35 shrink-0 p-3 bg-(--bg-tertiary) border-r border-(--border-color) flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'flex items-center gap-2 py-2.5 px-3 bg-transparent border-none rounded-md text-base cursor-pointer text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-(--accent-color) text-white'
                    : 'text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 py-5 px-6 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-50 text-(--text-muted)">
                {t('repoSettings.loading')}
              </div>
            ) : settings ? (
              <>
                {activeTab === 'identity' && (
                  <IdentitySettings settings={settings} onSettingsChange={setSettings} />
                )}
                {activeTab === 'remotes' && (
                  <RemotesSettings remotes={settings.remotes} onRemotesChange={loadSettings} />
                )}
                {activeTab === 'hooks' && <HooksSettings />}
                {activeTab === 'actions' && <RepoActionsSettings />}
              </>
            ) : null}
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mx-4">
            {error}
          </Alert>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const sectionTitleClass =
  'm-0 mb-4 pb-2 border-b border-(--border-color) text-sm font-semibold text-(--text-primary) first:mt-0 not-first:mt-6';

interface IdentitySettingsProps {
  settings: RepositorySettings;
  onSettingsChange: (settings: RepositorySettings) => void;
}

function IdentitySettings({ settings, onSettingsChange }: IdentitySettingsProps) {
  const { t } = useTranslation();
  const [userName, setUserName] = useState(settings.userName || '');
  const [userEmail, setUserEmail] = useState(settings.userEmail || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setUserName(settings.userName || '');
    setUserEmail(settings.userEmail || '');
  }, [settings]);

  useEffect(() => {
    const nameChanged = (userName || null) !== (settings.userName || null);
    const emailChanged = (userEmail || null) !== (settings.userEmail || null);
    setHasChanges(nameChanged || emailChanged);
  }, [userName, userEmail, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await repoSettingsApi.saveUserConfig(userName || null, userEmail || null);
      onSettingsChange({
        ...settings,
        userName: userName || null,
        userEmail: userEmail || null,
      });
      setHasChanges(false);
      toast.success(t('repoSettings.identity.saved'));
    } catch (err) {
      toast.error(t('repoSettings.identity.saveFailed'), getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setUserName(settings.userName || '');
    setUserEmail(settings.userEmail || '');
  };

  return (
    <div>
      <h3 className={sectionTitleClass}>{t('repoSettings.identity.title')}</h3>
      <p className="text-sm text-(--text-secondary) mb-4">
        {t('repoSettings.identity.description')}
      </p>

      <FormField
        label={t('repoSettings.identity.nameLabel')}
        htmlFor="userName"
        hint={
          settings.globalUserName
            ? t('repoSettings.identity.nameHint', { name: settings.globalUserName })
            : t('repoSettings.identity.noGlobalName')
        }
      >
        <Input
          id="userName"
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder={settings.globalUserName || t('repoSettings.identity.namePlaceholder')}
        />
      </FormField>

      <FormField
        label={t('repoSettings.identity.emailLabel')}
        htmlFor="userEmail"
        hint={
          settings.globalUserEmail
            ? t('repoSettings.identity.emailHint', { email: settings.globalUserEmail })
            : t('repoSettings.identity.noGlobalEmail')
        }
      >
        <Input
          id="userEmail"
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder={settings.globalUserEmail || t('repoSettings.identity.emailPlaceholder')}
        />
      </FormField>

      <div className="flex gap-2 mt-4">
        <Button variant="secondary" onClick={handleReset} disabled={!hasChanges || isSaving}>
          {t('common.reset')}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  );
}

interface RemotesSettingsProps {
  remotes: Remote[];
  onRemotesChange: () => void;
}

function RemotesSettings({ remotes, onRemotesChange }: RemotesSettingsProps) {
  const { t } = useTranslation();
  const [editingRemote, setEditingRemote] = useState<Remote | null>(null);
  const [isAddingRemote, setIsAddingRemote] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sshKeyInfos, setSshKeyInfos] = useState<SshKeyInfo[]>([]);
  const [remoteSshKeyMap, setRemoteSshKeyMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSshData = async () => {
      try {
        const [keys, mappings] = await Promise.all([sshKeysApi.list(), remoteSshKeysApi.list()]);
        setSshKeyInfos(keys);
        const map: Record<string, string> = {};
        for (const m of mappings) {
          map[m.remoteName] = m.sshKeyPath;
        }
        setRemoteSshKeyMap(map);
      } catch (err) {
        console.error('Failed to load SSH key data:', err);
      }
    };
    loadSshData();
  }, []);

  const handleSshKeyChange = async (remoteName: string, value: string) => {
    try {
      if (value === 'global_default') {
        // "Use global default" — remove the per-remote override
        await remoteSshKeysApi.delete(remoteName);
        setRemoteSshKeyMap((prev) => {
          const next = { ...prev };
          delete next[remoteName];
          return next;
        });
        toast.success(t('repoSettings.remotes.sshKey.removed'));
      } else {
        // Set specific key or "auto" sentinel
        await remoteSshKeysApi.set(remoteName, value);
        setRemoteSshKeyMap((prev) => ({ ...prev, [remoteName]: value }));
        toast.success(t('repoSettings.remotes.sshKey.saved'));
      }
    } catch (err) {
      toast.error(t('repoSettings.remotes.sshKey.saveFailed'), getErrorMessage(err));
    }
  };

  const handleAddRemote = async () => {
    if (!newRemoteName.trim() || !newRemoteUrl.trim()) return;
    setIsSaving(true);
    try {
      await remoteApi.add(newRemoteName.trim(), newRemoteUrl.trim());
      setNewRemoteName('');
      setNewRemoteUrl('');
      setIsAddingRemote(false);
      onRemotesChange();
      toast.success(t('repoSettings.remotes.added', { name: newRemoteName }));
    } catch (err) {
      toast.error(t('repoSettings.remotes.addFailed'), getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRemote = async () => {
    if (!editingRemote || !editUrl.trim()) return;
    setIsSaving(true);
    try {
      await remoteApi.setUrl(editingRemote.name, editUrl.trim());
      setEditingRemote(null);
      setEditUrl('');
      onRemotesChange();
      toast.success(t('repoSettings.remotes.updated', { name: editingRemote.name }));
    } catch (err) {
      toast.error(t('repoSettings.remotes.updateFailed'), getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRemote = async (remoteName: string) => {
    setIsSaving(true);
    try {
      await remoteApi.remove(remoteName);
      onRemotesChange();
      toast.success(t('repoSettings.remotes.removed', { name: remoteName }));
    } catch (err) {
      toast.error(t('repoSettings.remotes.removeFailed'), getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (remote: Remote) => {
    setEditingRemote(remote);
    setEditUrl(remote.url || '');
    setIsAddingRemote(false);
  };

  const cancelEditing = () => {
    setEditingRemote(null);
    setEditUrl('');
  };

  const cancelAdding = () => {
    setIsAddingRemote(false);
    setNewRemoteName('');
    setNewRemoteUrl('');
  };

  return (
    <div>
      <h3 className={sectionTitleClass}>{t('repoSettings.remotes.title')}</h3>

      {remotes.length === 0 && !isAddingRemote ? (
        <p className="text-sm text-(--text-secondary) mb-4">{t('repoSettings.remotes.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {remotes.map((remote) => (
            <div
              key={remote.name}
              className="flex items-center gap-2 p-3 bg-(--bg-secondary) rounded border border-(--border-color)"
            >
              {editingRemote?.name === remote.name ? (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="font-medium text-(--text-primary)">{remote.name}</div>
                  <Input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder={t('repoSettings.remotes.urlPlaceholder')}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleEditRemote}
                      disabled={!editUrl.trim() || isSaving}
                    >
                      {t('common.save')}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={cancelEditing}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-(--text-primary)">{remote.name}</div>
                    <div className="text-sm text-(--text-secondary) truncate">{remote.url}</div>
                    {remote.pushUrl && remote.pushUrl !== remote.url && (
                      <div className="text-xs text-(--text-muted) truncate">
                        {t('repoSettings.remotes.pushLabel')} {remote.pushUrl}
                      </div>
                    )}
                    {sshKeyInfos.length > 0 &&
                      (remote.url?.startsWith('git@') || remote.url?.startsWith('ssh://')) && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <KeyRound size={12} className="text-(--text-muted) shrink-0" />
                          <Select
                            value={remoteSshKeyMap[remote.name] || 'global_default'}
                            onValueChange={(value) => handleSshKeyChange(remote.name, value)}
                            className="flex-1 text-xs"
                            placeholder={t('repoSettings.remotes.sshKey.useGlobalDefault')}
                          >
                            <SelectItem value="global_default">
                              {t('repoSettings.remotes.sshKey.useGlobalDefault')}
                            </SelectItem>
                            <SelectItem value="auto">
                              {t('repoSettings.remotes.sshKey.auto')}
                            </SelectItem>
                            {sshKeyInfos
                              .filter((key) => key.format !== SshKeyFormat.OpenSsh)
                              .map((key) => (
                                <SelectItem key={key.path} value={key.path}>
                                  {key.comment || key.path.split('/').pop() || key.path}
                                </SelectItem>
                              ))}
                          </Select>
                        </div>
                      )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(remote)}
                    title={t('repoSettings.remotes.editTitle')}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRemote(remote.name)}
                    title={t('repoSettings.remotes.deleteTitle')}
                    disabled={isSaving}
                  >
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {isAddingRemote ? (
        <div className="flex flex-col gap-2 p-3 bg-(--bg-secondary) rounded border border-(--border-color)">
          <Input
            type="text"
            value={newRemoteName}
            onChange={(e) => setNewRemoteName(e.target.value)}
            placeholder={t('repoSettings.remotes.namePlaceholder')}
            autoFocus
          />
          <Input
            type="text"
            value={newRemoteUrl}
            onChange={(e) => setNewRemoteUrl(e.target.value)}
            placeholder={t('repoSettings.remotes.urlFieldPlaceholder')}
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddRemote}
              disabled={!newRemoteName.trim() || !newRemoteUrl.trim() || isSaving}
            >
              {t('repoSettings.remotes.add')}
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelAdding}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setIsAddingRemote(true);
            setEditingRemote(null);
          }}
          title="Add remote"
        >
          <Plus size={14} />
        </Button>
      )}
    </div>
  );
}

// Human-readable hook names (keys match GitHookType enum values)
/* eslint-disable @typescript-eslint/naming-convention */
const HOOK_LABELS: Record<string, string> = {
  PreCommit: 'Pre-commit',
  PrepareCommitMsg: 'Prepare Commit Message',
  CommitMsg: 'Commit Message',
  PostCommit: 'Post-commit',
  PrePush: 'Pre-push',
  PostMerge: 'Post-merge',
  PreRebase: 'Pre-rebase',
  PostCheckout: 'Post-checkout',
  PostRewrite: 'Post-rewrite',
};
/* eslint-enable @typescript-eslint/naming-convention */

const ALL_HOOK_TYPES = Object.keys(GitHookType) as Array<keyof typeof GitHookType>;

function HooksSettings() {
  const { t } = useTranslation();
  const [hooks, setHooks] = useState<HookInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingHook, setEditingHook] = useState<HookInfo | null>(null);
  const [creatingHook, setCreatingHook] = useState<keyof typeof GitHookType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadHooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await hooksApi.list();
      setHooks(loaded);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHooks();
  }, [loadHooks]);

  const handleToggle = async (hook: HookInfo) => {
    setIsSaving(true);
    try {
      const newEnabled = await hooksApi.toggle(hook.hookType);
      setHooks((prev) =>
        prev.map((h) => (h.hookType === hook.hookType ? { ...h, enabled: newEnabled } : h))
      );
      toast.success(
        newEnabled
          ? t('repoSettings.hooks.notifications.enabled')
          : t('repoSettings.hooks.notifications.disabled')
      );
      document.dispatchEvent(new CustomEvent('hooks-changed'));
    } catch (err) {
      toast.error(t('repoSettings.hooks.notifications.toggleFailed'), getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (hook: HookInfo) => {
    setIsSaving(true);
    try {
      await hooksApi.delete(hook.hookType);
      setHooks((prev) =>
        prev.map((h) =>
          h.hookType === hook.hookType ? { ...h, exists: false, enabled: false } : h
        )
      );
      toast.success(t('repoSettings.hooks.notifications.deleted'));
      document.dispatchEvent(new CustomEvent('hooks-changed'));
    } catch (err) {
      toast.error(t('repoSettings.hooks.notifications.deleteFailed'), getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (
    hookType: keyof typeof GitHookType,
    content: string,
    isNew: boolean
  ) => {
    setIsSaving(true);
    try {
      if (isNew) {
        await hooksApi.create(hookType, content);
        toast.success(t('repoSettings.hooks.notifications.created'));
      } else {
        await hooksApi.update(hookType, content);
        toast.success(t('repoSettings.hooks.notifications.updated'));
      }
      await loadHooks();
      setEditingHook(null);
      setCreatingHook(null);
      document.dispatchEvent(new CustomEvent('hooks-changed'));
    } catch (err) {
      toast.error(
        isNew
          ? t('repoSettings.hooks.notifications.createFailed')
          : t('repoSettings.hooks.notifications.updateFailed'),
        getErrorMessage(err)
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-50 text-(--text-muted)">
        {t('repoSettings.hooks.loading')}
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  // Get hooks that don't exist yet
  const existingHookTypes = new Set(hooks.filter((h) => h.exists).map((h) => h.hookType));
  const availableHookTypes = ALL_HOOK_TYPES.filter(
    (type) => !existingHookTypes.has(GitHookType[type])
  );

  return (
    <div>
      <h3 className={sectionTitleClass}>{t('repoSettings.hooks.title')}</h3>
      <p className="text-sm text-(--text-secondary) mb-4">{t('repoSettings.hooks.description')}</p>

      <div className="flex flex-col gap-2 mb-4">
        {hooks.map((hook) => (
          <div
            key={hook.hookType}
            className={cn(
              'flex items-center gap-3 p-3 rounded border',
              hook.exists
                ? 'bg-(--bg-secondary) border-(--border-color)'
                : 'bg-(--bg-tertiary) border-transparent'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-(--text-primary)">
                {HOOK_LABELS[hook.hookType] || hook.hookType}
              </div>
              {hook.exists && (
                <div className="text-xs text-(--text-muted) truncate" title={hook.path}>
                  {hook.enabled
                    ? hook.isExecutable
                      ? t('repoSettings.hooks.status.active')
                      : t('repoSettings.hooks.status.notExecutable')
                    : t('repoSettings.hooks.status.disabled')}
                </div>
              )}
              {!hook.exists && (
                <div className="text-xs text-(--text-muted)">
                  {t('repoSettings.hooks.status.notConfigured')}
                </div>
              )}
            </div>

            {hook.exists ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(hook)}
                  disabled={isSaving}
                  title={
                    hook.enabled
                      ? t('repoSettings.hooks.actions.disable')
                      : t('repoSettings.hooks.actions.enable')
                  }
                >
                  {hook.enabled ? (
                    <ToggleRight size={18} className="text-(--success-color)" />
                  ) : (
                    <ToggleLeft size={18} className="text-(--text-muted)" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingHook(hook)}
                  title={t('repoSettings.hooks.actions.edit')}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(hook)}
                  disabled={isSaving}
                  title={t('repoSettings.hooks.actions.delete')}
                >
                  <Trash2 size={14} />
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreatingHook(hook.hookType as keyof typeof GitHookType)}
                title={t('repoSettings.hooks.actions.create')}
              >
                <Plus size={14} />
              </Button>
            )}
          </div>
        ))}
      </div>

      {availableHookTypes.length > 0 && hooks.length === 0 && (
        <p className="text-sm text-(--text-muted)">{t('repoSettings.hooks.empty')}</p>
      )}

      {editingHook && (
        <HookEditorDialog
          hookType={editingHook.hookType as keyof typeof GitHookType}
          isNew={false}
          onSave={(content) =>
            handleSave(editingHook.hookType as keyof typeof GitHookType, content, false)
          }
          onClose={() => setEditingHook(null)}
          isSaving={isSaving}
        />
      )}

      {creatingHook && (
        <HookEditorDialog
          hookType={creatingHook}
          isNew={true}
          onSave={(content) => handleSave(creatingHook, content, true)}
          onClose={() => setCreatingHook(null)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

interface HookEditorDialogProps {
  hookType: keyof typeof GitHookType;
  isNew: boolean;
  onSave: (content: string) => void;
  onClose: () => void;
  isSaving: boolean;
}

function HookEditorDialog({ hookType, isNew, onSave, onClose, isSaving }: HookEditorDialogProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [templates, setTemplates] = useState<HookTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const defaultScript = '#!/bin/bash\n\n# Add your hook script here\n';

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        if (isNew) {
          const loadedTemplates = await hooksApi.getTemplatesForType(GitHookType[hookType]);
          setTemplates(loadedTemplates);
          if (loadedTemplates.length > 0) {
            setContent(loadedTemplates[0].content);
            setSelectedTemplate(loadedTemplates[0].name);
          } else {
            setContent(defaultScript);
          }
        } else {
          const details = await hooksApi.get(GitHookType[hookType]);
          setContent(details.content || '');
        }
      } catch (err) {
        toast.error(t('repoSettings.hooks.notifications.loadFailed'), getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [hookType, isNew, t]);

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName === '_custom') {
      setContent(defaultScript);
    } else {
      const template = templates.find((tpl) => tpl.name === templateName);
      if (template) {
        setContent(template.content);
      }
    }
  };

  const handleSubmit = () => {
    if (content.trim()) {
      onSave(content);
    }
  };

  const hookLabel = HOOK_LABELS[hookType] || hookType;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-150">
        <DialogTitle icon={FileCode2}>
          {isNew
            ? t('repoSettings.hooks.editor.createTitle', { hook: hookLabel })
            : t('repoSettings.hooks.editor.editTitle', { hook: hookLabel })}
        </DialogTitle>

        <DialogBody>
          {isLoading ? (
            <div className="flex items-center justify-center h-50 text-(--text-muted)">
              {t('repoSettings.hooks.editor.loading')}
            </div>
          ) : (
            <>
              {isNew && templates.length > 0 && (
                <FormField label={t('repoSettings.hooks.editor.templateLabel')} htmlFor="template">
                  <Select
                    id="template"
                    value={selectedTemplate}
                    onValueChange={handleTemplateChange}
                    placeholder={t('repoSettings.hooks.editor.templatePlaceholder')}
                  >
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.name} value={tpl.name}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="_custom">
                      {t('repoSettings.hooks.editor.customTemplate')}
                    </SelectItem>
                  </Select>
                </FormField>
              )}

              <FormField label={t('repoSettings.hooks.editor.scriptLabel')} htmlFor="hookContent">
                <CodeEditor
                  id="hookContent"
                  value={content}
                  language="bash"
                  onChange={(e) => {
                    setContent(e.target.value);
                    setSelectedTemplate('');
                  }}
                  placeholder={t('repoSettings.hooks.editor.scriptPlaceholder')}
                  padding={12}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    minHeight: '15rem',
                    resize: 'vertical',
                    overflow: 'auto',
                  }}
                  data-color-mode="dark"
                />
              </FormField>

              <p className="text-xs text-(--text-muted) mt-2">
                {t('repoSettings.hooks.editor.hint')}
              </p>
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isSaving}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!content.trim() || isSaving || isLoading}
          >
            {isSaving ? t('common.saving') : isNew ? t('common.create') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
