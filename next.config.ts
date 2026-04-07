import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "10.0.10.53",
        port: "8080",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/**",
      },
    ],
  },
};

if (process.env.NODE_ENV === "development") {
  // `next dev`: no basePath.
} else {
  // `next build` (and anything not `next dev`): subpath deploy.
  nextConfig.basePath = "/SES/social_media";
}

export default nextConfig;
