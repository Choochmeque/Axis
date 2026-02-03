import { resolve } from 'path';

import { baseConfig } from './wdio.conf.js';

// Set platform for selector strategy (CSS selectors for tauri-driver)
process.env.E2E_PLATFORM = 'windows';

const appPath = resolve(import.meta.dirname, '../src-tauri/target/release/Axis.exe');

export const config = {
  ...baseConfig,
  hostname: '127.0.0.1',
  port: 4444,
  capabilities: [
    {
      'tauri:options': {
        application: appPath,
      },
    },
  ],
};
