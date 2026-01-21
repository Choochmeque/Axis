import { useState, useEffect, useCallback, useMemo } from 'react';
import { GitBranch } from 'lucide-react';

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
  Textarea,
  CheckboxField,
  Select,
  SelectItem,
  Alert,
} from '@/components/ui';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { toast } from '@/hooks';

interface CreatePullRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePullRequestDialog({
  isOpen,
  onClose,
  onCreated,
}: CreatePullRequestDialogProps) {
  const { branches } = useRepositoryStore();
  const { createPullRequest } = useIntegrationStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get local branches for selection
  const localBranches = useMemo(() => branches.filter((b) => b.branchType === 'Local'), [branches]);

  // Get current branch for default source
  const currentBranch = useMemo(() => localBranches.find((b) => b.isHead), [localBranches]);

  // Common target branches
  const defaultTargetBranches = useMemo(() => ['main', 'master', 'develop', 'dev'], []);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setBody('');
      setSourceBranch(currentBranch?.name ?? '');
      // Default to main or master if exists
      const defaultTarget =
        localBranches.find((b) => defaultTargetBranches.includes(b.name))?.name ?? '';
      setTargetBranch(defaultTarget);
      setIsDraft(false);
      setError(null);
    }
  }, [isOpen, currentBranch, localBranches, defaultTargetBranches]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!sourceBranch) {
      setError('Source branch is required');
      return;
    }
    if (!targetBranch) {
      setError('Target branch is required');
      return;
    }
    if (sourceBranch === targetBranch) {
      setError('Source and target branches must be different');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createPullRequest({
        title: title.trim(),
        body: body.trim() || null,
        sourceBranch,
        targetBranch,
        draft: isDraft,
      });
      toast.success('Pull request created successfully');
      onCreated();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [title, body, sourceBranch, targetBranch, isDraft, createPullRequest, onCreated]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle icon={GitBranch}>Create Pull Request</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" inline className="mb-3">
              {error}
            </Alert>
          )}

          <FormField label="From (source)" htmlFor="pr-source">
            <Select
              id="pr-source"
              value={sourceBranch}
              onValueChange={setSourceBranch}
              placeholder="Select branch"
            >
              {localBranches.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  {branch.name}
                  {branch.isHead ? ' (current)' : ''}
                </SelectItem>
              ))}
            </Select>
          </FormField>

          <FormField label="Into (target)" htmlFor="pr-target">
            <Select
              id="pr-target"
              value={targetBranch}
              onValueChange={setTargetBranch}
              placeholder="Select branch"
            >
              {localBranches.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  {branch.name}
                </SelectItem>
              ))}
            </Select>
          </FormField>

          <FormField label="Title" htmlFor="pr-title">
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pull request title"
              autoFocus
            />
          </FormField>

          <FormField label="Description (optional)" htmlFor="pr-body">
            <Textarea
              id="pr-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a description..."
              rows={6}
            />
          </FormField>

          <CheckboxField
            id="pr-draft"
            label="Create as draft"
            checked={isDraft}
            onCheckedChange={setIsDraft}
          />
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !sourceBranch || !targetBranch}
          >
            {isSubmitting ? 'Creating...' : 'Create Pull Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
