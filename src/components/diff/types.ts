/**
 * Unique identifier for a diff line within a file
 */
export interface DiffLineKey {
  hunkIndex: number;
  lineIndex: number;
}

/**
 * Serialize a line key for use in Set operations
 */
export function serializeLineKey(key: DiffLineKey): string {
  return `${key.hunkIndex}:${key.lineIndex}`;
}

/**
 * Deserialize a line key from a string
 */
export function deserializeLineKey(key: string): DiffLineKey {
  const [hunkIndex, lineIndex] = key.split(':').map(Number);
  return { hunkIndex, lineIndex };
}

/**
 * Create a line key string directly from indices
 */
export function createLineKey(hunkIndex: number, lineIndex: number): string {
  return `${hunkIndex}:${lineIndex}`;
}
