import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// MCLA Design System
import './styles/pixel-ui.css'
import './styles/global.scss'
import './styles/animations.scss'
import './styles/variables.scss'
import './styles/themes/dark.scss'
import './styles/themes/light.scss'

// 注入 SVG 图标 Sprite 到 DOM（供全局 <use xlink:href="#pc-icon-xxx"> 引用）
import iconSpriteRaw from './styles/mcla-icons.svg?raw'
const spriteContainer = document.getElementById('svg-sprite')
if (spriteContainer) {
  spriteContainer.innerHTML = iconSpriteRaw
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
