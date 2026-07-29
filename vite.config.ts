import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import StylexRsPlugin from '@stylexswc/unplugin/vite'

import pkg from './package.json'

// Baked into the bundle so support tickets can report which build a customer
// was running (src/utils/errorReport.ts). The Docker build passes the release
// tag as APP_VERSION; a plain `npm run build` falls back to package.json.
const appVersion = process.env.APP_VERSION || pkg.version

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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
      workbox: {
        // Die Screenshots der Hilfe-Artikel (public/help) dürfen NICHT in den
        // Precache: Workbox nimmt png/webp standardmäßig mit, und dann lädt
        // jeder Kunde beim ersten Öffnen die komplette Doku-Bildersammlung
        // herunter — auf einer App, die überwiegend mobil benutzt wird.
        // Sie werden bei Bedarf geladen und danach zur Laufzeit gecacht.
        globIgnores: ['**/help/**'],
      },
      // The manifest is generated at runtime from the instance settings by
      // pb_hooks/manifest.pb.js (linked in index.html) so branding changes
      // apply without rebuilding.
      manifest: false,
    }),
  ],
})
