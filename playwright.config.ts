import { defineConfig } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the Chrome already on the machine. On a fresh CI box run: npx playwright install chrome
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    // A production build, not the dev server: tests run in parallel and a cold dev server transforms files on
    // demand, which made the first lazy import (the trail map) flaky. It is also closer to what ships.
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
