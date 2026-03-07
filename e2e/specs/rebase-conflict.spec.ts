import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import {
  createTempGitRepo,
  modifyFile,
  cleanupTempDir,
  execInRepo,
} from '../helpers/git-fixture.js';

describe('Rebase Conflict Resolution', () => {
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

    // Checkout feature branch and attempt to rebase onto main (will create conflict)
    execInRepo(tempDir, ['checkout', 'feature']);
    execInRepo(tempDir, ['rebase', 'main'], true);

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

  it('should show rebase banner in staging view during rebase', async () => {
    // Click "File Status" in the sidebar
    const fileStatusBtn = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatusBtn.waitForExist({ timeout: 5_000 });
    await fileStatusBtn.click();

    // Wait for the staging view to appear
    const stagingView = await $(SELECTORS.STAGING_VIEW);
    await stagingView.waitForExist({ timeout: 10_000 });

    // Verify the rebase banner is visible
    const rebaseBanner = await $(SELECTORS.REBASE_BANNER);
    await rebaseBanner.waitForExist({ timeout: 5_000 });

    // Verify continue, skip, and abort buttons are present
    const continueBtn = await $(SELECTORS.REBASE_BANNER_CONTINUE);
    await continueBtn.waitForExist({ timeout: 3_000 });

    const skipBtn = await $(SELECTORS.REBASE_BANNER_SKIP);
    await skipBtn.waitForExist({ timeout: 3_000 });

    const abortBtn = await $(SELECTORS.REBASE_BANNER_ABORT);
    await abortBtn.waitForExist({ timeout: 3_000 });
  });

  it('should hide commit form during rebase', async () => {
    // CommitForm should NOT be visible during rebase
    const commitForm = await $(SELECTORS.COMMIT_FORM);
    await expect(commitForm).not.toBeExisting();
  });

  it('should show conflict section during rebase conflict', async () => {
    // Verify the conflicted header is visible
    const conflictedHeader = await $(SELECTORS.STAGING_CONFLICTED_HEADER);
    await conflictedHeader.waitForExist({ timeout: 5_000 });
  });

  it('should resolve conflict and continue rebase', async () => {
    // Click on the conflicted file
    const conflictFile = await $(SELECTORS.conflictedFile('test.txt'));
    await conflictFile.waitForExist({ timeout: 5_000 });
    await conflictFile.click();

    // Wait for diff view to appear
    const diffView = await $(SELECTORS.DIFF_VIEW);
    await diffView.waitForExist({ timeout: 5_000 });

    // Click "Use Ours" on the first hunk
    const useOursBtn = await $(SELECTORS.conflictHunkUseOurs(0));
    await useOursBtn.waitForExist({ timeout: 5_000 });
    await useOursBtn.click();

    // Wait for resolved indicator
    const resolvedIndicator = await $(SELECTORS.conflictHunkResolved(0));
    await resolvedIndicator.waitForExist({ timeout: 3_000 });

    // Click Mark Resolved
    const markResolvedBtn = await $(SELECTORS.CONFLICT_MARK_RESOLVED);
    await markResolvedBtn.waitForExist({ timeout: 3_000 });
    await markResolvedBtn.click();

    // Wait for UI update
    await browser.pause(2_000);

    // Click continue on rebase banner
    const continueBtn = await $(SELECTORS.REBASE_BANNER_CONTINUE);
    await continueBtn.click();

    // Wait for rebase to complete (banner should disappear)
    await browser.pause(3_000);

    // Verify rebase banner is gone
    const rebaseBanner = await $(SELECTORS.REBASE_BANNER);
    await expect(rebaseBanner).not.toBeExisting();
  });

  it('should show commit form after rebase completes', async () => {
    // CommitForm should be visible again after rebase
    const commitForm = await $(SELECTORS.COMMIT_FORM);
    await commitForm.waitForExist({ timeout: 5_000 });
  });
});
