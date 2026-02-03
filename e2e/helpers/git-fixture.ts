/**
 * Git fixture helpers for E2E tests.
 *
 * These run on the test host (Node.js), NOT inside the Tauri app.
 * They create temporary git repositories for test scenarios.
 */

import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface TempRepoOptions {
  /** Create an initial commit after adding files. */
  initialCommit?: boolean;
  /** Files to create in the repo: { filename: content }. */
  files?: Record<string, string>;
}

/**
 * Create a temporary git repository.
 *
 * @returns Absolute path to the temp repo directory.
 */
export function createTempGitRepo(options: TempRepoOptions = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'axis-e2e-'));

  execSync('git init', { cwd: dir, stdio: 'pipe', windowsHide: true });
  execSync('git config user.email "test@axis-e2e.com"', {
    cwd: dir,
    stdio: 'pipe',
    windowsHide: true,
  });
  execSync('git config user.name "Axis E2E"', { cwd: dir, stdio: 'pipe', windowsHide: true });

  if (options.files) {
    for (const [name, content] of Object.entries(options.files)) {
      writeFileSync(join(dir, name), content);
    }
  }

  if (options.initialCommit) {
    execSync('git add -A', { cwd: dir, stdio: 'pipe', windowsHide: true });
    execSync('git commit -m "Initial commit"', { cwd: dir, stdio: 'pipe', windowsHide: true });
  }

  return dir;
}

/**
 * Create a bare temp directory (no git init) for fresh repository creation.
 *
 * @returns Absolute path to the temp directory.
 */
export function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'axis-e2e-'));
}

/**
 * Write or overwrite a file in a directory.
 */
export function modifyFile(dir: string, filename: string, content: string): void {
  writeFileSync(join(dir, filename), content);
}

/**
 * Remove a temporary directory and all its contents.
 */
export function cleanupTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
