<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="vs-overlay" @click.self="close">
        <div class="vs-window">
          <!-- 标题栏 -->
          <header class="vs-header">
            <button class="vs-back" @click="close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="vs-title">版本选择</span>
            <div class="vs-wc">
              <button class="vs-wc-btn" @click="minimize"><svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg></button>
              <button class="vs-wc-btn vs-close" @click="close"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg></button>
            </div>
          </header>

          <!-- 主体：左右分栏 -->
          <div class="vs-body">
            <!-- ===== 左侧：文件夹列表 ===== -->
            <aside class="vs-sidebar">
              <h3 class="sidebar-title">文件夹列表</h3>

              <!-- 当前选中文件夹 -->
              <div class="current-folder">
                <div class="cf-label">当前文件夹</div>
                <div class="cf-path">{{ currentFolderPath }}</div>
              </div>

              <!-- 已添加的文件夹列表 -->
              <div v-if="folders.length > 1" class="folder-list">
                <div
                  v-for="folder in folders.filter(f => !f.isActive)"
                  :key="folder.path"
                  class="folder-item"
                  @click="switchFolder(folder.path)"
                >
                  <span class="folder-name">{{ folder.name }}</span>
                  <span class="folder-remove" @click.stop="removeFolder(folder.path)" title="移除">✕</span>
                </div>
              </div>

              <!-- 分隔线 -->
              <div class="sidebar-divider"></div>

              <!-- 添加或导入 -->
              <h4 class="sidebar-subtitle">添加或导入</h4>
              <div class="action-list">
                <button class="action-item" @click="addFolder">
                  <span class="action-icon add">⊕</span>
                  <span>添加已有文件夹</span>
                </button>
                <button class="action-item" @click="importModpack">
                  <span class="action-icon import">⟳</span>
                  <span>导入整合包</span>
                </button>
              </div>
            </aside>

            <!-- ===== 右侧：内容区 ===== -->
            <main class="vs-main">
              <!-- 可安装 Mod 折叠区 -->
              <section class="content-section collapsible" :class="{ collapsed: !showInstallable }">
                <header class="sec-header clickable" @click="showInstallable = !showInstallable">
                  <span class="sec-header-title">可安装 Mod ({{ installableMods.length }})</span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    :style="{ transform: showInstallable ? 'rotate(180deg)' : '' }"
                    style="transition: transform 0.2s;"
                  ><path d="M6 9l6 6 6-6"/></svg>
                </header>
                <div v-show="showInstallable" class="sec-body">
                  <div v-for="mod in installableMods" :key="mod.id" class="install-mod-item" @mouseenter="mod.hovered = true" @mouseleave="mod.hovered = false">
                    <!-- 图标 -->
                    <div class="im-icon" :class="mod.loaderType === 'Forge' ? 'forge' : 'fabric'">
                      <!-- Forge 方块图标 -->
                      <svg v-if="mod.loaderType === 'Forge'" width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="10" height="10" rx="1" fill="#6B5B3E"/>
                        <rect x="14" y="4" width="10" height="10" rx="1" fill="#7A6848"/>
                        <rect x="4" y="14" width="10" height="10" rx="1" fill="#8B774F"/>
                        <rect x="14" y="14" width="10" height="10" rx="1" fill="#5A4D35"/>
                        <rect x="9" y="9" width="14" height="14" rx="1" fill="#C69C6D"/>
                      </svg>
                      <!-- Fabric 布料图标 -->
                      <svg v-else width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="4" width="20" height="24" rx="3" fill="#E8DCC8"/>
                        <rect x="8" y="6" width="16" height="4" rx="1" fill="#D4B896"/>
                        <rect x="8" y="12" width="16" height="4" rx="1" fill="#C4A882"/>
                        <rect x="8" y="18" width="16" height="4" rx="1" fill="#B49870"/>
                        <line x1="10" y1="25" x2="22" y2="25" stroke="#A08860" stroke-width="1.5"/>
                        <line x1="10" y1="28" x2="22" y2="28" stroke="#A08860" stroke-width="1.5"/>
                      </svg>
                    </div>
                    <!-- 信息 -->
                    <div class="im-info">
                      <p class="im-name">{{ mod.name }}</p>
                      <p class="im-detail">正式版 {{ mod.baseVersion }} {{ mod.loaderInfo }}</p>
                    </div>
                    <!-- hover 操作 -->
                    <div class="im-actions" :class="{ visible: mod.hovered }">
                      <button class="im-btn primary" @click="installMod(mod)">安装</button>
                    </div>
                  </div>
                </div>
              </section>

              <!-- 已安装版本区 -->
              <section class="content-section collapsible" :class="{ collapsed: !showInstalled }">
                <header class="sec-header clickable" @click="showInstalled = !showInstalled">
                  <span class="sec-header-title">已安装版本 ({{ installedVersions.length }})</span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    :style="{ transform: showInstalled ? 'rotate(180deg)' : '' }"
                    style="transition: transform 0.2s;"
                  ><path d="M6 9l6 6 6-6"/></svg>
                </header>
                <div v-show="showInstalled" class="sec-body">
                  <div v-if="!installedVersions.length" class="empty-hint">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--pcl-text-muted)" stroke-width="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <p>当前文件夹下暂无已安装的版本</p>
                  </div>
                  <div v-for="ver in installedVersions" :key="ver.id" class="installed-ver-item">
                    <div class="iv-check">
                      <input type="radio" name="activeVersion" :checked="ver.isActive" @change="selectActive(ver)" />
                    </div>
                    <div class="iv-info">
                      <p class="iv-name">{{ ver.name }}</p>
                      <p class="iv-detail">正式版 {{ ver.baseVersion }} {{ ver.loaderInfo || '' }}</p>
                    </div>
                    <button class="iv-remove" title="删除版本" @click="removeVersion(ver.id)">🗑</button>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

