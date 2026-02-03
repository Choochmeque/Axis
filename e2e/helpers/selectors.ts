import { byTestId } from './context.js';

/**
 * Centralized selectors for E2E tests.
 *
 * Each HTML element has both `aria-label` and `data-testid` set to the same value.
 * The `byTestId` helper picks the right strategy per platform.
 */
export const SELECTORS = {
  // Welcome View
  get WELCOME_TITLE() {
    return byTestId('e2e-welcome-title');
  },
  get WELCOME_SUBTITLE() {
    return byTestId('e2e-welcome-subtitle');
  },
  get WELCOME_NEW_REPO_BTN() {
    return byTestId('e2e-welcome-new-repo-btn');
  },
  get WELCOME_OPEN_REPO_BTN() {
    return byTestId('e2e-welcome-open-repo-btn');
  },
  get WELCOME_CLONE_REPO_BTN() {
    return byTestId('e2e-welcome-clone-repo-btn');
  },

  // Init Dialog (Phase B)
  get INIT_PATH_INPUT() {
    return byTestId('e2e-init-path-input');
  },
  get INIT_CREATE_BTN() {
    return byTestId('e2e-init-create-btn');
  },

  // App Layout (Phase B)
  get TOOLBAR() {
    return byTestId('e2e-toolbar');
  },
  get STATUS_BAR() {
    return byTestId('e2e-status-bar');
  },

  // Sidebar items (Phase B)
  get SIDEBAR_FILE_STATUS() {
    return byTestId('e2e-sidebar-file-status');
  },
  get SIDEBAR_HISTORY() {
    return byTestId('e2e-sidebar-history');
  },

  // Staging View (Phase B)
  get STAGING_VIEW() {
    return byTestId('e2e-staging-view');
  },
  get STAGING_STAGED_HEADER() {
    return byTestId('e2e-staging-staged-header');
  },
  get STAGING_UNSTAGED_HEADER() {
    return byTestId('e2e-staging-unstaged-header');
  },
  get STAGING_FILE_CHECKBOX() {
    return byTestId('e2e-staging-file-checkbox');
  },

  // Commit Form (Phase B)
  get COMMIT_FORM() {
    return byTestId('e2e-commit-form');
  },
  get COMMIT_MESSAGE_INPUT() {
    return byTestId('e2e-commit-message-input');
  },
  get COMMIT_BUTTON() {
    return byTestId('e2e-commit-button');
  },

  // Dynamic selectors
  stagingFile: (filename: string) => byTestId(`e2e-staging-file-${filename}`),
  repoCard: (name: string) => byTestId(`e2e-repo-card-${name}`),
};
