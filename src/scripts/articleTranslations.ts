type LanguageKey = 'zh' | 'ja' | 'en';

const translations = import.meta.glob<string>('../content/translations/*.html', {
	query: '?raw',
	import: 'default',
});

type ArticleState = {
	sourceHtml: string;
	codeBlocks: HTMLPreElement[];
	language: LanguageKey;
};

const articles = new WeakMap<HTMLElement, ArticleState>();
let latestRequest = 0;

export const applyArticleTranslation = async (language: LanguageKey): Promise<boolean> => {
	const request = ++latestRequest;
	const prose = document.querySelector<HTMLElement>('.prose');
	const page = document.body.dataset.i18nPage;
	if (!prose || !page?.startsWith('post.')) return true;

	let article = articles.get(prose);
	// Keep the server-rendered Chinese DOM intact until a translation is needed.
	if (!article && language === 'zh') return true;
	if (!article) {
		article = {
			sourceHtml: prose.innerHTML,
			codeBlocks: Array.from(prose.querySelectorAll('pre')),
			language: 'zh',
		};
		articles.set(prose, article);
	}

	prose.removeAttribute('aria-busy');
	if (article.language === language) return true;
	if (language === 'zh') {
		prose.innerHTML = article.sourceHtml;
		article.language = language;
		return true;
	}

	const load = translations[`../content/translations/${page.slice(5)}.${language}.html`];
	if (!load) return false;

	prose.setAttribute('aria-busy', 'true');
	try {
		const html = await load();
		// A slower request must not overwrite a more recent language choice.
		if (request !== latestRequest || !prose.isConnected) return false;
		const template = document.createElement('template');
		template.innerHTML = html;
		template.content.querySelectorAll<HTMLElement>('[data-code-ref]').forEach((slot) => {
			const replacement = article.codeBlocks[Number(slot.dataset.codeRef)]?.cloneNode(true);
			if (replacement) slot.replaceWith(replacement);
			else slot.remove();
		});
		prose.replaceChildren(template.content);
		article.language = language;
		return true;
	} finally {
		if (request === latestRequest) prose.removeAttribute('aria-busy');
	}
};
