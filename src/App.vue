<template>
  <div class="mcla-app">
    <!-- 深蓝标题栏 + 内嵌标签页 -->
    <header class="titlebar">
      <!-- 品牌 -->
      <span class="brand">MCLA</span>

      <!-- 标签导航（内嵌标题栏） -->
      <nav class="tab-nav">
        <button
          v-for="tab in tabs"
          :key="tab.path"
          class="tab-pill"
          :class="{ active: currentRoute === tab.path }"
          @click="$router.push(tab.path)"
        >
          <span v-html="tab.svg"></span>
          {{ tab.label }}
        </button>
      </nav>

      <!-- 窗口控制 -->
      <div class="wc" v-if="isElectron">
        <button class="wc-btn" @click="minimizeWindow">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>
        <button class="wc-btn wc-close" @click="closeWindow">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
      </div>
    </header>

    <!-- 主体区域 -->
    <div class="app-body">
      <!-- 左侧边栏（根据当前页面动态渲染不同内容） -->
      <aside class="sidebar">

        <!-- ========== 首页侧栏：账户 + 启动（PCL2 风格）========== -->
        <template v-if="currentRoute === '/'">
          <div class="sb-home">
            <!-- 正版/离线切换 -->
            <div class="auth-switch">
              <button
                class="auth-btn"
                :class="{ active: accountMode === 'online' }"
                @click="accountMode = 'online'"
              ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>正版</button>
              <button
                class="auth-btn"
                :class="{ active: accountMode === 'offline' }"
                @click="accountMode = 'offline'"
              ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7a5 5 0 010-10h2"/><path d="M15 7h2a5 5 0 010 10h-2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="3" y1="3" x2="21" y2="21"/></svg>离线</button>
            </div>

            <!-- ===== 正版模式 ===== -->
            <div v-if="accountMode === 'online'" class="auth-online">
              <!-- 头像：未登录时人形占位，登录后用户头像 -->
              <div class="avatar-default-icon">
                <!-- 已登录：用户头像 -->
                <img
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  class="avatar-img"
                  :alt="userName"
                />
                <!-- 未登录：人形占位图标 -->
                <svg v-else width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </div>

              <!-- 账号选择 + 登录 -->
              <div class="login-row">
                <select class="account-select" @change="showAccountManager = true">
                  <option value="">选择账号...</option>
                  <option v-if="userName" :value="userName">{{ userName }} (已登录)</option>
                  <option value="add">+ 添加新账号</option>
                </select>
                <button class="btn-login" @click="showAccountManager = true">账户管理</button>
              </div>

              <!-- 链接 -->
              <div class="auth-links">
                <a href="#" class="auth-link">» 购买正版</a>
                <a href="#" class="auth-link">» 前往官网</a>
              </div>
            </div>

            <!-- ===== 离线模式 ===== -->
            <div v-else class="auth-offline">
              <!-- 像素风 Steve 头像 -->
              <div class="avatar-steve">
                <!-- CSS 绘制的像素 Steve 脸 -->
                <svg width="48" height="48" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <!-- Steve face - pixel art style -->
                  <rect x="0" y="0" width="16" height="16" rx="2" fill="#C69C6D"/>
                  <!-- Hair (orange) -->
                  <rect x="2" y="1" width="12" height="5" fill="#E07A28"/>
                  <rect x="3" y="0" width="10" height="2" fill="#E07A28"/>
                  <!-- Skin tone -->
                  <rect x="2" y="5" width="12" height="9" fill="#D4A574"/>
                  <!-- Eyes (green) -->
                  <rect x="4" y="7" width="2" height="2" fill="#3A8B47"/>
                  <rect x="10" y="7" width="2" height="2" fill="#3A8B47"/>
                  <!-- Nose -->
                  <rect x="7" y="9" width="2" height="2" fill="#C69C6D"/>
                  <!-- Mouth -->
                  <rect x="5" y="12" width="6" height="1" fill="#8B5A3C"/>
                  <!-- Eyebrows -->
                  <rect x="3" y="6" width="4" height="1" fill="#B86B18"/>
                  <rect x="9" y="6" width="4" height="1" fill="#B86B18"/>
                </svg>
              </div>

              <!-- 游戏用户名输入框 -->
              <div class="offline-input-wrap">
                <label class="offline-label">游戏用户名</label>
                <input
                  ref="offlineNameInput"
                  v-model="offlineName"
                  class="offline-input"
                  placeholder="输入玩家名称"
                  maxlength="20"
                  @blur="saveOfflineName"
                  @keydown.enter="($event.target as HTMLElement).blur()"
                />
              </div>
            </div>

            <!-- 启动区域 -->
            <div class="sb-launch-area">
              <!-- 启动按钮（PCL2 描边风格） -->
              <button
                class="btn-launch-pcl2"
                @click="handleLaunch"
                :disabled="isLaunching"
              >
                <span class="launch-label">{{ isLaunching ? '启动中...' : '启动游戏' }}</span>
                <span class="launch-version">{{ selectedVersion }}</span>
              </button>

              <!-- 版本操作按钮 -->
              <div class="version-actions" style="margin-bottom: 8px;">
                <button class="ver-btn" @click="showVersionSelectModal = true">版本选择</button>
                <button class="ver-btn" @click="showVersionSettings = true">版本设置</button>
              </div>
            </div>

            <!-- 版本下拉列表 -->
            <div class="ver-dropdown" v-if="showVersionSelect && versions.length">
              <div
                v-for="ver in versions"
                :key="ver.id"
                class="ver-opt"
                :class="{ selected: ver.id === selectedVersionId }"
                @click="selectVersion(ver)"
              >
                {{ ver.name }} <span class="ver-loader">{{ ver.loader || '原版' }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ========== 下载页侧栏：分类导航 ========== -->
        <template v-else-if="currentRoute === '/downloads'">
          <nav class="sb-nav">
            <button
              v-for="cat in dlCategories"
              :key="cat.id"
              class="nav-item"
              :class="{ active: dlActiveCat === cat.id }"
              @click="dlActiveCat = cat.id; $emit('dl-category', cat.id)"
            >
              <span v-html="cat.icon"></span>
              {{ cat.label }}
            </button>
            <div class="nav-divider">社区资源</div>
            <button
              v-for="cat in communityCategories"
              :key="cat.id"
              class="nav-item sub"
              :class="{ active: dlActiveCat === cat.id }"
              @click="dlActiveCat = cat.id; $emit('dl-category', cat.id)"
            >
              <span v-html="cat.icon"></span>
              {{ cat.label }}
            </button>
          </nav>
        </template>

        <!-- ========== 设置页侧栏：分类导航 ========== -->
        <template v-else-if="currentRoute === '/settings'">
          <nav class="sb-nav">
            <button
              v-for="item in settingsCategories"
              :key="item.id"
              class="nav-item"
              :class="{ active: settingsActive === item.id }"
              @click="settingsActive = item.id; $emit('settings-category', item.id)"
            >
              <span v-html="item.icon"></span>
              {{ item.label }}
            </button>
          </nav>
        </template>

        <!-- ========== 更多页侧栏：分类导航 ========== -->
        <template v-else-if="currentRoute === '/more'">
          <nav class="sb-nav">
            <button
              v-for="item in moreCategories"
              :key="item.id"
              class="nav-item"
              :class="{ active: moreActive === item.id }"
              @click="moreActive = item.id"
            >
              <span v-html="item.icon"></span>
              {{ item.label }}
            </button>
          </nav>
        </template>

        <!-- ========== 实例页侧栏 ========== -->
        <template v-else-if="currentRoute === '/instances'">
          <nav class="sb-nav">
            <button class="nav-item active">
              <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></span>
              全部实例
            </button>
          </nav>
        </template>

        <!-- ========== 账户页侧栏 ========== -->
        <template v-else-if="currentRoute === '/account'">
          <nav class="sb-nav">
            <button class="nav-item" @click="$router.push('/')">
              <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></span>
              返回首页
            </button>
          </nav>
        </template>

      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 版本设置弹窗 -->
    <VersionSettings
      v-model:visible="showVersionSettings"
      :version-name="selectedVersion"
    />

    <!-- 版本选择弹窗 -->
    <VersionSelect
      v-model:visible="showVersionSelectModal"
      @select="onVersionSelect"
    />

    <!-- 账户管理抽屉 -->
    <AccountManager v-model:visible="showAccountManager" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VersionSettings from './components/VersionSettings.vue'
import VersionSelect from './components/VersionSelect.vue'
import AccountManager from './components/AccountManager.vue'

const route = useRoute()
const router = useRouter()
const currentRoute = computed(() => route.path)
const isElectron = ref(false)

// 账户状态
const accountMode = ref<'online' | 'offline'>('offline')
const avatarUrl = ref('')
const userName = ref('')

// 离线名称（localStorage 持久化）
const OFFLINE_NAME_KEY = 'mcla_offline_name'
const offlineName = ref(localStorage.getItem(OFFLINE_NAME_KEY) || 'Steve')
const offlineNameInput = ref<HTMLInputElement | null>(null)

// 版本设置弹窗
const showVersionSettings = ref(false)

// 账户管理抽屉
const showAccountManager = ref(false)

// 版本选择弹窗（PCL2 风格）
const showVersionSelectModal = ref(false)

// 启动数据
const isLaunching = ref(false)
const showVersionSelect = ref(false)
const selectedVersionId = ref('')
const selectedVersion = ref('1.20.1-Fabric 0.16.9')
interface VersionItem { id: string; name: string; loader?: string }
const versions = ref<VersionItem[]>([])

// 下载页分类
const dlActiveCat = ref('vanilla')

// 设置页分类
const settingsActive = ref('launch')

// 更多页分类
const moreActive = ref('about')

// 更多页分类列表
const moreCategories = [
  { id: 'about', label: '关于与鸣谢', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' },
  { id: 'help', label: '帮助', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>' },
  { id: 'feedback', label: '反馈', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' },
]

onMounted(() => {
  isElectron.value = !!window.electronAPI

  versions.value = [
    { id: '1', name: '1.20.1', loader: 'Fabric 0.16.9' },
    { id: '2', name: '1.20.4', loader: 'Forge 49.0' },
    { id: '3', name: '1.21', loader: '' },
    { id: '4', name: '1.20.2', loader: 'NeoForge 47.1' },
  ]
  if (versions.value.length) {
    selectedVersionId.value = versions.value[0].id
  }
})

provide('dlActiveCat', dlActiveCat)
provide('settingsActive', settingsActive)
provide('moreActive', moreActive)

const displayName = computed(() => {
  if (accountMode.value === 'online') {
    return userName.value || '未登录'
  }
  return offlineName.value || 'Steve'
})

const avatarLetter = computed(() => {
  const name = accountMode.value === 'offline' ? offlineName.value : displayName.value
  return name ? name[0].toUpperCase() : '?'
})

function selectVersion(ver: VersionItem) {
  selectedVersionId.value = ver.id
  selectedVersion.value = `${ver.name}${ver.loader ? '-' + ver.loader : ''}`
  showVersionSelect.value = false
}

function onVersionSelect(version: { id: string; name: string }) {
  selectedVersionId.value = version.id
  selectedVersion.value = version.name
}

function handleLaunch() {
  isLaunching.value = true
  setTimeout(() => { isLaunching.value = false }, 3000)
}

function saveOfflineName() {
  const name = offlineName.value.trim()
  if (name) {
    offlineName.value = name
    localStorage.setItem(OFFLINE_NAME_KEY, name)
  } else {
    // 空名称恢复默认
    offlineName.value = 'Steve'
    localStorage.setItem(OFFLINE_NAME_KEY, 'Steve')
  }
}

function handleMicrosoftLogin() {
  router.push('/account')
}

// ====== 标签定义 ======
const tabs = [
  { path: '/', label: '启动', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' },
  { path: '/instances', label: '实例', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' },
  { path: '/downloads', label: '下载', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>' },
  { path: '/settings', label: '设置', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' },
  { path: '/more', label: '更多', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>' },
]

// 下载分类
const dlCategories = [
  { id: 'vanilla', label: '原版游戏', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>' },
]
const communityCategories = [
  { id: 'mod', label: 'Mod', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>' },
  { id: 'modpack', label: '整合包', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>' },
  { id: 'datapack', label: '数据包', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
  { id: 'resourcepack', label: '资源包', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' },
  { id: 'shader', label: '光影包', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' },
]

// 设置分类
const settingsCategories = [
  { id: 'launch', label: '启动', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' },
  { id: 'personalize', label: '个性化', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.28L19.5 3a9 9 0 00-8.42 0l-.88.28a1 1 0 00-.67.93V6a9 9 0 007.49 8.87A9 9 0 0021 6V4.21a1 1 0 00-.62-.93zM12 13a3 3 0 100-6 3 3 0 000 6z"/></svg>' },
  { id: 'other', label: '其他', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
]

function minimizeWindow() { window.electronAPI?.windowMinimize?.() }
function closeWindow() { window.electronAPI?.windowClose?.() }
</script>

<style scoped lang="scss">
/* ============================================================
   MCLA App Layout — Pixel-UI 渐变色设计体系
   基于 pixel-ui.css 的 --mcla-* 变量系统
   用户可通过修改 :root 变量或设置页全局换肤
   ============================================================ */

.mcla-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: var(--mcla-font-sans);
  background: var(--mcla-bg-secondary);
  color: var(--mcla-text-primary);
}

/* ====== 渐变标题栏 + 内嵌标签页 ====== */
.titlebar {
  height: 44px;
  background: var(--mcla-gradient-primary);
  display: flex;
  align-items: center;
  padding: 0 14px;
  flex-shrink: 0;
  -webkit-user-select: none;
  user-select: none;
  position: relative;
  overflow: hidden;

  /* 标题栏微光装饰 */
  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 60%);
    pointer-events: none;
  }
}

&.electron .titlebar,
.titlebar {
  -webkit-app-region: drag;
}

.brand {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1.5px;
  -webkit-app-region: no-drag;
  pointer-events: auto;
  padding-left: 4px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.15);
  position: relative;
  z-index: 1;
}

.tab-nav {
  display: flex;
  align-items: center;
  gap: 3px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  overflow-x: auto;
  -webkit-app-region: no-drag;
  z-index: 1;

  &::-webkit-scrollbar { display: none; }
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1.5px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.88);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--mcla-transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
  backdrop-filter: blur(4px);

  &.active {
    background: #fff;
    color: var(--mcla-primary);
    border-color: #fff;
    font-weight: 650;
    box-shadow: 0 2px 10px rgba(0,0,0,0.15), 0 0 18px rgba(99,102,234,0.25);
    text-shadow: none;
  }

  &:hover:not(.active) {
    background: rgba(255,255,255,0.18);
    border-color: rgba(255,255,255,0.45);
    color: #fff;
  }
}

/* 窗口控制 */
.wc {
  display: flex;
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  -webkit-app-region: no-drag;
  z-index: 1;

  .wc-btn {
    width: 44px; height: 44px; border: none; background: transparent;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.82); transition: all 0.12s;
    &:hover { background: rgba(255,255,255,0.12); }
    &.wc-close:hover { background: var(--mcla-error); color: #fff; }
  }
}

/* ====== 主体布局 ====== */
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ====== 左侧边栏 ====== */
.sidebar {
  width: 220px;
  min-width: 200px;
  background: var(--mcla-bg-elevated);
  border-right: 1px solid var(--mcla-border-color);
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.09); border-radius: 2px; }
}

/* ---------- 首页侧栏（渐变风格）---------- */
.sb-home {
  padding: 16px 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

/* 启动区域：始终贴底 */
.sb-launch-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 12px 0 16px;
}

.auth-switch {
  display: flex;
  gap: 6px;
  width: 100%;
  flex-shrink: 0;

    .auth-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
    padding: 7px 0; border: 1.5px solid var(--mcla-border-color); background: var(--mcla-bg-elevated);
    border-radius: var(--mcla-radius-md); font-size: 12.5px; font-weight: 600;
    color: var(--mcla-text-secondary); cursor: pointer; transition: all var(--mcla-transition-fast);
    white-space: nowrap;
    svg { flex-shrink: 0; }

    &:hover { border-color: var(--mcla-primary); color: var(--mcla-primary); }
    &.active {
      background: var(--mcla-primary-light);
      border-color: var(--mcla-primary-300);
      color: var(--mcla-primary-700);
      svg { color: var(--mcla-primary-600); }
    }
  }
}

/* ---- 正版模式 ---- */
.auth-online {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
  flex: 1;
  text-align: center;
}

.avatar-default-icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: transparent;
  border: none;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
  overflow: hidden;

  svg { color: var(--mcla-primary); opacity: 0.85; }

  .avatar-img {
    width: 100%; height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
}

.login-row {
  display: flex;
  gap: 8px;
  width: 100%;

  .account-select {
    flex: 1;
    padding: 8px 10px;
    border: 1.5px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-md);
    font-size: 12.5px;
    color: var(--mcla-text-secondary);
    background: var(--mcla-bg-elevated) url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23555880' stroke-width='1.5' fill='none'/%3E%3C/svg%3E") no-repeat right 8px center;
    outline: none;
    cursor: pointer;
    appearance: none;
    transition: all var(--mcla-transition-fast);

    &:focus { border-color: var(--mcla-primary-400); box-shadow: var(--mcla-input-focus-shadow); }
  }

  .btn-login {
    padding: 8px 18px;
    border: 1.5px solid var(--mcla-primary);
    border-radius: var(--mcla-radius-md);
    background: var(--mcla-gradient-primary);
    color: #fff;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--mcla-transition-fast);
    box-shadow: 0 2px 8px rgba(99,102,234,0.25);

    &:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(99,102,234,0.35); transform: translateY(-1px); }
    &:active { transform: translateY(0); }
  }
}

.auth-links {
  display: flex;
  gap: 14px;

  .auth-link {
    font-size: 11.5px;
    color: var(--mcla-text-muted);
    text-decoration: none;
    transition: color 0.12s;

    &:hover { color: var(--mcla-primary-500); }
  }
}

/* ---- 离线模式 ---- */
.auth-offline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
  flex: 1;
  text-align: center;
}

.avatar-steve {
  width: 64px; height: 64px;
  border-radius: var(--mcla-radius-lg);
  overflow: hidden;
  box-shadow: var(--mcla-shadow-md);
  margin: 0 auto;
  svg { width: 100%; height: 100%; image-rendering: pixelated; }
}

.offline-input-wrap {
  width: 100%;

  .offline-label {
    display: block;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--mcla-text-muted);
    margin-bottom: 4px;
  }

  .offline-input {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-md);
    font-size: 14px;
    font-weight: 600;
    text-align: left;
    color: var(--mcla-text-primary);
    background: var(--mcla-bg-elevated);
    outline: none;
    transition: all var(--mcla-transition-fast);

    &::placeholder { color: var(--mcla-text-muted); font-weight: 400; }
    &:focus {
      border-color: var(--mcla-primary-400);
      box-shadow: var(--mcla-input-focus-shadow);
    }
  }
}

/* ---- 渐变风格启动按钮 ---- */
.btn-launch-pcl2 {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 0;
  background: var(--mcla-gradient-primary);
  border: none;
  border-radius: var(--mcla-radius-lg);
  cursor: pointer;
  transition: all var(--mcla-transition-normal);
  box-shadow: var(--mcla-shadow-glow-primary);
  position: relative;
  overflow: hidden;

  /* 按钮光泽效果 */
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%);
    pointer-events: none;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    box-shadow: 0 6px 26px rgba(99,102,234,0.45);
    transform: translateY(-1px);

    .launch-label { filter: brightness(1.1); }
  }

  &:active:not(:disabled) { transform: scale(0.98); box-shadow: 0 2px 10px rgba(99,102,234,0.3); }
  &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

  .launch-label {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }

  .launch-version {
    font-size: 11.5px;
    color: rgba(255,255,255,0.78);
  }
}

.version-actions {
  display: flex;
  gap: 8px;
  width: 100%;

  .ver-btn {
    flex: 1;
    padding: 7px 0;
    background: var(--mcla-bg-elevated);
    border: 1.5px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-md);
    font-size: 12px;
    color: var(--mcla-text-secondary);
    cursor: pointer;
    transition: all var(--mcla-transition-fast);

    &:hover { border-color: var(--mcla-primary-400); color: var(--mcla-primary-600); background: var(--mcla-primary-light); }
  }
}

.ver-dropdown {
  width: 100%;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  box-shadow: var(--mcla-shadow-lg);
  overflow: hidden;
  animation: dropIn 0.14s ease-out;
}

@keyframes dropIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.ver-opt {
  padding: 9px 14px;
  font-size: 13px;
  color: var(--mcla-text-primary);
  cursor: pointer;
  transition: all 0.1s;

  &:hover { background: var(--mcla-primary-light); }
  &.selected {
    background: var(--mcla-primary-light);
    color: var(--mcla-primary-700);
    font-weight: 600;
  }
  .ver-loader { float: right; font-size: 11px; color: var(--mcla-text-muted); }
}

/* ---------- 通用侧栏导航（下载/设置用）---------- */
.sb-nav {
  padding: 12px 0;
  display: flex;
  flex-direction: column;

  .nav-divider {
    padding: 8px 16px 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--mcla-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 18px;
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 500;
    color: var(--mcla-text-secondary);
    cursor: pointer;
    position: relative;
    transition: all var(--mcla-transition-fast);
    text-align: left;

    &.sub {
      padding-left: 22px;
      font-size: 13px;
    }

    > span { flex-shrink: 0; display: flex; align-items: center; color: var(--mcla-text-muted); }

    &:hover {
      color: var(--mcla-primary-600);
      background: var(--mcla-primary-light);
      > span { color: var(--mcla-primary-500); }
    }

    &.active {
      color: var(--mcla-primary-700);
      font-weight: 650;
      background: linear-gradient(to right, var(--mcla-primary-50), transparent);

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 4px;
        bottom: 4px;
        width: 3px;
        background: var(--mcla-gradient-primary);
        border-radius: 0 2px 2px 0;
        box-shadow: 0 0 6px rgba(99,102,234,0.35);
      }

      > span { color: var(--mcla-primary-600); }
    }
  }
}

/* ====== 主内容区 ====== */
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--mcla-bg-secondary);

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }
}

.fade-enter-active, .fade-leave-active { transition: opacity var(--mcla-transition-fast); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
