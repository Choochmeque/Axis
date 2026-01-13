import { useState, useEffect } from 'react';
import { FolderGit2 } from 'lucide-react';
import { submoduleApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
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
} from '@/components/ui';

interface AddSubmoduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSubmoduleDialog({ open, onOpenChange }: AddSubmoduleDialogProps) {
  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');
  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadSubmodules } = useRepositoryStore();

  useEffect(() => {
    if (open) {
      setUrl('');
      setPath('');
      setBranch('');
      setError(null);
    }
  }, [open]);

  // Auto-fill path from URL
  useEffect(() => {
    if (url && !path) {
      const match = url.match(/\/([^/]+?)(\.git)?$/);
      if (match) {
        setPath(match[1]);
      }
    }
  }, [url, path]);

  const handleAdd = async () => {
    if (!url.trim()) {
      setError('Repository URL is required');
      return;
    }

    if (!path.trim()) {
      setError('Path is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await submoduleApi.add({
        url: url.trim(),
        path: path.trim(),
        branch: branch.trim() || undefined,
      });
      await loadSubmodules();
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAdd();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-120">
        <DialogTitle>
          <FolderGit2 size={18} />
          Add Submodule
        </DialogTitle>

        <DialogBody>
          <FormField label="Repository URL" htmlFor="submodule-url">
            <Input
              id="submodule-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/user/repo.git"
              autoFocus
            />
          </FormField>

          <FormField
            label="Path"
            htmlFor="submodule-path"
            hint="Relative path where the submodule will be cloned"
          >
            <Input
              id="submodule-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="libs/my-submodule"
            />
          </FormField>

          <FormField label="Branch (optional)" htmlFor="submodule-branch">
            <Input
              id="submodule-branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="main"
            />
          </FormField>

          {error && (
            <Alert variant="error" inline className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={isLoading || !url.trim() || !path.trim()}
          >
            {isLoading ? 'Adding...' : 'Add Submodule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
