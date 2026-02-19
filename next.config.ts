import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const customDistDir = process.env.NEXT_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  output: "standalone",
  pageExtensions: ["ts", "tsx", "mdx"],
  ...(customDistDir ? { distDir: customDistDir } : {}),
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
