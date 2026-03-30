import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'J9 Command Center',
        short_name: 'J9 CC',
        description: 'Agency management app',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://res.cloudinary.com/duy32f0q4/image/upload/w_192,h_192,c_pad,b_black/v1773874676/20A38445-8946-49E1-8330-AA60BFA12F74_1_1_fuobbj.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'https://res.cloudinary.com/duy32f0q4/image/upload/w_512,h_512,c_pad,b_black/v1773874676/20A38445-8946-49E1-8330-AA60BFA12F74_1_1_fuobbj.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
