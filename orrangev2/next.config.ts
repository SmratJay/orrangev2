import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for Next.js
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