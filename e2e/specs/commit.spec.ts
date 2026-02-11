import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import { createTempGitRepo, modifyFile, cleanupTempDir } from '../helpers/git-fixture.js';

describe('Commit Workflow', () => {
  let tempDir: string;

  before(async () => {
    // Create a git repo with an initial commit and a tracked file
    tempDir = createTempGitRepo({
      files: { 'test.txt': 'Initial content' },
      initialCommit: true,
    });

    // Modify the tracked file so it shows as unstaged
    modifyFile(tempDir, 'test.txt', 'Modified content');

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

  it('should stage the modified file', async () => {
    const fileStatusBtn = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatusBtn.waitForExist({ timeout: 5_000 });
    await fileStatusBtn.click();

    const stagingView = await $(SELECTORS.STAGING_VIEW);
    await stagingView.waitForExist({ timeout: 10_000 });

    const checkbox = await $(SELECTORS.STAGING_FILE_CHECKBOX);
    await checkbox.waitForExist({ timeout: 5_000 });
    await checkbox.click();

    await browser.pause(1_000);

    const stagedHeader = await $(SELECTORS.STAGING_STAGED_HEADER);
    await stagedHeader.waitForExist({ timeout: 5_000 });
  });

  it('should type commit message and commit', async () => {
    const messageInput = await $(SELECTORS.COMMIT_MESSAGE_INPUT);
    await messageInput.waitForExist({ timeout: 5_000 });
    await messageInput.click();
    await messageInput.addValue('Test commit message');

    const commitButton = await $(SELECTORS.COMMIT_BUTTON);
    await commitButton.scrollIntoView();
    await commitButton.waitForClickable({ timeout: 5_000 });
    await commitButton.click();

    // Wait for commit to complete - staged header should disappear
    await browser.pause(2_000);
  });

  it('should show empty staging area after commit', async () => {
    // After successful commit, no file checkboxes should exist (lists are empty)
    const checkbox = await $(SELECTORS.STAGING_FILE_CHECKBOX);
    await checkbox.waitForExist({ reverse: true, timeout: 5_000 });
  });
});
