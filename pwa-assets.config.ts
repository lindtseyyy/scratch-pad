import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, favicons: [] },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#386349' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#386349' } },
  },
  images: ['public/favicon.svg'],
})
