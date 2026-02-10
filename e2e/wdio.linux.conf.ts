import os from 'os';
import path from 'path';
import { resolve } from 'path';
import { type ChildProcess, spawn } from 'child_process';

import { baseConfig } from './wdio.conf.js';

process.env.E2E_PLATFORM = 'linux';

const appPath = resolve(import.meta.dirname, '../src-tauri/target/release/Axis');

let tauriDriver: ChildProcess;

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
    tauriDriver = spawn(path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver'), [], {
      stdio: [null, process.stdout, process.stderr],
    });

    tauriDriver.on('error', (error) => {
      console.error('tauri-driver error:', error);
      process.exit(1);
    });
  },
  afterSession() {
    if (tauriDriver) {
      tauriDriver.kill();
    }
  },
};