// @ts-ignore — electronAPI 通过 preload 注入
const api = (window as any).electronAPI

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'select', version: { id: string; name: string }): void
}>()

// 界面状态
const showInstallable = ref(true)
const showInstalled = ref(true)
const currentFolderPath = ref('检测中...')

// 文件夹列表
interface FolderItem {
  path: string
  name: string
  isActive: boolean
}
const folders = ref<FolderItem[]>([])

// 弹窗打开时加载 .minecraft 路径
watch(() => props.visible, async (val) => {
  if (val) {
    await loadMinecraftPath()
  }
})

async function loadMinecraftPath() {
  if (api?.path) {
    const mcPath = await api.path.getMinecraft()
    const exists = await api.path.exists(mcPath)
    if (exists) {
      currentFolderPath.value = mcPath
      // 自动加入文件夹列表（如果没有的话）
      if (!folders.value.find(f => f.path === mcPath)) {
        folders.value.push({
          path: mcPath,
          name: '.minecraft',
          isActive: true
        })
      }
      // 标记为活跃
      folders.value.forEach(f => f.isActive = f.path === mcPath)
    } else {
      currentFolderPath.value = mcPath + '（未找到）'
      folders.value = []
    }
  } else {
    // 非 Electron 环境的 fallback
    currentFolderPath.value = 'C:\\Users\\用户\\AppData\\Roaming\\.minecraft'
  }
}

function close() {
  emit('update:visible', false)
}

function minimize() {
  api?.window?.minimize?.()
}

async function addFolder() {
  if (!api?.dialog) return
  const selectedPath = await api.dialog.selectFolder()
  if (!selectedPath) return

  // 避免重复添加
  if (folders.value.find(f => f.path === selectedPath)) {
    // 切换到已存在的文件夹
    switchFolder(selectedPath)
    return
  }

  const folderName = selectedPath.split(/[\\/]/).pop() || selectedPath
  folders.value.push({
    path: selectedPath,
    name: folderName,
    isActive: false
  })

  // 自动切换到新添加的文件夹
  switchFolder(selectedPath)
}

function switchFolder(path: string) {
  currentFolderPath.value = path
  folders.value.forEach(f => f.isActive = f.path === path)
  // TODO: 读取该文件夹下的 versions 列表
}

function removeFolder(path: string) {
  folders.value = folders.value.filter(f => f.path !== path)
}

function importModpack() {
  // TODO: 导入整合包逻辑
  console.log('导入整合包')
}

// 可安装 Mod 列表（示例数据）
interface InstallableMod {
  id: string
  name: string
  baseVersion: string
  loaderType: 'Forge' | 'Fabric'
  loaderInfo: string
  hovered: boolean
}

