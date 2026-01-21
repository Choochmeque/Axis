import { useState, useEffect, useCallback } from 'react';
import { CircleDot } from 'lucide-react';

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
  Alert,
} from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { toast } from '@/hooks';

interface CreateIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateIssueDialog({ isOpen, onClose, onCreated }: CreateIssueDialogProps) {
  const { createIssue } = useIntegrationStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setBody('');
      setLabels('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const labelList = labels
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      await createIssue({
        title: title.trim(),
        body: body.trim() || null,
        labels: labelList,
        assignees: [],
      });
      toast.success('Issue created successfully');
      onCreated();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [title, body, labels, createIssue, onCreated]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle icon={CircleDot}>Create Issue</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" inline className="mb-3">
              {error}
            </Alert>
          )}

          <FormField label="Title" htmlFor="issue-title">
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              autoFocus
            />
          </FormField>

          <FormField label="Description (optional)" htmlFor="issue-body">
            <Textarea
              id="issue-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a description..."
              rows={8}
            />
          </FormField>

          <FormField
            label="Labels (optional)"
            htmlFor="issue-labels"
            hint="Separate multiple labels with commas"
          >
            <Input
              id="issue-labels"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="bug, enhancement, help wanted"
            />
          </FormField>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Issue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
