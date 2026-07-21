import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      // take over immediately on deploy — without this the new service worker
      // stays "waiting" and users keep seeing the old cached app
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      // The manifest is generated at runtime from the instance settings by
      // pb_hooks/manifest.pb.js (linked in index.html) so branding changes
      // apply without rebuilding.
      manifest: false,
    }),
  ],
})
