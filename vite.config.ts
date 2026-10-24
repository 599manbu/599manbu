import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// GitHub Pages 项目站点部署在 /<仓库名>/ 下。
// 使用相对路径，这样仓库名变化时无需修改配置。
// `npm run build` 仍然输出 dist；`npm run build:demo` 输出 dist-demo；
// `npm run build:4399` 输出 dist-4399（关闭云端账号与外部跳转，供 4399 审核）。
export default defineConfig(({ mode }) => {
  // Vite 8 会把纯数字 mode 解析成 number（4399），统一转成字符串再比较。
  const buildMode = String(mode)
  return {
    base: './',
    resolve: buildMode === '4399'
      ? { alias: { 'hydrogen-js-sdk': fileURLToPath(new URL('./src/cloud-stub.ts', import.meta.url)) } }
      : undefined,
    build: {
      outDir: buildMode === 'demo' ? 'dist-demo' : buildMode === '4399' ? 'dist-4399' : 'dist',
    },
  }
})
