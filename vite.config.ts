import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'Scratch-Pad',
        short_name: 'Scratch-Pad',
        description: 'Save links, add a few tags, and find your way back.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f8f8f7',
        theme_color: '#f8f8f7',
        icons: [
          {
            src: '/scratch-pad-logo/png/scratch-pad-icon-64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: '/scratch-pad-logo/png/scratch-pad-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/scratch-pad-logo/png/scratch-pad-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/scratch-pad-logo/png/scratch-pad-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/scratch-pad-logo/png/scratch-pad-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/scratch-pad-logo/png/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
        share_target: {
          action: '/share',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        shortcuts: [
          {
            name: 'Add a link',
            url: '/?add=1',
            icons: [
              {
                src: '/scratch-pad-logo/png/scratch-pad-icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
      },
      includeAssets: ['scratch-pad-logo/svg/scratch-pad-icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['scratch-pad-logo/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/(?:assets\/|sw\.js|workbox-|manifest\.webmanifest|favicon\.|pwa-|maskable-|apple-touch-|scratch-pad-logo\/)/,
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: { include: ['src/**/*.test.{ts,tsx}', 'extension/**/*.test.js'] },
})
