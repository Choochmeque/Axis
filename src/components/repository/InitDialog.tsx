import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderPlus, FolderOpen } from 'lucide-react';
import { repositoryApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { TabType, useTabsStore } from '@/store/tabsStore';
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
  CheckboxField,
  Alert,
} from '@/components/ui';

interface InitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InitDialog({ open: isOpen, onOpenChange }: InitDialogProps) {
  const [path, setPath] = useState('');
  const [bare, setBare] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadRecentRepositories } = useRepositoryStore();
  const { addTab, findTabByPath, setActiveTab } = useTabsStore();

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Directory for New Repository',
    });

    if (selected && typeof selected === 'string') {
      setPath(selected);
    }
  };

  const handleInit = async () => {
    if (!path.trim()) {
      setError('Directory path is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repo = await repositoryApi.init(path.trim(), bare);
      await loadRecentRepositories();

      // Create tab for new repository
      const existingTab = findTabByPath(repo.path.toString());
      if (existingTab) {
        setActiveTab(existingTab.id);
      } else {
        addTab({
          type: TabType.Repository,
          path: repo.path.toString(),
          name: repo.name,
          repository: repo,
        });
      }

      // Reset form and close
      setPath('');
      setBare(false);
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleInit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105">
        <DialogTitle>
          <FolderPlus size={18} />
          Initialize Repository
        </DialogTitle>

        <DialogBody>
          <FormField
            label="Directory"
            htmlFor="init-path"
            hint="Select an empty directory or create a new one"
          >
            <div className="flex gap-2">
              <Input
                id="init-path"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="/path/to/new/repo"
                autoFocus
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleBrowse}>
                <FolderOpen size={16} />
              </Button>
            </div>
          </FormField>

          <CheckboxField
            id="bare"
            label="Create bare repository"
            description="Bare repositories have no working directory (for servers)"
            checked={bare}
            onCheckedChange={setBare}
          />

          {error && (
            <Alert variant="error" inline className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="primary" onClick={handleInit} disabled={isLoading || !path.trim()}>
            {isLoading ? 'Creating...' : 'Create Repository'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
