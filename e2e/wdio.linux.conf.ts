import { resolve } from 'path';

import { baseConfig } from './wdio.conf.js';

process.env.E2E_PLATFORM = 'linux';

const appPath = resolve(import.meta.dirname, '../src-tauri/target/release/axis');

export const config = {
  ...baseConfig,
  port: 4723,
  capabilities: [
    {
      platformName: 'Linux',
      'appium:automationName': 'linux',
      'appium:app': appPath,
      'appium:arguments': [],
      'appium:environment': {},
      'appium:showServerLogs': true,
    },
  ],
};
