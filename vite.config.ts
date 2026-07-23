import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import StylexRsPlugin from '@stylexswc/unplugin/vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [
    // Compiles StyleX (stylex.create / the Astryx `xstyle` prop) in our own
    // source via the Rust/SWC transform and extracts the generated CSS.
    // Astryx ships its component styles pre-compiled (astryx.css), so only our
    // override styles need this. Runs before the React transform.
    StylexRsPlugin(),
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
