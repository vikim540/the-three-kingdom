import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4：仅需此插件，无需 postcss.config / tailwind.config，
// 内容文件由引擎自动扫描。
export default defineConfig({
  plugins: [tailwindcss()],
  // 关闭输出目录清空：本机 node 的「安全删除」trash 工具偶发超时，会卡死 build。
  // 改为原地覆盖，产物无残留风险（hash 文件名自动失效旧资源）。
  build: { emptyOutDir: false },
});
