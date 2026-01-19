import type { AxisError } from '@/bindings/api';

// Fallback messages for errors without data field
/* eslint-disable @typescript-eslint/naming-convention */
const FALLBACK_MESSAGES: Partial<Record<AxisError['type'], string>> = {
  GitError: 'Git operation failed',
  IoError: 'File system error',
  DatabaseError: 'Database error',
  SerializationError: 'Serialization error',
  NoRepositoryOpen: 'No repository is open',
  CannotFastForward: 'Cannot fast-forward, merge or rebase required',
  RebaseRequired: 'Rebase required',
  MergeConflict: 'Merge conflict detected',
};
/* eslint-enable @typescript-eslint/naming-convention */

export function getErrorMessage(err: unknown): string {
  if (isAxisError(err)) {
    // If error has data, use it directly (it contains the message)
    if ('data' in err && err.data) {
      return String(err.data);
    }
    // Otherwise use fallback
    return FALLBACK_MESSAGES[err.type] ?? 'An error occurred';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export function isAxisError(err: unknown): err is AxisError {
  return typeof err === 'object' && err !== null && 'type' in err;
}
