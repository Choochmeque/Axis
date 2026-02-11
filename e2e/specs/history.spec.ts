import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import { createTempGitRepo, cleanupTempDir } from '../helpers/git-fixture.js';

describe('History View', () => {
  let tempDir: string;

  before(async () => {
    // Create a git repo with an initial commit
    tempDir = createTempGitRepo({
      files: { 'file.txt': 'Initial content' },
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

  it('should navigate to history view via sidebar', async () => {
    const historyBtn = await $(SELECTORS.SIDEBAR_HISTORY);
    await historyBtn.waitForExist({ timeout: 5_000 });
    await historyBtn.click();

    const historyView = await $(SELECTORS.HISTORY_VIEW);
    await historyView.waitForExist({ timeout: 10_000 });
  });

  it('should navigate back to file status view', async () => {
    const fileStatusBtn = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatusBtn.waitForExist({ timeout: 5_000 });
    await fileStatusBtn.click();

    const stagingView = await $(SELECTORS.STAGING_VIEW);
    await stagingView.waitForExist({ timeout: 10_000 });
  });
});
