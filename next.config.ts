import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable strict mode for catching potential issues
  reactStrictMode: true,

  // Static export for GitHub Pages
  output: 'export',

  // Base path for GitHub Pages (will be set by repo name)
  basePath: process.env.NODE_ENV === 'production' ? '/shade-measurement-v2' : '',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
