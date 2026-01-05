import { defineConfig } from '@playwright/test';

const commonUse = {
  viewport: {
    width: 1920,
    height: 1080,
  },
  video: {
    mode: 'on' as const,
    size: {
      width: 1920,
      height: 1080,
    },
  },
  screenshot: {
    mode: 'off' as const,
  },
  ignoreHTTPSErrors: true,
  strict: false
}

export default defineConfig({
  reporter: [['./reporter.ts']],
  timeout: 600000, // 10 minutes
  projects: [
    {
      name: 'Chrome',
      use: { ...commonUse, userAgent: 'Chrome' },
    },
    {
      name: 'Edge',
      use: { ...commonUse, userAgent: 'Edge', channel: 'msedge' },
    },
    {
      name: 'Firefox',
      use: { ...commonUse, userAgent: 'Firefox' },
    },
    {
      name: 'Safari',
      use: { ...commonUse, userAgent: 'Safari' },
    }
  ],
});