import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
};

export default nextConfig;
