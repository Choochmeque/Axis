import { useState, useEffect } from 'react';
import { Settings, User, Globe, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { repoSettingsApi, remoteApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { RepositorySettings, Remote } from '@/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Input,
  Alert,
} from '@/components/ui';

interface RepositorySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'identity' | 'remotes';

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
          onClick={() => {
            setIsAddingRemote(true);
            setEditingRemote(null);
          }}
        >
          <Plus size={16} className="mr-1" />
          Add Remote
        </Button>
      )}
    </div>
  );
}
