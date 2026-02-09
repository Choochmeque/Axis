import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import { createTempGitRepo, cleanupTempDir } from '../helpers/git-fixture.js';

describe('Branch Operations', () => {
  let tempDir: string;

  before(async () => {
    // Create a git repo with an initial commit
    tempDir = createTempGitRepo({
      files: { 'file.txt': 'content' },
      initialCommit: true,
    });

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

  it('should open create branch dialog', async () => {
    const branchBtn = await $(SELECTORS.TOOLBAR_BRANCH_BTN);
    await branchBtn.waitForExist({ timeout: 5_000 });
    await branchBtn.click();

    const branchNameInput = await $(SELECTORS.BRANCH_NAME_INPUT);
    await branchNameInput.waitForExist({ timeout: 5_000 });
  });

  it('should create a new branch', async () => {
    const branchNameInput = await $(SELECTORS.BRANCH_NAME_INPUT);
    await branchNameInput.click();
    await branchNameInput.addValue('feature-test');

    const createBtn = await $(SELECTORS.CREATE_BRANCH_BTN);
    await createBtn.waitForExist({ timeout: 5_000 });
    await createBtn.click();

    // Wait for dialog to close and branch to be created
    await browser.pause(2_000);

    // Verify dialog closed
    const branchNameInputAfter = await $(SELECTORS.BRANCH_NAME_INPUT);
    await branchNameInputAfter.waitForExist({ reverse: true, timeout: 5_000 });
  });
});
