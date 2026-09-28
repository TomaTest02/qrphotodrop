import { client } from '../sanity/lib/client';

// Se reîmprospătează instant prin webhook-ul /api/revalidate când postezi pe Sanity.
// Fallback: o dată pe zi (dacă webhook-ul nu e configurat) — consum minim.
export const revalidate = 86400;

const BASE_URL = 'https://qrphotodrop.com';

// Tipuri de evenimente
const EVENT_TYPES = ['nunta', 'botez', 'aniversare', 'corporate'];

// Pagini legale
const LEGAL_PAGES = ['termeni', 'confidentialitate', 'cookies'];

const BLOG_SLUGS_QUERY = `*[_type == "post" && defined(slug.current)]{ "slug": slug.current, "updated": coalesce(_updatedAt, publishedAt) }`;

async function getBlogSlugs() {
  try {
    return await client.fetch(BLOG_SLUGS_QUERY);
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const posts = await getBlogSlugs();

  // Paginile statice NU primesc lastModified: o dată regenerată la fiecare build
  // (identică pe toate URL-urile) nu e un semnal real și Google învață să o ignore.
  // /register și /login nu sunt în sitemap — pagini de aplicație, cu noindex.
  return [
    // Pagini principale
    { url: BASE_URL,                     changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/preturi`,        changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/blog`,           changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/contact`,        changeFrequency: 'monthly', priority: 0.7 },
    // Pagini tipuri de evenimente
    ...EVENT_TYPES.map((type) => ({
      url: `${BASE_URL}/eveniment/${type}`,
      changeFrequency: 'monthly',
      priority: 0.8,
    })),
    // Pagini legale
    ...LEGAL_PAGES.map((slug) => ({
      url: `${BASE_URL}/${slug}`,
      changeFrequency: 'yearly',
      priority: 0.2,
    })),
    // Articole blog (dinamic din Sanity) — lastModified real, din Sanity
    ...posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      ...(post.updated ? { lastModified: post.updated } : {}),
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ];
}
