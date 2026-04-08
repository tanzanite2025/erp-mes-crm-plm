import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { tanstackRouterConfig } from './scripts/tanstack-router-config.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载当前模式下的环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  // 代理目标解析：优先读取环境变量 VITE_PROXY_TARGET，缺失则默认为本地后端
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [
      tanstackRouter(tanstackRouterConfig),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'excel-vendor': ['exceljs'],
            'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
            'router-vendor': ['@tanstack/react-router'],
          }
        }
      },
      chunkSizeWarningLimit: 1000,
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        }
      }
    },
  }
})
