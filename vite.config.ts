import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js'],
          howler: ['howler'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Neon Drift',
        short_name: 'NeonDrift',
        description: 'Mobile twin-stick shooter, pure vector, neon, lavish particles.',
        theme_color: '#0a0014',
        background_color: '#000000',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'static-resources' },
          },
        ],
      },
    }),
  ],
});
