// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://kanonouta.com',
	devToolbar: {
		enabled: false,
	},
	markdown: {
		shikiConfig: {
			themes: {
				light: 'light-plus',
				dark: 'light-plus',
			},
			defaultColor: false,
		},
	},
	integrations: [mdx(), sitemap()],
});
