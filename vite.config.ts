import { defineConfig } from 'vite'

// GitHub Pages 项目站点部署在 /<仓库名>/ 下。
// 使用相对路径，这样仓库名变化时无需修改配置。
// `npm run build` 仍然输出 dist；`npm run build:demo` 输出独立的 dist-demo。
export default defineConfig(({ mode }) => ({
  base: './',
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
}))
