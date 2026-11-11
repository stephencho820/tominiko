import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  async redirects() {
    return [
      { source: "/shop/zero-커피-백", destination: "/shop/todays-choice-coffee-bag", permanent: true },
      { source: "/shop/tomi-blend-coffee-bag", destination: "/shop/todays-choice-coffee-bag", permanent: true },
    ];
  },
};

export default nextConfig;
