import { useState, useEffect, useRef } from 'react';
import { Terminal, HelpCircle } from 'lucide-react';
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
import { useCustomActionsStore } from '@/store/customActionsStore';
import { getErrorMessage } from '@/lib/errorUtils';
import { ActionContext, ActionStorageType } from '@/types';
import type { CustomAction } from '@/types';

interface ActionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: CustomAction | null;
  defaultStorage?: ActionStorageType;
}

const CONTEXT_OPTIONS: { value: ActionContext; label: string }[] = [
  { value: ActionContext.File, label: 'File' },
  { value: ActionContext.Commit, label: 'Commit' },
  { value: ActionContext.Branch, label: 'Branch' },
  { value: ActionContext.Tag, label: 'Tag' },
  { value: ActionContext.Stash, label: 'Stash' },
  { value: ActionContext.Repository, label: 'Repository' },
];

const VARIABLE_HELP = `Available variables:
$REPO_PATH - Repository root path
$BRANCH - Current branch name
$FILE - Selected file path
$SELECTED_FILES - Multiple files (quoted)
$COMMIT_HASH - Full commit SHA
$COMMIT_SHORT - Short commit SHA (7 chars)
$COMMIT_MESSAGE - Commit message first line
$REMOTE_URL - Origin remote URL
$TAG - Tag name
$STASH_REF - Stash reference`;

