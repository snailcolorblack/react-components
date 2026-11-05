import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/*
 * Нижняя граница поддержки: движки, где есть popover и всё, на чём стоят
 * компоненты, и где проверены запасные пути. Подробности — в
 * src/components/README.md, раздел «Браузеры».
 */
const browsers = ['chrome121', 'edge121', 'firefox134', 'safari18.2']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: browsers,
    cssTarget: browsers,
  },
})
