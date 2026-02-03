import { resolve } from 'path';

import { baseConfig } from './wdio.conf.js';

process.env.E2E_PLATFORM = 'linux';

const appPath = resolve(import.meta.dirname, '../src-tauri/target/release/axis');

export const config = {
  ...baseConfig,
  hostname: '127.0.0.1',
  port: 4444,
  capabilities: [
    {
      browserName: 'MiniBrowser',
      'webkitgtk:browserOptions': {
        binary: appPath,
        args: [],
      },
    },
  ],
};
