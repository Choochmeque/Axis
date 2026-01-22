import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { repoSettingsApi, remoteApi, hooksApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { RepositorySettings, Remote, HookInfo, HookTemplate } from '@/types';
import { GitHookType } from '@/types';
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

interface RepositorySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'identity' | 'remotes' | 'hooks';

export function RepositorySettingsDialog({ isOpen, onClose }: RepositorySettingsDialogProps) {
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
    { id: 'identity', label: 'Identity', icon: <User size={16} /> },
    { id: 'remotes', label: 'Remotes', icon: <Globe size={16} /> },
    { id: 'hooks', label: 'Hooks', icon: <FileCode2 size={16} /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-150 max-h-[80vh] flex flex-col overflow-hidden">
        <DialogTitle icon={Settings}>
          Repository Settings
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
                Loading settings...
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
            <Button variant="secondary">Close</Button>
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
      toast.success('Identity saved');
    } catch (err) {
      toast.error('Failed to save identity', getErrorMessage(err));
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
      <h3 className={sectionTitleClass}>Git Identity</h3>
      <p className="text-sm text-(--text-secondary) mb-4">
        Override the global git identity for this repository only.
      </p>

      <FormField
        label="Name"
        htmlFor="userName"
        hint={settings.globalUserName ? `Global: ${settings.globalUserName}` : 'No global name set'}
      >
        <Input
          id="userName"
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder={settings.globalUserName || 'Enter name...'}
        />
      </FormField>

      <FormField
        label="Email"
        htmlFor="userEmail"
        hint={
          settings.globalUserEmail ? `Global: ${settings.globalUserEmail}` : 'No global email set'
        }
      >
        <Input
          id="userEmail"
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder={settings.globalUserEmail || 'Enter email...'}
        />
      </FormField>

      <div className="flex gap-2 mt-4">
        <Button variant="secondary" onClick={handleReset} disabled={!hasChanges || isSaving}>
          Reset
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
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
  const [editingRemote, setEditingRemote] = useState<Remote | null>(null);
  const [isAddingRemote, setIsAddingRemote] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddRemote = async () => {
    if (!newRemoteName.trim() || !newRemoteUrl.trim()) return;
    setIsSaving(true);
    try {
      await remoteApi.add(newRemoteName.trim(), newRemoteUrl.trim());
      setNewRemoteName('');
      setNewRemoteUrl('');
      setIsAddingRemote(false);
      onRemotesChange();
      toast.success(`Remote "${newRemoteName}" added`);
    } catch (err) {
      toast.error('Failed to add remote', getErrorMessage(err));
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
      toast.success(`Remote "${editingRemote.name}" updated`);
    } catch (err) {
      toast.error('Failed to update remote', getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRemote = async (remoteName: string) => {
    setIsSaving(true);
    try {
      await remoteApi.remove(remoteName);
      onRemotesChange();
      toast.success(`Remote "${remoteName}" removed`);
    } catch (err) {
      toast.error('Failed to remove remote', getErrorMessage(err));
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
      <h3 className={sectionTitleClass}>Remotes</h3>

      {remotes.length === 0 && !isAddingRemote ? (
        <p className="text-sm text-(--text-secondary) mb-4">No remotes configured.</p>
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
                    placeholder="URL"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleEditRemote}
                      disabled={!editUrl.trim() || isSaving}
                    >
                      Save
                    </Button>
                    <Button variant="secondary" size="sm" onClick={cancelEditing}>
                      Cancel
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
                        Push: {remote.pushUrl}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(remote)}
                    title="Edit remote"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRemote(remote.name)}
                    title="Delete remote"
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
            placeholder="Remote name (e.g., origin)"
            autoFocus
          />
          <Input
            type="text"
            value={newRemoteUrl}
            onChange={(e) => setNewRemoteUrl(e.target.value)}
            placeholder="Remote URL"
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddRemote}
              disabled={!newRemoteName.trim() || !newRemoteUrl.trim() || isSaving}
            >
              Add
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelAdding}>
              Cancel
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
      toast.success(`Hook ${newEnabled ? 'enabled' : 'disabled'}`);
      document.dispatchEvent(new CustomEvent('hooks-changed'));
    } catch (err) {
      toast.error('Failed to toggle hook', getErrorMessage(err));
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
      toast.success('Hook deleted');
      document.dispatchEvent(new CustomEvent('hooks-changed'));
    } catch (err) {
      toast.error('Failed to delete hook', getErrorMessage(err));
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
        toast.success('Hook created');
      } else {
        await hooksApi.update(hookType, content);
        toast.success('Hook updated');
      }
      await loadHooks();
      setEditingHook(null);
      setCreatingHook(null);
      document.dispatchEvent(new CustomEvent('hooks-changed'));
    } catch (err) {
      toast.error(isNew ? 'Failed to create hook' : 'Failed to update hook', getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-50 text-(--text-muted)">
        Loading hooks...
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
      <h3 className={sectionTitleClass}>Git Hooks</h3>
      <p className="text-sm text-(--text-secondary) mb-4">
        Manage Git hooks for this repository. Hooks run automatically during Git operations.
      </p>

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
                  {hook.enabled ? (hook.isExecutable ? 'Active' : 'Not executable') : 'Disabled'}
                </div>
              )}
              {!hook.exists && <div className="text-xs text-(--text-muted)">Not configured</div>}
            </div>

            {hook.exists ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(hook)}
                  disabled={isSaving}
                  title={hook.enabled ? 'Disable hook' : 'Enable hook'}
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
                  title="Edit hook"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(hook)}
                  disabled={isSaving}
                  title="Delete hook"
                >
                  <Trash2 size={14} />
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreatingHook(hook.hookType as keyof typeof GitHookType)}
                title="Create hook"
              >
                <Plus size={14} />
              </Button>
            )}
          </div>
        ))}
      </div>

      {availableHookTypes.length > 0 && hooks.length === 0 && (
        <p className="text-sm text-(--text-muted)">No hooks configured yet.</p>
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
  const [content, setContent] = useState('');
  const [templates, setTemplates] = useState<HookTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

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
            setContent('#!/bin/bash\n\n# Add your hook script here\n');
          }
        } else {
          const details = await hooksApi.get(GitHookType[hookType]);
          setContent(details.content || '');
        }
      } catch (err) {
        toast.error('Failed to load hook', getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [hookType, isNew]);

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName === '_custom') {
      setContent('#!/bin/bash\n\n# Add your hook script here\n');
    } else {
      const template = templates.find((t) => t.name === templateName);
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-150">
        <DialogTitle icon={FileCode2}>
          {isNew ? 'Create' : 'Edit'} {HOOK_LABELS[hookType] || hookType} Hook
        </DialogTitle>

        <DialogBody>
          {isLoading ? (
            <div className="flex items-center justify-center h-50 text-(--text-muted)">
              Loading...
            </div>
          ) : (
            <>
              {isNew && templates.length > 0 && (
                <FormField label="Template" htmlFor="template">
                  <Select
                    id="template"
                    value={selectedTemplate}
                    onValueChange={handleTemplateChange}
                    placeholder="Select a template..."
                  >
                    {templates.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="_custom">Custom</SelectItem>
                  </Select>
                </FormField>
              )}

              <FormField label="Hook Script" htmlFor="hookContent">
                <CodeEditor
                  id="hookContent"
                  value={content}
                  language="bash"
                  onChange={(e) => {
                    setContent(e.target.value);
                    setSelectedTemplate('');
                  }}
                  placeholder="#!/bin/bash"
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
                The hook script should start with a shebang (e.g., #!/bin/bash). It will be made
                executable automatically.
              </p>
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!content.trim() || isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
