import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 將原生資料庫模組與 Phaser 標記為 Server External，避免 Next.js Webpack 打包原生二進位檔導致 500 錯誤與 Chunk 缺失
  serverExternalPackages: ["@libsql/client"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
