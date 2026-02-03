/**
 * Cross-platform E2E test helpers.
 *
 * Platform detection drives which selector strategy is used:
 *   - mac:     Appium mac2 driver    → predicate on `label` (set via aria-label)
 *   - windows: Appium windows driver → XPath on UIA `Name` (set via aria-label)
 *   - linux:   tauri-driver          → CSS `[data-testid="..."]`
 *
 * Both attributes share the same `e2e-*` ID value on each HTML element.
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
 * HTML elements carry both `aria-label` and `data-testid` with the same value.
 *   - macOS   (mac2):    `-ios predicate string:label == "id"`
 *   - Windows (windows):  XPath `//*[@Name="id"]` (UIA Name = aria-label)
 *   - Linux   (tauri):   `[data-testid="id"]`
 */
export function byTestId(id: string): string {
  const platform = getPlatform();

  if (platform === 'mac') {
    return `-ios predicate string:label == "${id}"`;
  }

  if (platform === 'windows') {
    return `//*[@Name="${id}"]`;
  }

  return `[data-testid="${id}"]`;
}
