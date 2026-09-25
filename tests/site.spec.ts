import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const posts = readdirSync('src/content/blog').map((file) => file.replace(/[.]mdx?$/, ''));
const routes = ['/', '/blog/', '/about/', '/links/', '/lab/', '/lab/map/', ...posts.map((id) => `/blog/${id}/`)];
const translationAsset = { test: (url: string) => url.includes('/_astro/') && /[.](en|ja)[.].*[.]js$/.test(url) };

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
	test.describe(`${viewport.width}px`, () => {
		test.use({ viewport });
		for (const path of routes) {
			test(`renders ${path} without overflow, broken images, or browser errors`, async ({ page }, testInfo) => {
				const errors: string[] = [];
				page.on('pageerror', (error) => errors.push(error.message));
				await page.addInitScript(() => { Math.random = () => 0; });
				const response = await page.goto(path);
				expect(response?.status()).toBe(200);
				await expect(page.locator('html')).toHaveAttribute('data-language', 'zh');
				expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
				if (path !== '/lab/map/') await expect(page.locator('main h1')).toBeVisible();
				if (path.startsWith('/blog/') && path !== '/blog/') {
					await page.locator('.prose > :first-child').scrollIntoViewIfNeeded();
					await expect(page.locator('.prose')).toHaveCSS('opacity', '1');
				}
				for (const img of await page.locator('main img').all()) {
					await img.scrollIntoViewIfNeeded();
					await expect.poll(() => img.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
				}
				await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
				await page.screenshot({ path: testInfo.outputPath('page.png'), animations: 'disabled' });
				expect(errors).toEqual([]);
			});
		}
	});
}

test('home does not download article translations and keeps the Japanese quotes', async ({ page }) => {
	const translations: string[] = [];
	page.on('request', (request) => { if (translationAsset.test(request.url())) translations.push(request.url()); });
	await page.goto('/');
	for (const language of ['en', 'ja', 'zh']) {
		await page.locator(`[data-lang-button=${language}]`).click();
		await expect(page.locator('html')).toHaveAttribute('data-language', language);
		await expect(page.locator('.hero-lead')).toContainText('「夏が僕らを呼ぶのなら」');
		await expect(page.locator('.second-screen__quote')).toContainText('「僕らはきっと強くなれる　上を向ける　また歩ける」');
	}
	expect(translations).toEqual([]);
});

for (const id of posts) {
	test(`loads only the requested translation and preserves code for ${id}`, async ({ page }) => {
		const requests: string[] = [];
		page.on('request', (request) => { if (translationAsset.test(request.url())) requests.push(request.url()); });
		await page.goto(`/blog/${id}/`);
		await expect(page.locator('html')).toHaveAttribute('data-language', 'zh');
		const original = await page.locator('.prose').innerHTML();
		const sourceCode = await page.locator('.prose pre').allTextContents();
		expect(requests).toEqual([]);
		for (const language of ['en', 'ja']) {
			await page.locator(`[data-lang-button=${language}]`).click();
			await expect(page.locator('html')).toHaveAttribute('data-language', language);
			const html = readFileSync(`src/content/translations/${id}.${language}.html`, 'utf8');
			const refs = [...html.matchAll(/data-code-ref="([0-9]+)"/g)].map((match) => Number(match[1]));
			await expect(page.locator('.prose [data-code-ref]')).toHaveCount(0);
			const actualCode = await page.locator('.prose pre').allTextContents();
			for (const ref of refs) expect(actualCode).toContain(sourceCode[ref]);
			expect(await page.locator('.prose').innerText()).not.toHaveLength(0);
		}
		expect(requests).toHaveLength(2);
		expect(requests.every((url) => url.includes(id))).toBe(true);
		await page.locator('[data-lang-button=zh]').click();
		await expect(page.locator('html')).toHaveAttribute('data-language', 'zh');
		expect(await page.locator('.prose').innerHTML()).toBe(original);
	});
}

test('a delayed translation cannot overwrite a newer language selection', async ({ page }) => {
	await page.route(/raphael-crafting-solver-ruri[.]en[.].*[.]js/, async (route) => {
		await delay(350);
		await route.continue();
	});
	await page.goto('/blog/raphael-crafting-solver-ruri/');
	await expect(page.locator('html')).toHaveAttribute('data-language', 'zh');
	const original = await page.locator('.prose').innerHTML();
	const loaded = page.waitForResponse(/raphael-crafting-solver-ruri[.]en[.].*[.]js/);
	await page.locator('[data-lang-button=en]').click();
	await page.locator('[data-lang-button=zh]').click();
	await loaded;
	await delay(100);
	await expect(page.locator('html')).toHaveAttribute('data-language', 'zh');
	expect(await page.locator('.prose').innerHTML()).toBe(original);
	await expect(page.locator('.prose')).not.toHaveAttribute('aria-busy', 'true');
});

