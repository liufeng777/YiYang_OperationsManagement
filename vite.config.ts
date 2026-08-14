import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url)).replace(/\\/g, '/')

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve('src'),
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          // 为项目内所有 less 文件自动注入设计变量与混入（reference 模式，不产生多余 CSS）
          additionalData: (source: string, filename: string) => {
            if (filename.includes('node_modules')) return source
            if (filename.endsWith('variables.less') || filename.endsWith('mixins.less')) {
              return source
            }
            return `@import (reference) "${resolve('src/styles/variables.less')}";\n@import (reference) "${resolve('src/styles/mixins.less')}";\n${source}`
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: false,
      proxy: {
        // 开发环境代理：/api -> 后端服务
        [env.VITE_API_BASE_URL || '/api']: {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // Vite 8（rolldown）仅支持函数形式的 manualChunks
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react'
            }
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'antd'
            }
            return undefined
          },
        },
      },
    },
  }
})
