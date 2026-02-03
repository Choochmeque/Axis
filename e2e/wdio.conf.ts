const isCI = !!process.env.CI;

export const baseConfig = {
  runner: 'local',
  specs: ['./specs/**/*.spec.ts'],
  maxInstances: 1,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60_000,
  },
  logLevel: isCI ? 'warn' : 'info',
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,
  services: [],
  tsConfigPath: './tsconfig.json',
};
