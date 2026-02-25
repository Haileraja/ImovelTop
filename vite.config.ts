import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    // Allow access on any port; configure HMR so the WebSocket
    // always connects back to the actual Vite dev-server port.
    hmr: {
      // When the browser URL differs from the Vite server port
      // (e.g. accessed via 5181 but Vite is on 5173), the
      // WebSocket must target the real Vite port.
      clientPort: undefined,   // auto-detect; set to 5173 if auto fails
      protocol: 'ws',
    },
    proxy: {
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
