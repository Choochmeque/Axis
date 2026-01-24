// Note: descriptionKey should be translated using i18n.t() when displayed
export const COMMIT_TYPES = [
  { value: 'feat', label: 'feat', descriptionKey: 'lib.commitTypes.feat' },
  { value: 'fix', label: 'fix', descriptionKey: 'lib.commitTypes.fix' },
  { value: 'docs', label: 'docs', descriptionKey: 'lib.commitTypes.docs' },
  { value: 'style', label: 'style', descriptionKey: 'lib.commitTypes.style' },
  { value: 'refactor', label: 'refactor', descriptionKey: 'lib.commitTypes.refactor' },
  { value: 'perf', label: 'perf', descriptionKey: 'lib.commitTypes.perf' },
  { value: 'test', label: 'test', descriptionKey: 'lib.commitTypes.test' },
  { value: 'build', label: 'build', descriptionKey: 'lib.commitTypes.build' },
  { value: 'ci', label: 'ci', descriptionKey: 'lib.commitTypes.ci' },
  { value: 'chore', label: 'chore', descriptionKey: 'lib.commitTypes.chore' },
  { value: 'revert', label: 'revert', descriptionKey: 'lib.commitTypes.revert' },
] as const;

export type CommitType = (typeof COMMIT_TYPES)[number]['value'];

export interface ConventionalCommitParts {
  type: CommitType | '';
  scope: string;
  breaking: boolean;
  subject: string;
  body: string;
}

export function formatConventionalCommit(parts: ConventionalCommitParts): string {
  if (!parts.type || !parts.subject.trim()) {
    return '';
  }

  let message = parts.type;
  if (parts.scope.trim()) {
    message += `(${parts.scope.trim()})`;
  }
  if (parts.breaking) {
    message += '!';
  }
  message += `: ${parts.subject.trim()}`;

  if (parts.body.trim()) {
    message += `\n\n${parts.body.trim()}`;
  }

  return message;
}

export function parseConventionalCommit(message: string): ConventionalCommitParts | null {
  if (!message.trim()) {
    return null;
  }

  const lines = message.split('\n');
  const firstLine = lines[0] || '';

  // Pattern: type(scope)!: subject or type!: subject or type(scope): subject or type: subject
  const pattern = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.*)$/;
  const match = firstLine.match(pattern);

  if (!match) {
    return null;
  }

  const [, type, scope = '', breaking, subject] = match;
  const isValidType = COMMIT_TYPES.some((t) => t.value === type);

  if (!isValidType) {
    return null;
  }

  // Body is everything after the first line (excluding empty lines right after)
  const body = lines.slice(1).join('\n').replace(/^\n+/, '').trim();

  return {
    type: type as CommitType,
    scope,
    breaking: !!breaking,
    subject,
    body,
  };
}

export function getEmptyCommitParts(): ConventionalCommitParts {
  return {
    type: '',
    scope: '',
    breaking: false,
    subject: '',
    body: '',
  };
}
