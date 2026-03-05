import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import {
  createTempGitRepo,
  modifyFile,
  cleanupTempDir,
  execInRepo,
} from '../helpers/git-fixture.js';

describe('Conflict Resolution', () => {
  let tempDir: string;

  before(async () => {
    // Create a git repo with an initial commit
    tempDir = createTempGitRepo({
      files: { 'test.txt': 'line1\nline2\nline3\n' },
      initialCommit: true,
    });

    // Create a feature branch with changes
    execInRepo(tempDir, ['checkout', '-b', 'feature']);
    modifyFile(tempDir, 'test.txt', 'feature-line1\nline2\nfeature-line3\n');
    execInRepo(tempDir, ['add', '-A']);
    execInRepo(tempDir, ['commit', '-m', 'feature changes']);

    // Go back to main and make conflicting changes
    execInRepo(tempDir, ['checkout', 'main']);
    modifyFile(tempDir, 'test.txt', 'main-line1\nline2\nmain-line3\n');
    execInRepo(tempDir, ['add', '-A']);
    execInRepo(tempDir, ['commit', '-m', 'main changes']);

    // Attempt to merge feature branch (will create conflict)
    execInRepo(tempDir, ['merge', 'feature'], true);

    await waitForAppReady();
  });

  after(async () => {
    try {
      cleanupTempDir(tempDir);
    } catch (e) {
      console.warn('Failed to cleanup temp dir:', e);
    }
  });

  it('should open the repository via init dialog', async () => {
    // Click "New Repository" to open the init dialog
    const newRepoBtn = await $(SELECTORS.WELCOME_NEW_REPO_BTN);
    await newRepoBtn.waitForExist({ timeout: 10_000 });
    await newRepoBtn.click();

    const pathInput = await $(SELECTORS.INIT_PATH_INPUT);
    await pathInput.waitForExist({ timeout: 5_000 });
    await pathInput.click();
    await pathInput.addValue(tempDir);

    const createBtn = await $(SELECTORS.INIT_CREATE_BTN);
    await createBtn.click();

    // Wait for the app layout to load
    const toolbar = await $(SELECTORS.TOOLBAR);
    await toolbar.waitForExist({ timeout: 15_000 });
  });

  it('should show conflict section when merge conflict exists', async () => {
    // Click "File Status" in the sidebar
    const fileStatusBtn = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatusBtn.waitForExist({ timeout: 5_000 });
    await fileStatusBtn.click();

    // Wait for the staging view to appear
    const stagingView = await $(SELECTORS.STAGING_VIEW);
    await stagingView.waitForExist({ timeout: 10_000 });

    // Verify the conflicted header is visible
    const conflictedHeader = await $(SELECTORS.STAGING_CONFLICTED_HEADER);
    await conflictedHeader.waitForExist({ timeout: 5_000 });
  });

  it('should show conflict view when selecting conflicted file', async () => {
    // Click on the conflicted file
    const conflictFile = await $(SELECTORS.conflictedFile('test.txt'));
    await conflictFile.waitForExist({ timeout: 5_000 });
    await conflictFile.click();

    // Wait for diff view to appear
    const diffView = await $(SELECTORS.DIFF_VIEW);
    await diffView.waitForExist({ timeout: 5_000 });

    // Verify conflict resolution buttons are visible
    const useAllOurs = await $(SELECTORS.CONFLICT_USE_ALL_OURS);
    await useAllOurs.waitForExist({ timeout: 5_000 });

    const useAllTheirs = await $(SELECTORS.CONFLICT_USE_ALL_THEIRS);
    await useAllTheirs.waitForExist({ timeout: 5_000 });
  });

  it('should resolve hunk with Use Ours', async () => {
    // Click "Use Ours" on the first hunk
    const useOursBtn = await $(SELECTORS.conflictHunkUseOurs(0));
    await useOursBtn.waitForExist({ timeout: 5_000 });
    await useOursBtn.click();

    // Wait for resolved indicator
    const resolvedIndicator = await $(SELECTORS.conflictHunkResolved(0));
    await resolvedIndicator.waitForExist({ timeout: 3_000 });
  });

  it('should enable Mark Resolved when all hunks resolved', async () => {
    // If there are more hunks, resolve them too
    // For this test, assume single hunk - mark resolved should be enabled
    const markResolvedBtn = await $(SELECTORS.CONFLICT_MARK_RESOLVED);
    await markResolvedBtn.waitForExist({ timeout: 3_000 });
    await expect(markResolvedBtn).toBeEnabled();
  });

  it('should remove file from conflicts after Mark Resolved', async () => {
    // Click Mark Resolved
    const markResolvedBtn = await $(SELECTORS.CONFLICT_MARK_RESOLVED);
    await markResolvedBtn.click();

    // Wait for UI update
    await browser.pause(2_000);

    // Verify the file is no longer in conflicted section
    const conflictFile = await $(SELECTORS.conflictedFile('test.txt'));
    await expect(conflictFile).not.toBeExisting();

    // Verify file is now in staged section
    const stagedHeader = await $(SELECTORS.STAGING_STAGED_HEADER);
    await stagedHeader.waitForExist({ timeout: 5_000 });
  });
});