const installableMods = ref<InstallableMod[]>([
  {
    id: 'f1',
    name: '1.21.3-Forge_53.0.25',
    baseVersion: '1.21.3',
    loaderType: 'Forge',
    loaderInfo: 'Forge 53.0.25',
    hovered: false,
  },
  {
    id: 'fb1',
    name: '1.20.1-Fabric_0.16.9-OptiFine_J6',
    baseVersion: '1.20.1',
    loaderType: 'Fabric',
    loaderInfo: 'Fabric 0.16.9',
    hovered: false,
  },
])

// 已安装版本列表
interface InstalledVer {
  id: string
  name: string
  baseVersion: string
  loaderInfo: string
  isActive: boolean
}

const installedVersions = ref<InstalledVer[]>([
  { id: 'v1', name: '1.20.1-Fabric 0.16.9', baseVersion: '1.20.1', loaderInfo: 'Fabric 0.16.9', isActive: true },
])

function installMod(mod: InstallableMod) {
  installedVersions.value.push({
    id: 'new_' + mod.id,
    name: mod.name,
    baseVersion: mod.baseVersion,
    loaderInfo: mod.loaderInfo,
    isActive: false,
  })
  installableMods.value = installableMods.value.filter(m => m.id !== mod.id)
}

function selectActive(ver: InstalledVer) {
  installedVersions.value.forEach(v => v.isActive = (v.id === ver.id))
  emit('select', { id: ver.id, name: ver.name })
}

function removeVersion(id: string) {
  installedVersions.value = installedVersions.value.filter(v => v.id !== id)
}
</script>

<style scoped lang="scss">
/* ====== PCL2 变量 ====== */
.vs-overlay {
  --pcl-blue: #1565C0;
  --pcl-blue-dark: #0D47A1;
  --pcl-blue-light: #E3F2FD;
  --pcl-blue-hover: #1976D2;
  --pcl-text: #212121;
  --pcl-text-secondary: #616161;
  --pcl-text-muted: #9E9E9E;
  --pcl-bg: #E8F4FD;
  --pcl-surface: #FFFFFF;
  --pcl-border: #E0E0E0;
  --pcl-border-light: #EEEEEE;
  --pcl-green: #43A047;
  --pcl-red: #E53935;

  /* 遮罩层 */
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* ---- 弹窗容器 ---- */
.vs-window {
  width: 800px;
  max-width: 92vw;
  height: 520px;
  max-height: 85vh;
  background: var(--pcl-surface);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1);
}

/* ---- 标题栏 ---- */
.vs-header {
  height: 42px;
  background: var(--pcl-blue);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.vs-back {
  width: 30px; height: 30px; border: none; background: transparent;
  color: rgba(255,255,255,0.85); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px; transition: all 0.12s;
  -webkit-app-region: no-drag;
  &:hover { background: rgba(255,255,255,0.15); color: #fff; }
}

.vs-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.vs-wc {
  margin-left: auto;
  display: flex;
  -webkit-app-region: no-drag;

  .vs-wc-btn {
    width: 42px; height: 42px; border: none; background: transparent;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.8); transition: background 0.12s;
    &:hover { background: rgba(255,255,255,0.1); }
    &.vs-close:hover { background: var(--pcl-red); color: #fff; }
  }
}

/* ---- 主体左右分栏 ---- */
.vs-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ====== 左侧边栏 ====== */
.vs-sidebar {
  width: 220px;
  min-width: 180px;
  background: var(--pcl-surface);
  border-right: 1px solid var(--pcl-border);
  padding: 16px 14px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
}

.sidebar-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--pcl-text-muted);
  letter-spacing: 0.3px;
}

/* 当前文件夹 */
.current-folder {
  padding: 10px 12px;
  background: var(--pcl-bg);
  border-radius: 6px;
  border-left: 3px solid var(--pcl-blue);

  .cf-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--pcl-blue);
    margin-bottom: 4px;
  }

  .cf-path {
    font-size: 11.5px;
    color: var(--pcl-text-secondary);
    word-break: break-all;
    line-height: 1.4;
    font-family: 'Consolas', 'Courier New', monospace;
  }
}

/* 分隔线 */
.sidebar-divider {
  height: 1px;
  background: var(--pcl-border-light);
  margin: 14px 0 10px;
}

/* 文件夹列表 */
.folder-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.folder-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: var(--pcl-blue-light);
  }

  .folder-name {
    font-size: 12.5px;
    color: var(--pcl-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .folder-remove {
    font-size: 10px;
    color: var(--pcl-text-muted);
    opacity: 0;
    transition: opacity 0.12s;
    flex-shrink: 0;
    padding: 2px 4px;
    border-radius: 3px;

    &:hover {
      color: var(--pcl-red);
      background: rgba(229, 57, 53, 0.08);
    }
  }

  &:hover .folder-remove { opacity: 1; }
}

/* 子标题 */
.sidebar-subtitle {
  margin: 0 0 8px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--pcl-text-muted);
}

