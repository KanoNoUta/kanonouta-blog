import { onAnimationFrame } from '../lib/frame';

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
const scheduleScrollState = onAnimationFrame(updateScrollState);
window.addEventListener('scroll', scheduleScrollState, { passive: true });
window.addEventListener('resize', scheduleScrollState);
new ResizeObserver(scheduleScrollState).observe(document.body);

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
const scheduleNavIndicator = onAnimationFrame(() => positionNavIndicator());
window.addEventListener('resize', scheduleNavIndicator);
void document.fonts.ready.then(scheduleNavIndicator);
window.addEventListener('kano:language-change', () => {
	scheduleNavIndicator();
	scheduleScrollState();
});

nav?.querySelectorAll<HTMLElement>('a').forEach((link) => {
	link.addEventListener('pointerenter', () => positionNavIndicator(link));
	link.addEventListener('focus', () => positionNavIndicator(link));
});

nav?.addEventListener('pointerleave', () => positionNavIndicator());
nav?.addEventListener('focusout', scheduleNavIndicator);

const closeNav = () => {
	navToggle?.setAttribute('aria-expanded', 'false');
	root.removeAttribute('data-nav-open');
};

window.matchMedia('(max-width: 860px)').addEventListener('change', (event) => {
	if (!event.matches) closeNav();
	scheduleNavIndicator();
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && root.hasAttribute('data-nav-open')) {
		closeNav();
		navToggle?.focus();
	}
});

navToggle?.addEventListener('click', () => {
	const expanded = navToggle.getAttribute('aria-expanded') === 'true';
	navToggle.setAttribute('aria-expanded', String(!expanded));
	root.toggleAttribute('data-nav-open', !expanded);
	scheduleNavIndicator();
});

nav?.querySelectorAll('a').forEach((link) => {
	link.addEventListener('click', closeNav);
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
		// A long article may never reach a percentage-based intersection threshold.
		{ rootMargin: '0px 0px -10% 0px', threshold: 0 },
	);

	revealTargets.forEach((target, index) => {
		target.style.setProperty('--reveal-index', String(index % 8));
		observer.observe(target);
	});

	const hero = document.querySelector<HTMLElement>('.home-hero');
	const moveHero = onAnimationFrame((event: PointerEvent) => {
		if (!hero || reduceMotion.matches || event.pointerType === 'touch') return;
		const rect = hero.getBoundingClientRect();
		hero.style.setProperty('--pointer-x', ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
		hero.style.setProperty('--pointer-y', ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
	});
	hero?.addEventListener('pointermove', moveHero, { passive: true });
	hero?.addEventListener('pointerleave', () => {
		moveHero.cancel();
		hero.style.removeProperty('--pointer-x');
		hero.style.removeProperty('--pointer-y');
	});

	const interactiveSurfaces = document.querySelectorAll<HTMLElement>(
		'.quiet-panel, .post-card, .timeline-item, .paper-sheet, .icon-link',
	);

	interactiveSurfaces.forEach((surface) => {
		const moveSurface = onAnimationFrame((event: PointerEvent) => {
			if (reduceMotion.matches || event.pointerType === 'touch') return;
			const rect = surface.getBoundingClientRect();
			surface.style.setProperty('--surface-x', ((event.clientX - rect.left) / rect.width).toFixed(3));
			surface.style.setProperty('--surface-y', ((event.clientY - rect.top) / rect.height).toFixed(3));
		});
		surface.addEventListener('pointermove', moveSurface, { passive: true });

		surface.addEventListener('pointerleave', () => {
			moveSurface.cancel();
			surface.style.removeProperty('--surface-x');
			surface.style.removeProperty('--surface-y');
		});
	});
}
