import os from 'os';
import path from 'path';
import { resolve } from 'path';
import { type ChildProcess, spawn } from 'child_process';

import { baseConfig } from './wdio.conf.js';

process.env.E2E_PLATFORM = 'mac';

const appPath = resolve(
  import.meta.dirname,
  '../src-tauri/target/release/bundle/macos/Axis.app/Contents/MacOS/Axis'
);

let tauriWebDriver: ChildProcess;

export const config = {
  ...baseConfig,
  hostname: '127.0.0.1',
  port: 4444,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: appPath,
      },
    },
  ],
  beforeSession() {
    tauriWebDriver = spawn(path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-webdriver'), [], {
      stdio: [null, process.stdout, process.stderr],
    });

    tauriWebDriver.on('error', (error) => {
      console.error('tauri-webdriver error:', error);
      process.exit(1);
    });
  },
  afterSession() {
    if (tauriWebDriver) {
      tauriWebDriver.kill();
    }
  },
};
