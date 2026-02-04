import os from 'os';
import path from 'path';
import { resolve } from 'path';
import { type ChildProcess, spawn } from 'child_process';

import { baseConfig } from './wdio.conf.js';

const appPath = resolve(
  import.meta.dirname,
  '../src-tauri/target/release/bundle/macos/Axis.app/Contents/MacOS/Axis'
);

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
};
