/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Re-enable build errors by default; allow opt-out for constrained hosts
    ignoreBuildErrors: process.env.DISABLE_BUILD_CHECKS === '1',
  },
  eslint: {
    ignoreDuringBuilds: process.env.DISABLE_BUILD_CHECKS === '1',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'files.catbox.moe',
      }
    ],
    domains: [
      'placehold.co',
      'i.imgur.com',
      'files.catbox.moe'
    ],
  },
  // Optional: Add if you're using styled-components or emotion
  compiler: {
    styledComponents: true,
  },
  // Optional: Add if you need to enable React Strict Mode
  reactStrictMode: true,
  // Quiet optional/unused modules that some optional deps try to import
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@opentelemetry/exporter-jaeger': false,
      '@genkit-ai/firebase': false,
      'require-in-the-middle': false,
    };
    return config;
  },
};

module.exports = nextConfig;
