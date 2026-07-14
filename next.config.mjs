/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // Next 16 permite implicit doar calitatea 75. Hero.js folosește 60 (intenționat,
    // pt. performanță) → 6 warning-uri „quality 60 not configured". Le permitem explicit.
    qualities: [60, 75],
    // Servim AVIF > WebP > JPEG — PageSpeed adore asta
    formats: ['image/avif', 'image/webp'],
    // Cache imagini optimizate timp de 1 an pe CDN
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
    ],
  },

  // Cache headers pentru assets statice și API-uri publice
  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, // Blocks iframe clickjacking, but allows SAMEORIGIN for Sanity Studio
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Imagini statice — cache 1 an pe browser și CDN
        source: '/:path*.:ext(jpg|jpeg|png|webp|avif|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Fonturi — cache 1 an
        source: '/:path*.:ext(woff|woff2|ttf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // QR code API — cache 1 oră (nu se schimbă des)
        source: '/api/qrcode',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Date publice eveniment — cache 1 min cu revalidare în fundal
        source: '/api/events',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
