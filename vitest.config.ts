import path from 'path'
import react from '@vitejs/plugin-react-swc'
import { configDefaults, defineConfig } from 'vitest/config'

/**
 * Vitest 配置。
 *
 * 关键说明：
 *  - 通过 plugin-react-swc 启用 JSX 自动运行时（automatic runtime）。
 *    没有这个插件时，所有渲染 JSX 的 hook / component 测试在 jsdom
 *    环境下会报 `ReferenceError: React is not defined`，约 140 个测试受阻。
 *  - 默认 environment 为 `node`（纯逻辑测试用），渲染用例须在文件首行
 *    使用 `// @vitest-environment jsdom` 切换为 jsdom。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
