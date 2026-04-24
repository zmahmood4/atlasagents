/** @type {import('next').NextConfig} */
const nextConfig = {
  // Full static export — writes to frontend/out/ at build time.
  // Every page in this app is a client component, no SSR is required.
  // Deployable to Cloudflare Pages / Netlify / GitHub Pages / any CDN.
  output: 'standalone',

  // Static-host-friendly routing: each page gets its own folder with index.html.
  trailingSlash: true,

  // Required when output:"export" — disables the Next.js image optimiser
  // (we don't use next/image anyway, but this prevents the build from erroring).
  images: {
    unoptimized: true,
  },

  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  // Client-only globals (runtime values baked at build time by Cloudflare Pages / Vercel).
};

module.exports = nextConfig;
