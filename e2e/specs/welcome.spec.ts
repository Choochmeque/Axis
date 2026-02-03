import { SELECTORS } from '../helpers/selectors.js';
import { waitForAppReady } from '../helpers/context.js';

describe('Welcome View', () => {
  before(async () => {
    await waitForAppReady();
  });

  it('should display the welcome screen on app launch', async () => {
    const welcomeTitle = await $(SELECTORS.WELCOME_TITLE);
    await welcomeTitle.waitForExist({ timeout: 15_000 });

    const subtitle = await $(SELECTORS.WELCOME_SUBTITLE);
    await subtitle.waitForExist({ timeout: 5_000 });
  });

  it('should display all three action buttons', async () => {
    const newRepoBtn = await $(SELECTORS.WELCOME_NEW_REPO_BTN);
    const openRepoBtn = await $(SELECTORS.WELCOME_OPEN_REPO_BTN);
    const cloneRepoBtn = await $(SELECTORS.WELCOME_CLONE_REPO_BTN);

    await newRepoBtn.waitForExist({ timeout: 5_000 });
    await openRepoBtn.waitForExist({ timeout: 5_000 });
    await cloneRepoBtn.waitForExist({ timeout: 5_000 });
  });
});
