import { client } from '../sanity/lib/client';

const BASE_URL = 'https://qrphotodrop.com';

// Tipuri de evenimente
const EVENT_TYPES = ['nunta', 'botez', 'aniversare', 'corporate'];

const BLOG_SLUGS_QUERY = `*[_type == "post" && defined(slug.current)]{ "slug": slug.current, "updated": coalesce(_updatedAt, publishedAt) }`;

async function getBlogSlugs() {
  try {
    return await client.fetch(BLOG_SLUGS_QUERY);
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const now = new Date().toISOString();
  const posts = await getBlogSlugs();

  return [
    // Pagini principale
    { url: BASE_URL,                     lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/preturi`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/blog`,           lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/contact`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    // Pagini tipuri de evenimente
    ...EVENT_TYPES.map((type) => ({
      url: `${BASE_URL}/eveniment/${type}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    })),
    // Autentificare (prioritate mică — nu sunt pagini SEO)
    { url: `${BASE_URL}/register`,       lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/login`,          lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    // Articole blog (dinamic din Sanity)
    ...posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updated || now,
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ];
}
