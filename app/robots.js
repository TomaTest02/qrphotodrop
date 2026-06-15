export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/api/', '/pending', '/first-login', '/studio/'],
      },
    ],
    sitemap: 'https://qrphotodrop.ro/sitemap.xml',
  };
}
