import type { AxisError } from '@/bindings/api';
import i18n from '@/i18n';

// Fallback message keys for errors without data field
/* eslint-disable @typescript-eslint/naming-convention */
const FALLBACK_MESSAGE_KEYS: Partial<Record<AxisError['type'], string>> = {
  GitError: 'lib.errors.gitError',
  IoError: 'lib.errors.ioError',
  DatabaseError: 'lib.errors.databaseError',
  SerializationError: 'lib.errors.serializationError',
  NoRepositoryOpen: 'lib.errors.noRepositoryOpen',
  CannotFastForward: 'lib.errors.cannotFastForward',
  RebaseRequired: 'lib.errors.rebaseRequired',
  MergeConflict: 'lib.errors.mergeConflict',
  OAuthError: 'lib.errors.oauthError',
  OAuthCancelled: 'lib.errors.oauthCancelled',
  IntegrationError: 'lib.errors.integrationError',
  IntegrationNotConnected: 'lib.errors.integrationNotConnected',
};
/* eslint-enable @typescript-eslint/naming-convention */

export function getErrorMessage(err: unknown): string {
  if (isAxisError(err)) {
    // If error has data, use it directly (it contains the message)
    if ('data' in err && err.data) {
      return String(err.data);
    }
    // Otherwise use fallback
    const key = FALLBACK_MESSAGE_KEYS[err.type];
    return key ? i18n.t(key) : i18n.t('lib.errors.unknown');
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export function isAxisError(err: unknown): err is AxisError {
  return typeof err === 'object' && err !== null && 'type' in err;
}
