import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: IconsResolver({
        // 自动将 <XxxXxx /> 映射到 @iconify-icons/xxx/xxx-xx-xx
        // 例如: <Game24Filled /> → @iconify-icons/fluent/game-24-filled
        enabledCollections: ['fluent', 'ph', 'lucide', 'tabler', 'carbon'],
      }),
    }),
    Icons({
      compiler: 'vue3',
      // 图标数据来自 iconify 官方集合，会在构建时打包进产物
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '',
        api: 'modern-compiler'
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true
  }
})