export function ActionEditorDialog({
  open,
  onOpenChange,
  action,
  defaultStorage,
}: ActionEditorDialogProps) {
  const saveAction = useCustomActionsStore((s) => s.saveAction);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [contexts, setContexts] = useState<ActionContext[]>([ActionContext.Repository]);
  const [shortcut, setShortcut] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showOutput, setShowOutput] = useState(true);
  const [storage, setStorage] = useState<ActionStorageType>(
    defaultStorage || ActionStorageType.Global
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const variablesRef = useRef<HTMLDivElement>(null);

  // Click outside to dismiss variables popup
  useEffect(() => {
    if (!showVariables) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (variablesRef.current && !variablesRef.current.contains(e.target as Node)) {
        setShowVariables(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVariables]);

  // Reset form when dialog opens/closes or action changes
  useEffect(() => {
    if (open) {
      if (action) {
        setName(action.name);
        setDescription(action.description || '');
        setCommand(action.command);
        setWorkingDir(action.workingDir || '');
        setContexts(action.contexts as ActionContext[]);
        setShortcut(action.shortcut || '');
        setConfirm(action.confirm);
        setConfirmMessage(action.confirmMessage || '');
        setShowOutput(action.showOutput ?? true);
        setStorage(action.storage || defaultStorage || ActionStorageType.Global);
      } else {
        setName('');
        setDescription('');
        setCommand('');
        setWorkingDir('');
        setContexts([ActionContext.Repository]);
        setShortcut('');
        setConfirm(false);
        setConfirmMessage('');
        setShowOutput(true);
        setStorage(defaultStorage || ActionStorageType.Global);
      }
      setError(null);
    }
  }, [open, action, defaultStorage]);

  const handleContextToggle = (ctx: ActionContext) => {
    setContexts((prev) => (prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx]));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!command.trim()) {
      setError('Command is required');
      return;
    }
    if (contexts.length === 0) {
      setError('At least one context is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const actionToSave: CustomAction = {
        id: action?.id || crypto.randomUUID(),
        name: name.trim(),
        description: description.trim() || null,
        command: command.trim(),
        workingDir: workingDir.trim() || null,
        contexts,
        shortcut: shortcut.trim() || null,
        confirm,
        confirmMessage: confirmMessage.trim() || null,
        showOutput,
        enabled: action?.enabled ?? true,
        order: action?.order ?? 0,
        storage,
      };

      await saveAction(actionToSave, storage);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Hide storage selector when defaultStorage is provided (opened from specific settings page)
  const showStorageSelector = !defaultStorage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-140">
        <DialogTitle icon={Terminal}>{action ? 'Edit Action' : 'Create Action'}</DialogTitle>

        <DialogBody className="space-y-4">
          <FormField label="Name *" htmlFor="action-name">
            <Input
              id="action-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Open in VS Code"
              autoFocus
            />
          </FormField>

          <FormField label="Description" htmlFor="action-description">
            <Input
              id="action-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description shown as tooltip"
            />
          </FormField>

          <FormField label="Command *" htmlFor="action-command">
            <div className="relative">
              <textarea
                id="action-command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder='code "$FILE"'
                rows={3}
                className="w-full rounded-md border border-(--border-color) bg-(--bg-tertiary) p-2 pr-8 font-mono text-sm text-(--text-primary) resize-none outline-none focus:border-(--accent-color)"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowVariables(!showVariables)}
                className="absolute top-2 right-2 text-(--text-muted) hover:text-(--text-secondary)"
                title="Show variables"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              {showVariables && (
                <div
                  ref={variablesRef}
                  className="absolute top-0 right-0 z-10 mt-8 p-3 bg-(--bg-secondary) border border-(--border-color) rounded-lg shadow-lg text-xs whitespace-pre-wrap text-(--text-secondary)"
                >
                  {VARIABLE_HELP}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Working Directory" htmlFor="action-workdir">
            <Input
              id="action-workdir"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              placeholder="$REPO_PATH (default)"
              className="font-mono text-sm"
            />
          </FormField>

          <FormField label="Show In Contexts *">
            <div className="flex flex-wrap gap-2">
              {CONTEXT_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded border px-2 py-1 text-sm transition-colors ${
                    contexts.includes(value)
                      ? 'border-(--accent-color) bg-(--accent-color)/10 text-(--accent-color)'
                      : 'border-(--border-color) hover:border-(--accent-color)/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={contexts.includes(value)}
                    onChange={() => handleContextToggle(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="Keyboard Shortcut" htmlFor="action-shortcut">
            <Input
              id="action-shortcut"
              value={shortcut}
              onChange={() => {}}
              onKeyDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Backspace/Delete clears the shortcut
                if (e.key === 'Backspace' || e.key === 'Delete') {
                  setShortcut('');
                  return;
                }

                // Ignore standalone modifier keys and Escape
                if (['Control', 'Meta', 'Alt', 'Shift', 'Escape'].includes(e.key)) {
                  return;
                }

                // Require at least one modifier
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  return;
                }

                const parts: string[] = [];
                if (e.metaKey || e.ctrlKey) parts.push('mod');
                if (e.shiftKey) parts.push('shift');
                if (e.altKey) parts.push('alt');

                // Normalize key name
                let key = e.key.toLowerCase();
                if (e.code.startsWith('Digit')) {
                  key = e.code.replace('Digit', '');
                } else if (e.code.startsWith('Key')) {
                  key = e.code.replace('Key', '').toLowerCase();
                }

                parts.push(key);
                setShortcut(parts.join('+'));
              }}
              placeholder="Press keys..."
              className="font-mono text-sm"
              readOnly
            />
            <p className="text-(--text-muted) mt-1 text-xs">
              Click and press your shortcut. Backspace to clear.
            </p>
          </FormField>

          {showStorageSelector && (
            <FormField label="Storage" htmlFor="action-storage">
              <Select
                id="action-storage"
                value={storage}
                onValueChange={(v) => setStorage(v as ActionStorageType)}
                disabled={!!action}
              >
                <SelectItem value={ActionStorageType.Global}>Global (all repositories)</SelectItem>
                <SelectItem value={ActionStorageType.Repository}>
                  Repository (stored in .axis/actions.json)
                </SelectItem>
              </Select>
            </FormField>
          )}

          <CheckboxField
            id="action-show-output"
            label="Show output dialog after execution"
            checked={showOutput}
            onCheckedChange={setShowOutput}
          />

          <CheckboxField
            id="action-confirm"
            label="Show confirmation dialog before running"
            checked={confirm}
            onCheckedChange={setConfirm}
          />

          {confirm && (
            <FormField label="Confirmation Message" htmlFor="action-confirm-message">
              <Input
                id="action-confirm-message"
                value={confirmMessage}
                onChange={(e) => setConfirmMessage(e.target.value)}
                placeholder="Are you sure you want to run this action?"
              />
            </FormField>
          )}

          {error && (
            <Alert variant="error" inline>
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="primary" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : action ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
