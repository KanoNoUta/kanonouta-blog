import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	workers: 1,
	timeout: 30_000,
	use: {
		baseURL: 'http://127.0.0.1:4331',
		channel: process.env.PLAYWRIGHT_CHANNEL,
		viewport: { width: 1440, height: 1000 },
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	webServer: {
		command: 'pnpm preview --host 127.0.0.1 --port 4331',
		url: 'http://127.0.0.1:4331',
		reuseExistingServer: false,
	},
});
