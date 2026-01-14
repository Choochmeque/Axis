import { useState, useEffect } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote, FetchResult } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Select,
  CheckboxField,
  Alert,
} from '@/components/ui';

interface FetchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FetchDialog({ open, onOpenChange }: FetchDialogProps) {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [fetchAll, setFetchAll] = useState(true);
  const [prune, setPrune] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FetchResult[] | null>(null);

  const { loadBranches, refreshRepository } = useRepositoryStore();

  useEffect(() => {
    if (open) {
      loadRemotes();
      setResult(null);
      setError(null);
    }
  }, [open]);

  const loadRemotes = async () => {
    try {
      const data = await remoteApi.list();
      setRemotes(data);
      if (data.length > 0) {
        setSelectedRemote(data[0].name);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let results: FetchResult[];
      if (fetchAll) {
        results = await remoteApi.fetchAll();
      } else {
        const singleResult = await remoteApi.fetch(selectedRemote, prune);
        results = [singleResult];
      }

      setResult(results);
      await loadBranches();
      await refreshRepository();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-120">
        <DialogTitle>
          <RefreshCw size={18} />
          Fetch from Remote
        </DialogTitle>

        <DialogBody>
          {result ? (
            <div>
              <Alert variant="success" className="mb-4">
                <Check size={16} />
                Fetch completed successfully
              </Alert>
              {result.map((r) => (
                <div key={r.remote} className="p-3 bg-(--bg-secondary) rounded mb-2 last:mb-0">
                  <strong className="block mb-1 text-(--text-primary)">{r.remote}</strong>
                  <div className="text-xs text-(--text-secondary)">
                    {r.stats.receivedObjects > 0 ? (
                      <span>
                        Received {r.stats.receivedObjects} objects (
                        {formatBytes(Number(r.stats.receivedBytes))})
                      </span>
                    ) : (
                      <span>Already up to date</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <CheckboxField
                id="fetch-all"
                label="Fetch from all remotes"
                checked={fetchAll}
                onCheckedChange={setFetchAll}
              />

              {!fetchAll && (
                <FormField label="Remote" htmlFor="remote-select">
                  <Select
                    id="remote-select"
                    value={selectedRemote}
                    onChange={(e) => setSelectedRemote(e.target.value)}
                    disabled={remotes.length === 0}
                  >
                    {remotes.map((remote) => (
                      <option key={remote.name} value={remote.name}>
                        {remote.name} ({remote.url})
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <CheckboxField
                id="prune"
                label="Prune deleted remote branches"
                checked={prune}
                onCheckedChange={setPrune}
              />

              {error && (
                <Alert variant="error" inline className="mt-3">
                  {error}
                </Alert>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          {result ? (
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button
                variant="primary"
                onClick={handleFetch}
                disabled={isLoading || (!fetchAll && !selectedRemote)}
              >
                {isLoading ? 'Fetching...' : 'Fetch'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
