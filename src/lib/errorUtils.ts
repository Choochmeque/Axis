import type { AxisError } from '@/bindings/api';
import i18n from '@/i18n';
import { formatBytes } from './utils';

/* eslint-disable @typescript-eslint/naming-convention */
const ERROR_KEYS: Record<AxisError['type'], string> = {
  InvalidRepositoryPath: 'lib.errors.invalidRepositoryPath',
  GitError: 'lib.errors.gitError',
  IoError: 'lib.errors.ioError',
  DatabaseError: 'lib.errors.databaseError',
  SerializationError: 'lib.errors.serializationError',
  InvalidReference: 'lib.errors.invalidReference',
  NoRepositoryOpen: 'lib.errors.noRepositoryOpen',
  BranchNotFound: 'lib.errors.branchNotFound',
  BranchNotMerged: 'lib.errors.branchNotMerged',
  BranchInWorktree: 'lib.errors.branchInWorktree',
  FileNotFound: 'lib.errors.fileNotFound',
  CannotFastForward: 'lib.errors.cannotFastForward',
  RebaseRequired: 'lib.errors.rebaseRequired',
  MergeConflict: 'lib.errors.mergeConflict',
  RebaseConflict: 'lib.errors.rebaseConflict',
  CheckoutConflict: 'lib.errors.checkoutConflict',
  StashApplyConflict: 'lib.errors.stashApplyConflict',
  AiServiceError: 'lib.errors.aiServiceError',
  ApiKeyNotConfigured: 'lib.errors.apiKeyNotConfigured',
  DiffTooLarge: 'lib.errors.diffTooLarge',
  Other: 'lib.errors.other',
  IntegrationNotConnected: 'lib.errors.integrationNotConnected',
  IntegrationError: 'lib.errors.integrationError',
  OAuthError: 'lib.errors.oauthError',
  OAuthCancelled: 'lib.errors.oauthCancelled',
  SshKeyError: 'lib.errors.sshKeyError',
  SshKeyAlreadyExists: 'lib.errors.sshKeyAlreadyExists',
  SshKeygenNotFound: 'lib.errors.sshKeygenNotFound',
  InvalidKeyFilename: 'lib.errors.invalidKeyFilename',
};
/* eslint-enable @typescript-eslint/naming-convention */

function getInterpolationParams(err: AxisError): Record<string, string> | undefined {
  if (!('data' in err) || err.data === undefined || err.data === null || err.data === '') {
    return undefined;
  }

  switch (err.type) {
    case 'DiffTooLarge':
      return { size: formatBytes(err.data as number) };
    case 'CheckoutConflict':
    case 'StashApplyConflict':
      return { files: (err.data as string[]).join(', ') };
    case 'InvalidRepositoryPath':
    case 'FileNotFound':
      return { path: err.data as string };
    case 'InvalidReference':
      return { ref: err.data as string };
    case 'BranchNotFound':
    case 'BranchNotMerged':
      return { branch: err.data as string };
    case 'BranchInWorktree':
      return { path: err.data as string };
    case 'ApiKeyNotConfigured':
    case 'IntegrationNotConnected':
      return { provider: err.data as string };
    case 'SshKeyAlreadyExists':
    case 'InvalidKeyFilename':
      return { name: err.data as string };
    default:
      return { message: String(err.data) };
  }
}

export function getErrorMessage(err: unknown): string {
  if (isAxisError(err)) {
    const key = ERROR_KEYS[err.type] ?? 'lib.errors.unknown';
    const params = getInterpolationParams(err);
    return i18n.t(key, params);
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export function isAxisError(err: unknown): err is AxisError {
  return typeof err === 'object' && err !== null && 'type' in err;
}
