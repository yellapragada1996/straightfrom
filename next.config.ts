import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Sample photos for the prototype. Real uploads will come from Supabase Storage.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
  },
};

export default nextConfig;
