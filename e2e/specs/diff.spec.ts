import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import { createTempGitRepo, modifyFile, cleanupTempDir } from '../helpers/git-fixture.js';

describe('Diff View', () => {
  let tempDir: string;

  before(async () => {
    // Create a git repo with an initial commit and a tracked file
    tempDir = createTempGitRepo({
      files: { 'readme.txt': 'Hello World' },
      initialCommit: true,
    });

    // Modify the tracked file so it shows as unstaged with a diff
    modifyFile(tempDir, 'readme.txt', 'Hello World\nNew line added');

    await waitForAppReady();
  });

  after(async () => {
    try {
      cleanupTempDir(tempDir);
    } catch (e) {
      console.warn('Failed to cleanup temp dir:', e);
    }
  });

  it('should open the repository', async () => {
    const newRepoBtn = await $(SELECTORS.WELCOME_NEW_REPO_BTN);
    await newRepoBtn.waitForExist({ timeout: 10_000 });
    await newRepoBtn.click();

    const pathInput = await $(SELECTORS.INIT_PATH_INPUT);
    await pathInput.waitForExist({ timeout: 5_000 });
    await pathInput.click();
    await pathInput.addValue(tempDir);

    const createBtn = await $(SELECTORS.INIT_CREATE_BTN);
    await createBtn.click();

    const toolbar = await $(SELECTORS.TOOLBAR);
    await toolbar.waitForExist({ timeout: 15_000 });
  });

  it('should navigate to staging view', async () => {
    const fileStatusBtn = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatusBtn.waitForExist({ timeout: 5_000 });
    await fileStatusBtn.click();

    const stagingView = await $(SELECTORS.STAGING_VIEW);
    await stagingView.waitForExist({ timeout: 10_000 });
  });

  it('should show diff view when clicking a file', async () => {
    // Click on the modified file to show its diff
    const fileItem = await $(SELECTORS.stagingFile('readme.txt'));
    await fileItem.waitForExist({ timeout: 5_000 });
    await fileItem.click();

    // Wait for diff view to appear
    const diffView = await $(SELECTORS.DIFF_VIEW);
    await diffView.waitForExist({ timeout: 10_000 });
  });
});
