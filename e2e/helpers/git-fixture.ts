/**
 * Git fixture helpers for E2E tests.
 *
 * These run on the test host (Node.js), NOT inside the Tauri app.
 * They create temporary git repositories for test scenarios.
 */

import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface TempRepoOptions {
  /** Create an initial commit after adding files. */
  initialCommit?: boolean;
  /** Files to create in the repo: { filename: content }. */
  files?: Record<string, string>;
}

/** Spawn options that prevent console windows on Windows. */
const GIT_OPTS = { stdio: 'pipe' as const, windowsHide: true };

/**
 * Run a git command without spawning a visible console window on Windows.
 * Uses spawnSync with an args array (no shell) to avoid cmd.exe entirely.
 */
function git(args: string[], cwd: string): void {
  const result = spawnSync('git', args, { ...GIT_OPTS, cwd });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr?.toString()}`);
  }
}

/**
 * Create a temporary git repository.
 *
 * @returns Absolute path to the temp repo directory.
 */
export function createTempGitRepo(options: TempRepoOptions = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'axis-e2e-'));

  git(['init'], dir);
  git(['config', 'user.email', 'test@axis-e2e.com'], dir);
  git(['config', 'user.name', 'Axis E2E'], dir);

  if (options.files) {
    for (const [name, content] of Object.entries(options.files)) {
      writeFileSync(join(dir, name), content);
    }
  }

  if (options.initialCommit) {
    git(['add', '-A'], dir);
    git(['commit', '-m', 'Initial commit'], dir);
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
