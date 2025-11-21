/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed standalone mode for better Azure compatibility
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude pdf-parse from webpack bundling for server-side
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
    }
    return config;
  },
}

module.exports = nextConfig

