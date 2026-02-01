/**
 * Truncates a path in the middle if it exceeds maxLen.
 * Detects the separator from the path itself.
 *
 * Examples:
 *   truncatePath("~/Projects/very/deep/nested/repo", 25) => "~/Projects/.../nested/repo"
 *   truncatePath("C:\\Users\\foo\\bar\\baz", 20) => "C:\\Users\\...\\baz"
 */
export function truncatePath(path: string, maxLen: number): string {
  if (path.length <= maxLen) {
    return path;
  }

  const sep = path.includes('\\') ? '\\' : '/';
  const parts = path.split(sep);

  if (parts.length <= 2) {
    return path;
  }

  // Keep first and last parts, collapse middle with ...
  const start = 1;
  let end = parts.length - 1;
  let result = [...parts.slice(0, start), '...', ...parts.slice(end)].join(sep);

  // Try to include more parts from the end
  while (end > start + 1) {
    end--;
    const candidate = [...parts.slice(0, start), '...', ...parts.slice(end)].join(sep);
    if (candidate.length > maxLen) {
      break;
    }
    result = candidate;
  }

  return result;
}