test('translation download failure preserves the readable current article', async ({ page }) => {
	await page.route(/raphael-crafting-solver-ruri[.]en[.].*[.]js/, (route) => route.abort());
	await page.goto('/blog/raphael-crafting-solver-ruri/');
	await expect(page.locator('html')).toHaveAttribute('data-language', 'zh');
	const original = await page.locator('.prose').innerHTML();
	const failed = page.waitForEvent('requestfailed', { predicate: (request) => request.url().includes('raphael-crafting-solver-ruri.en.') });
	await page.locator('[data-lang-button=en]').click();
	await failed;
	await expect(page.locator('.prose')).not.toHaveAttribute('aria-busy', 'true');
	await expect(page.locator('html')).toHaveAttribute('data-language', 'zh');
	expect(await page.locator('.prose').innerHTML()).toBe(original);
	await page.locator('[data-lang-button=ja]').click();
	await expect(page.locator('html')).toHaveAttribute('data-language', 'ja');
});

test('language switching works with browser storage blocked', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
	});
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	await page.locator('[data-lang-button=en]').click();
	await expect(page.locator('html')).toHaveAttribute('data-language', 'en');
	expect(errors).toEqual([]);
});

test('language selection survives navigation and reload', async ({ page }) => {
	await page.goto('/');
	await page.locator('[data-lang-button=ja]').click();
	await expect(page.locator('html')).toHaveAttribute('data-language', 'ja');
	await page.goto('/blog/raphael-crafting-solver-ruri/');
	await expect(page.locator('html')).toHaveAttribute('data-language', 'ja');
	await expect(page.locator('.prose')).toContainText('Raphael');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-language', 'ja');
});

test('mobile navigation closes with Escape and restores keyboard focus', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.locator('.nav-links')).toBeHidden();
	await page.locator('.nav-toggle').click();
	await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
	await page.keyboard.press('Escape');
	await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
	await expect(page.locator('.nav-toggle')).toBeFocused();
});

for (const width of [320, 390]) {
	test(`mobile language controls stay visible without overlapping the brand at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 844 });
		await page.goto('/');
		for (const language of ['en', 'ja', 'zh']) {
			await page.locator(`[data-lang-button=${language}]`).click();
			await expect(page.locator('html')).toHaveAttribute('data-language', language);
		}
		const brand = await page.locator('.site-brand').boundingBox();
		const locale = await page.locator('.nav-locale').boundingBox();
		const toggle = await page.locator('.nav-toggle').boundingBox();
		expect(brand!.x + brand!.width).toBeLessThanOrEqual(locale!.x);
		expect(locale!.x + locale!.width).toBeLessThanOrEqual(toggle!.x);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
		await page.screenshot({ path: testInfo.outputPath('mobile-controls.png'), animations: 'disabled' });
	});
}

test('mobile section badge has space above the Japanese quote', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.locator('.second-screen__quote').scrollIntoViewIfNeeded();
	await expect(page.locator('.second-screen__quote')).toHaveCSS('opacity', '1');
	const fits = await page.evaluate(() => {
		const section = document.querySelector('.second-screen')!;
		const quote = document.querySelector('.second-screen__quote')!;
		const style = getComputedStyle(section, '::after');
		const badgeBottom = parseFloat(style.top) + parseFloat(style.height) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
		return quote.getBoundingClientRect().top - section.getBoundingClientRect().top > badgeBottom;
	});
	expect(fits).toBe(true);
});

test('map zoom, drag, labels, marker visibility, and reset remain functional', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/lab/map/');
	const map = page.locator('.footprint-map');
	const initial = await map.getAttribute('viewBox');
	await expect(page.locator('[data-map-zoom-out]')).toBeDisabled();
	await expect(page.locator('.place-marker[tabindex="0"]')).toHaveCount(0);
	const region = page.locator('.land-china path').first();
	await region.dispatchEvent('pointermove', { clientX: 600, clientY: 400, pointerId: 1 });
	await expect(page.locator('[data-map-hover-label]')).toHaveText(await region.getAttribute('data-map-name') ?? '');
	for (let i = 0; i < 3; i++) await page.locator('[data-map-zoom-in]').click();
	await expect(page.locator('.map-paper')).toHaveAttribute('data-show-markers');
	await expect(page.locator('.place-marker[tabindex="0"]')).toHaveCount(11);
	const zoomed = await map.getAttribute('viewBox');
	const box = await map.boundingBox();
	expect(box).not.toBeNull();
	await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
	await page.mouse.down();
	await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2 + 40, { steps: 8 });
	await page.mouse.up();
	expect(await map.getAttribute('viewBox')).not.toBe(zoomed);
	await expect(page.locator('.map-paper')).not.toHaveAttribute('data-map-dragging');
	await page.locator('[data-map-reset]').click();
	await expect(map).toHaveAttribute('viewBox', initial!);
	await expect(page.locator('.place-marker[tabindex="0"]')).toHaveCount(0);
});

test('dark mode and reduced motion keep article content visible on mobile', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
	await page.goto('/blog/raphael-crafting-solver-ruri/');
	await page.locator('.prose > :first-child').scrollIntoViewIfNeeded();
	await expect(page.locator('.prose')).toHaveCSS('opacity', '1');
	await page.screenshot({ path: testInfo.outputPath('dark-article.png') });
});

test('RSS and sitemap remain available', async ({ request }) => {
	for (const path of ['/rss.xml', '/sitemap-index.xml', '/sitemap-0.xml']) {
		const response = await request.get(path);
		expect(response.ok()).toBe(true);
		expect(await response.text()).toContain('kanonouta.com');
	}
});
