/**
 * Cross-platform E2E test helpers.
 *
 * Platform detection drives which selector strategy is used:
 *   - mac:     Appium mac2 driver         → predicate on `label` (set via aria-label)
 *   - windows: Appium windows driver      → XPath on UIA `Name` (set via aria-label)
 *   - linux:   WebKitWebDriver            → CSS selector on `aria-label`
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
}

/**
 * Cross-platform element selector.
 *
 * HTML elements carry `aria-label` for accessibility-based selectors.
 *   - macOS   (mac2):            `-ios predicate string:label == "id"`
 *   - Windows (windows):         XPath `//*[@Name="id"]`
 *   - Linux   (WebKitWebDriver): CSS `[aria-label="id"]`
 */
export function byTestId(id: string): string {
  const platform = getPlatform();

  if (platform === 'mac') {
    return `-ios predicate string:label == "${id}"`;
  }

  if (platform === 'linux') {
    return `[aria-label="${id}"]`;
  }

  // Windows — Appium XPath on UIA Name
  return `//*[@Name="${id}"]`;
}
