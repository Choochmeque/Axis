import { resolve } from 'path';

import { baseConfig } from './wdio.conf.js';

const appPath = resolve(import.meta.dirname, '../src-tauri/target/release/bundle/macos/Axis.app');

export const config = {
  ...baseConfig,
  port: 4723,
  capabilities: [
    {
      platformName: 'mac',
      'appium:automationName': 'mac2',
      'appium:bundleId': 'com.aurelen.axis',
      'appium:app': appPath,
      'appium:arguments': [],
      'appium:environment': {},
      'appium:showServerLogs': true,
    },
  ],
};
