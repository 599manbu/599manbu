import { defineConfig } from 'vite'

// GitHub Pages 项目站点部署在 /<仓库名>/ 下。
// 使用相对路径，这样仓库名变化时无需修改配置。
export default defineConfig({
  base: './',
})
