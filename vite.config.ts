import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** GitHub Pages SPA: unknown paths serve 404.html → same as index */
function spaFallback(): Plugin {
  return {
    name: 'spa-github-pages-fallback',
    closeBundle() {
      const index = resolve('dist/index.html')
      const fallback = resolve('dist/404.html')
      if (existsSync(index)) copyFileSync(index, fallback)
    },
  }
}

function baseFromHomepage(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
      homepage?: string
    }
    if (!pkg.homepage) return '/'
    const { pathname } = new URL(pkg.homepage)
    if (!pathname || pathname === '/') return '/'
    return pathname.endsWith('/') ? pathname : `${pathname}/`
  } catch {
    return '/'
  }
}

// GitHub Pages project site: https://kk00701903-hub.github.io/private-read/
// package.json "homepage"이 base 경로의 기준입니다.
export default defineConfig(({ command }) => {
  const pagesBase = baseFromHomepage()
  // 로컬 dev는 /, 빌드·preview는 GitHub Pages 경로
  const base = process.env.VITE_BASE || (command === 'serve' ? '/' : pagesBase)

  return {
    base,
    plugins: [
      react(),
      spaFallback(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'novels/**/*', '.nojekyll'],
        manifest: {
          id: '/private-read/',
          name: '리드 — 웹소설 리더',
          short_name: '리드',
          description: '회차 MD 파일을 모바일에서 읽는 웹소설 리더',
          theme_color: '#0f1419',
          background_color: '#0f1419',
          display: 'standalone',
          start_url: '/private-read/',
          scope: '/private-read/',
          lang: 'ko',
          icons: [
            {
              src: 'pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,md,woff2,wasm}'],
          navigateFallback: 'index.html',
        },
      }),
    ],
  }
})
