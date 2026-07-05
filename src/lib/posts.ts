import type { CollectionEntry } from 'astro:content';

export function sortPosts(posts: CollectionEntry<'blog'>[]) {
	return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function getPostSlug(post: CollectionEntry<'blog'>) {
	return `/blog/${post.id}/`;
}

export function getPostYear(post: CollectionEntry<'blog'>) {
	return post.data.pubDate.getFullYear();
}

