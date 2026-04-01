import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  
};

if (process.env.NODE_ENV === "development") {
  // `next dev`: no basePath.
} else {
  // `next build` (and anything not `next dev`): subpath deploy.
  nextConfig.basePath = "/SES/social_media";
}

export default nextConfig;
