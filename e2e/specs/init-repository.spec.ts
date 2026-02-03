import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';
import { createTempDir, cleanupTempDir } from '../helpers/git-fixture.js';

describe('Init Repository', () => {
  let tempDir: string;

  before(async () => {
    tempDir = createTempDir();
    await waitForAppReady();
  });

  after(async () => {
    cleanupTempDir(tempDir);
  });

  it('should open init dialog when clicking New Repository', async () => {
    const newRepoBtn = await $(SELECTORS.WELCOME_NEW_REPO_BTN);
    await newRepoBtn.waitForExist({ timeout: 10_000 });
    await newRepoBtn.click();

    // Verify dialog opened by checking for the path input inside it
    const pathInput = await $(SELECTORS.INIT_PATH_INPUT);
    await pathInput.waitForExist({ timeout: 10_000 });
  });

  it('should create a new repository and show app layout', async () => {
    const pathInput = await $(SELECTORS.INIT_PATH_INPUT);
    await pathInput.waitForExist({ timeout: 5_000 });
    await pathInput.click();
    await pathInput.addValue(tempDir);

    // Click the create button
    const createBtn = await $(SELECTORS.INIT_CREATE_BTN);
    await createBtn.waitForExist({ timeout: 5_000 });
    await createBtn.click();

    // Wait for the app layout to load
    const toolbar = await $(SELECTORS.TOOLBAR);
    await toolbar.waitForExist({ timeout: 15_000 });

    const fileStatus = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatus.waitForExist({ timeout: 5_000 });

    const statusBar = await $(SELECTORS.STATUS_BAR);
    await statusBar.waitForExist({ timeout: 5_000 });
  });

  it('should show File Status in the sidebar', async () => {
    const fileStatus = await $(SELECTORS.SIDEBAR_FILE_STATUS);
    await fileStatus.waitForExist({ timeout: 5_000 });
  });
});
