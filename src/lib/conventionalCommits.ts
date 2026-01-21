export const COMMIT_TYPES = [
  { value: 'feat', label: 'feat', description: 'A new feature' },
  { value: 'fix', label: 'fix', description: 'A bug fix' },
  { value: 'docs', label: 'docs', description: 'Documentation changes' },
  { value: 'style', label: 'style', description: 'Code style changes' },
  { value: 'refactor', label: 'refactor', description: 'Code refactoring' },
  { value: 'perf', label: 'perf', description: 'Performance improvement' },
  { value: 'test', label: 'test', description: 'Adding/fixing tests' },
  { value: 'build', label: 'build', description: 'Build system changes' },
  { value: 'ci', label: 'ci', description: 'CI configuration changes' },
  { value: 'chore', label: 'chore', description: 'Other changes' },
  { value: 'revert', label: 'revert', description: 'Revert a commit' },
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
