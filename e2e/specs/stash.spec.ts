import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import { createTempGitRepo, modifyFile, cleanupTempDir } from '../helpers/git-fixture.js';

describe('Stash Operations', () => {
  let tempDir: string;

  before(async () => {
    // Create a git repo with an initial commit and a tracked file
    tempDir = createTempGitRepo({
      files: { 'stash-test.txt': 'Initial content' },
      initialCommit: true,
    });

    // Modify the tracked file so we have changes to stash
    modifyFile(tempDir, 'stash-test.txt', 'Modified content for stash test');

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

  it('should have unstaged changes', async () => {
    const fileStatusBtn = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatusBtn.waitForExist({ timeout: 5_000 });
    await fileStatusBtn.click();

    const stagingView = await $(SELECTORS.STAGING_VIEW);
    await stagingView.waitForExist({ timeout: 10_000 });

    // Verify we have unstaged changes
    const checkbox = await $(SELECTORS.STAGING_FILE_CHECKBOX);
    await checkbox.waitForExist({ timeout: 5_000 });
  });

  it('should open stash dialog from toolbar', async () => {
    const stashBtn = await $(SELECTORS.TOOLBAR_STASH_BTN);
    await stashBtn.waitForExist({ timeout: 5_000 });
    await stashBtn.click();

    const stashMessageInput = await $(SELECTORS.STASH_MESSAGE_INPUT);
    await stashMessageInput.waitForExist({ timeout: 5_000 });
  });

  it('should create a stash with message', async () => {
    const stashMessageInput = await $(SELECTORS.STASH_MESSAGE_INPUT);
    await stashMessageInput.click();
    await stashMessageInput.addValue('E2E test stash');

    const saveBtn = await $(SELECTORS.STASH_SAVE_BTN);
    await saveBtn.waitForExist({ timeout: 5_000 });
    await saveBtn.click();

    // Wait for dialog to close
    await stashMessageInput.waitForExist({ reverse: true, timeout: 10_000 });
  });

  it('should show empty staging area after stash', async () => {
    // After stashing, no file checkboxes should exist
    const checkbox = await $(SELECTORS.STAGING_FILE_CHECKBOX);
    await checkbox.waitForExist({ reverse: true, timeout: 5_000 });
  });

  it('should show stash in sidebar', async () => {
    // Expand the stashes section (collapsed by default)
    const stashesSection = await $(SELECTORS.SIDEBAR_STASHES_SECTION);
    await stashesSection.waitForExist({ timeout: 5_000 });
    await stashesSection.click();

    // The stash should appear in the sidebar at index 0
    const stashItem = await $(SELECTORS.sidebarStash(0));
    await stashItem.waitForExist({ timeout: 5_000 });
  });
});
