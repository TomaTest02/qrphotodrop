/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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

  // Permitem upload-uri mari (iPhone ProRAW + videoclipuri 4K)
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
  },

  // Cache headers pentru assets statice și API-uri publice
  async headers() {
    return [
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
