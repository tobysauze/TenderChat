/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Disable server-side features for static export
  experimental: {
    appDir: true,
  },
  // Add base path for GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/TenderChat' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/TenderChat/' : '',
}

module.exports = nextConfig
