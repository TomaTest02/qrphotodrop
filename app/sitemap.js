const BASE_URL = 'https://qrphotodrop.com';

// Slugurile blog — TODO: fetch dinamic din Sanity
const BLOG_SLUGS = [
  '5-idei-creative-poze-invitati',
  'cum-sa-organizezi-botez-memorabil',
  'cod-qr-viitorul-evenimentelor',
];

// Tipuri de evenimente
const EVENT_TYPES = ['nunta', 'botez', 'aniversare', 'corporate'];

export default function sitemap() {
  const now = new Date().toISOString();

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
    // Articole blog
    ...BLOG_SLUGS.map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ];
}
