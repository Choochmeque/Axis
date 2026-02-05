/**
 * Cross-platform E2E test helpers.
 *
 * Platform detection drives which selector strategy is used:
 *   - mac:     tauri-driver + WebDriverAgentMac → predicate on `label` (set via aria-label)
 *   - windows: tauri-driver + Edge Driver       → CSS selector on `aria-label`
 *   - linux:   tauri-driver + WebKitWebDriver   → CSS selector on `aria-label`
 */

export type Platform = 'mac' | 'windows' | 'linux';

export function getPlatform(): Platform {
  return (process.env.E2E_PLATFORM as Platform) ?? 'mac';
}

/**
 * Wait for the Tauri app to fully load and render.
 */
export async function waitForAppReady(): Promise<void> {
  await browser.pause(5000);
  await browser.maximizeWindow();
}

/**
 * Cross-platform element selector.
 *
 * HTML elements carry `aria-label` for accessibility-based selectors.
 *   - macOS   (WebDriverAgentMac): `-ios predicate string:label == "id"`
 *   - Windows (Edge Driver):       CSS `[aria-label="id"]`
 *   - Linux   (WebKitWebDriver):   CSS `[aria-label="id"]`
 */
export function byTestId(id: string): string {
  const platform = getPlatform();

  if (platform === 'mac') {
    return `-ios predicate string:label == "${id}"`;
  }

  // Windows & Linux — CSS selector on aria-label
  return `[aria-label="${id}"]`;
}
