/**
 * App Store - 全局应用状态
 * 管理主题、语言、侧边栏等全局 UI 状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ThemeMode = 'dark' | 'light'
export type Language = 'zh-CN' | 'en-US'

export const useAppStore = defineStore('app', () => {
  // ====== 状态 ======
  const theme = ref<ThemeMode>('dark')
  const language = ref<Language>('zh-CN')
  const sidebarCollapsed = ref(false)
  const sidebarWidth = ref(220)
  const isElectron = ref(false)

  // ====== 计算属性 ======
  const isDark = computed(() => theme.value === 'dark')

  // ====== 操作 ======

  /** 切换主题 */
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme()
  }

  function setTheme(t: ThemeMode) {
    theme.value = t
    applyTheme()
  }

  /** 应用主题到 DOM */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.value)
    // 持久化
    localStorage.setItem('mcla_theme', theme.value)
  }

  /** 初始化（从 localStorage 恢复） */
  function init() {
    isElectron.value = !!window.electronAPI
    const saved = localStorage.getItem('mcla_theme') as ThemeMode | null
    if (saved) {
      theme.value = saved
      applyTheme()
    }
    applyTheme()
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return {
    theme,
    language,
    sidebarCollapsed,
    sidebarWidth,
    isElectron,
    isDark,
    toggleTheme,
    setTheme,
    init,
    toggleSidebar,
  }
})