/* 操作按钮列表 */
.action-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--pcl-text-secondary);
  cursor: pointer;
  transition: all 0.13s;
  text-align: left;

  &:hover {
    background: var(--pcl-blue-light);
    color: var(--pcl-blue);
    .action-icon.add { color: var(--pcl-green); }
    .action-icon.import { color: var(--pcl-orange); }
  }

  .action-icon {
    font-size: 15px;
    flex-shrink: 0;
    &.add { color: var(--pcl-green); }
    &.import { color: var(--pcl-text-muted); }
  }
}

/* ====== 右侧内容区 ====== */
.vs-main {
  flex: 1;
  overflow-y: auto;
  background: #EEF4F9; /* PCL2 右侧浅蓝灰背景 */
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
}

/* 内容区块 */
.content-section {
  background: var(--pcl-surface);
  border-radius: 8px;
  border: 1px solid var(--pcl-border-light);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);

  .sec-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 14px;
    cursor: default;
    user-select: none;

    &.clickable {
      cursor: pointer;
      &:hover { background: rgba(0,0,0,0.02); }
    }

    .sec-header-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--pcl-text);
    }

    svg {
      flex-shrink: 0;
      color: var(--pcl-text-muted);
    }
  }

  .sec-body {
    padding: 0 14px 12px;
    animation: slideDown 0.2s ease;
  }

  &.collapsed .sec-body { display: none; }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ----- 可安装 Mod 列表项 ----- */
.install-mod-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 6px;
  position: relative;
  transition: background 0.12s;

  &:hover { background: var(--pcl-blue-light); }
}

.im-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f0eb, #e8dcc8);
  
  &.fabric {
    background: linear-gradient(135deg, #f0ebe0, #dcd0b8);
  }
  
  svg { width: 100%; height: 100%; }
}

.im-info {
  flex: 1;
  min-width: 0;

  .im-name {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--pcl-text);
  }

  .im-detail {
    margin: 2px 0 0;
    font-size: 11.5px;
    color: var(--pcl-text-muted);
  }
}

.im-actions {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;

  &.visible { opacity: 1; }
}

.im-btn {
  padding: 5px 16px;
  border: 1.5px solid var(--pcl-border);
  border-radius: 5px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.13s;

  &:hover { border-color: var(--pcl-blue); color: var(--pcl-blue); }

  &.primary {
    background: var(--pcl-blue);
    border-color: var(--pcl-blue);
    color: #fff;
    &:hover { background: var(--pcl-blue-hover); }
  }
}

/* ----- 已安装版本项 ----- */
.installed-ver-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border-radius: 6px;
  transition: background 0.12s;

  &:hover { background: var(--pcl-blue-light); }

  .iv-check {
    flex-shrink: 0;

    input[type="radio"] {
      width: 15px;
      height: 15px;
      accent-color: var(--pcl-blue);
      cursor: pointer;
    }
  }

  .iv-info {
    flex: 1;
    min-width: 0;

    .iv-name {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--pcl-text);
    }

    .iv-detail {
      margin: 2px 0 0;
      font-size: 11px;
      color: var(--pcl-text-muted);
    }
  }

  .iv-remove {
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    border-radius: 5px;
    font-size: 13px;
    cursor: pointer;
    opacity: 0;
    transition: all 0.12s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &:hover { background: rgba(229,57,53,0.1); }
  }

  &:hover .iv-remove { opacity: 1; }
}

/* 空状态提示 */
.empty-hint {
  text-align: center;
  padding: 30px 0 16px;
  color: var(--pcl-text-muted);

  p {
    margin: 8px 0 0;
    font-size: 12.5px;
  }

  svg { opacity: 0.35; }
}

/* 动画 */
.modal-fade-enter-active { transition: opacity 0.18s ease; }
.modal-fade-leave-active { transition: opacity 0.12s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.modal-fade-enter-active .vs-window {
  transition: transform 0.2s ease, opacity 0.18s ease;
}
.modal-fade-enter-from .vs-window {
  transform: scale(0.96) translateY(10px);
  opacity: 0;
}
</style>
