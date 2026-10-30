import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['web-push'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      // Every page refuses to be framed — except the public timetable, which the
      // gym website (Squarespace) embeds. That one may be framed by the website
      // only (+ Squarespace's editor preview). (S425)
      {
        source: '/((?!stundenplan).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
      {
        source: '/stundenplan',
        headers: [{
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'self' https://www.the-forge-functional-fitness.de https://the-forge-functional-fitness.de https://*.squarespace.com",
        }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
