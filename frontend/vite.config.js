import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const API = env.VITE_API_URL || 'https://sistema-bateriasalcosto.onrender.com'

  return {
    plugins: [react()],
    base: env.BASE_URL || '/',
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: API,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      proxy: {
        '/api': {
          target: API,
          changeOrigin: true,
        },
      },
    },
  }
})
