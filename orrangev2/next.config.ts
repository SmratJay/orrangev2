import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for Next.js
  
  // Sentry configuration for error tracking
  experimental: {
    instrumentationHook: true,
  },

  // Security: Disable powered by header
  poweredByHeader: false,

  // Security: Add headers to all responses
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
    ];
  },
  
  webpack: (config, { isServer }) => {
    // Ignore Solana packages that Privy references but we don't use
    // This prevents build errors when Privy's internal code tries to import Solana dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana-program/system': false,
      '@solana-program/token': false,
      '@solana/kit': false,
      '@solana/web3.js': false,
    };

    return config;
  },
};

export default nextConfig;