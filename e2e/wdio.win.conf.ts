import { resolve } from 'path';

import { baseConfig } from './wdio.conf.js';

process.env.E2E_PLATFORM = 'windows';

const appPath = resolve(import.meta.dirname, '../src-tauri/target/release/Axis.exe');

export const config = {
  ...baseConfig,
  port: 4723,
  capabilities: [
    {
      platformName: 'Windows',
      'appium:automationName': 'windows',
      'appium:app': appPath,
      'appium:arguments': [],
      'appium:environment': {},
      'appium:showServerLogs': true,
    },
  ],
};
