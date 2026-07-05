const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const header = document.querySelector<HTMLElement>('.site-header');
const nav = document.querySelector<HTMLElement>('.nav-links');
const navToggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
const navIndicator = document.querySelector<HTMLElement>('.nav-indicator');

root.classList.add('motion-ready');

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

const updateScrollState = () => {
	const scrolled = window.scrollY > 12;
	const scrollable = document.documentElement.scrollHeight - window.innerHeight;
	const scrollProgress = scrollable > 0 ? window.scrollY / scrollable : 0;

	header?.toggleAttribute('data-scrolled', scrolled);
	root.style.setProperty('--scroll-y', `${Math.min(window.scrollY, 720) / 720}`);
	root.style.setProperty('--scroll-progress', String(clamp(scrollProgress)));
};

updateScrollState();
window.addEventListener('scroll', updateScrollState, { passive: true });
window.addEventListener('resize', updateScrollState);

const positionNavIndicator = (target?: HTMLElement | null) => {
	if (!nav || !navIndicator) return;

	const activeLink = target ?? nav.querySelector<HTMLElement>('a.active') ?? nav.querySelector<HTMLElement>('a');
	if (!activeLink) return;

	const navRect = nav.getBoundingClientRect();
	const linkRect = activeLink.getBoundingClientRect();

	nav.style.setProperty('--nav-pill-left', `${linkRect.left - navRect.left}px`);
	nav.style.setProperty('--nav-pill-width', `${linkRect.width}px`);
	navIndicator.style.opacity = '1';
};

positionNavIndicator();
window.addEventListener('resize', () => positionNavIndicator());
window.addEventListener('kano:language-change', () => {
	requestAnimationFrame(() => positionNavIndicator());
});

nav?.querySelectorAll<HTMLElement>('a').forEach((link) => {
	link.addEventListener('pointerenter', () => positionNavIndicator(link));
	link.addEventListener('focus', () => positionNavIndicator(link));
});

nav?.addEventListener('pointerleave', () => positionNavIndicator());

navToggle?.addEventListener('click', () => {
	const expanded = navToggle.getAttribute('aria-expanded') === 'true';
	navToggle.setAttribute('aria-expanded', String(!expanded));
	root.toggleAttribute('data-nav-open', !expanded);
});

nav?.querySelectorAll('a').forEach((link) => {
	link.addEventListener('click', () => {
		navToggle?.setAttribute('aria-expanded', 'false');
		root.removeAttribute('data-nav-open');
	});
});

if (!reduceMotion.matches) {
	const revealTargets = document.querySelectorAll<HTMLElement>('[data-reveal]');
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				entry.target.setAttribute('data-revealed', 'true');
				observer.unobserve(entry.target);
			}
		},
		{ rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
	);

	revealTargets.forEach((target, index) => {
		target.style.setProperty('--reveal-index', String(index % 8));
		observer.observe(target);
	});

	const hero = document.querySelector<HTMLElement>('.home-hero');
	let heroFrame = 0;

	hero?.addEventListener(
		'pointermove',
		(event) => {
			if (heroFrame) cancelAnimationFrame(heroFrame);

			heroFrame = requestAnimationFrame(() => {
				heroFrame = 0;
				const rect = hero.getBoundingClientRect();
				const x = ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3);
				const y = ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3);
				hero.style.setProperty('--pointer-x', x);
				hero.style.setProperty('--pointer-y', y);
			});
		},
		{ passive: true },
	);

	const interactiveSurfaces = document.querySelectorAll<HTMLElement>(
		'.quiet-panel, .post-card, .timeline-item, .paper-sheet, .icon-link',
	);

	interactiveSurfaces.forEach((surface) => {
		surface.addEventListener(
			'pointermove',
			(event) => {
				const rect = surface.getBoundingClientRect();
				const x = ((event.clientX - rect.left) / rect.width).toFixed(3);
				const y = ((event.clientY - rect.top) / rect.height).toFixed(3);
				surface.style.setProperty('--surface-x', x);
				surface.style.setProperty('--surface-y', y);
			},
			{ passive: true },
		);

		surface.addEventListener('pointerleave', () => {
			surface.style.removeProperty('--surface-x');
			surface.style.removeProperty('--surface-y');
		});
	});
}
