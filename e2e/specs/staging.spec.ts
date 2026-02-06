import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import { createTempGitRepo, modifyFile, cleanupTempDir } from '../helpers/git-fixture.js';

describe('Staging Workflow', () => {
  let tempDir: string;

  before(async () => {
    // Create a git repo with an initial commit and a tracked file
    tempDir = createTempGitRepo({
      files: { 'hello.txt': 'Hello, World!' },
      initialCommit: true,
    });

    // Modify the tracked file so it shows as unstaged
    modifyFile(tempDir, 'hello.txt', 'Hello, World! Modified.');

    await waitForAppReady();
  });

  after(async () => {
    await browser.deleteSession();
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

  it('should show the modified file in the staging view', async () => {
    // Click "File Status" in the sidebar to ensure we're in staging view
    const fileStatusBtn = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatusBtn.waitForExist({ timeout: 5_000 });
    await fileStatusBtn.click();

    // Wait for the staging view to appear
    const stagingView = await $(SELECTORS.STAGING_VIEW);
    await stagingView.waitForExist({ timeout: 10_000 });

    // Verify the unstaged header is visible
    const unstagedHeader = await $(SELECTORS.STAGING_UNSTAGED_HEADER);
    await unstagedHeader.waitForExist({ timeout: 5_000 });

    // Verify the modified file is displayed
    const helloFile = await $(SELECTORS.stagingFile('hello.txt'));
    await helloFile.waitForExist({ timeout: 5_000 });
  });

  it('should stage the file when clicking the checkbox', async () => {
    // Click the staging checkbox for the file
    const checkbox = await $(SELECTORS.STAGING_FILE_CHECKBOX);
    await checkbox.waitForExist({ timeout: 5_000 });
    await checkbox.click();

    // Wait briefly for the UI to update
    await browser.pause(1_000);

    // Verify the staged header is now visible
    const stagedHeader = await $(SELECTORS.STAGING_STAGED_HEADER);
    await stagedHeader.waitForExist({ timeout: 5_000 });
  });

  it('should show the commit form', async () => {
    const commitForm = await $(SELECTORS.COMMIT_FORM);
    await commitForm.waitForExist({ timeout: 5_000 });

    const messageInput = await $(SELECTORS.COMMIT_MESSAGE_INPUT);
    await messageInput.waitForExist({ timeout: 5_000 });

    const commitButton = await $(SELECTORS.COMMIT_BUTTON);
    await commitButton.waitForExist({ timeout: 5_000 });
  });
});
