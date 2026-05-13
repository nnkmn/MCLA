<template>
  <div class="version-detail-page">
    <!-- 顶部导航栏 -->
    <div class="vd-header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1 class="vd-title">版本详情</h1>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="vd-loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 版本信息 -->
    <template v-else-if="versionInfo">
      <div class="vd-hero">
        <div class="vd-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <div class="vd-info">
          <h2 class="vd-name">{{ versionId }}</h2>
          <div class="vd-meta">
            <span class="vd-type-badge" :class="versionInfo.type">
              {{ typeLabel }}
            </span>
            <span class="vd-date">{{ versionInfo.releaseTime ? formatDate(versionInfo.releaseTime) : '' }}</span>
          </div>
          <p class="vd-desc">{{ versionInfo.id }}</p>
        </div>
      </div>

      <!-- ModLoader 选择 -->
      <div class="vd-section">
        <h3 class="section-title">附加内容</h3>
        <p class="section-hint">选择一个 ModLoader 类型，为版本添加对应的加载器支持</p>

        <div class="loader-grid">
          <button
            v-for="loader in modLoaders"
            :key="loader.type"
            class="loader-card"
            :class="{ selected: selectedLoader === loader.type }"
            @click="selectedLoader = selectedLoader === loader.type ? '' : loader.type"
          >
            <span class="loader-icon">{{ loader.icon }}</span>
            <span class="loader-name">{{ loader.name }}</span>
            <span class="loader-desc">{{ loader.desc }}</span>
            <div v-if="selectedLoader === loader.type" class="loader-check">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </button>

          <!-- Vanilla（无 ModLoader） -->
          <button
            class="loader-card"
            :class="{ selected: selectedLoader === '' }"
            @click="selectedLoader = ''"
          >
            <span class="loader-icon">V</span>
            <span class="loader-name">原版</span>
            <span class="loader-desc">不含任何 ModLoader</span>
            <div v-if="selectedLoader === ''" class="loader-check">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!-- 下载按钮 -->
      <div class="vd-footer">
        <div class="target-folder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <span>{{ targetFolder || '使用默认 .minecraft' }}</span>
        </div>
        <button class="btn-download" @click="handleDownload" :disabled="downloading">
          <svg v-if="downloading" class="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>{{ downloading ? '准备下载...' : '开始下载' }}</span>
        </button>
      </div>
    </template>

    <!-- 加载失败 -->
    <div v-else class="vd-error">
      <p>无法加载版本信息</p>
      <button @click="loadVersionInfo">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDownloadStore } from '../stores/download.store'

const router = useRouter()
const route = useRoute()
const downloadStore = useDownloadStore()

const versionId = computed(() => route.params.versionId as string)
const versionInfo = ref<any>(null)
const loading = ref(true)
const downloading = ref(false)
const selectedLoader = ref('')
const targetFolder = ref('')

const modLoaders = [
  { type: 'fabric', icon: 'F', name: 'Fabric', desc: '轻量级 ModLoader' },
  { type: 'forge', icon: 'FG', name: 'Forge', desc: '最流行的 ModLoader' },
  { type: 'neoforge', icon: 'NF', name: 'NeoForge', desc: 'Forge 的现代分支' },
  { type: 'quilt', icon: 'Q', name: 'Quilt', desc: 'Fabric 的继任者' },
]

const typeLabel = computed(() => {
  const t = versionInfo.value?.type
  if (t === 'release') return '正式版'
  if (t === 'snapshot') return '快照版'
  if (t === 'old_alpha') return '远古版'
  if (t === 'old_beta') return '测试版'
  return t ?? ''
})

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function goBack() {
  router.back()
}

async function loadVersionInfo() {
  loading.value = true
  const api = window.electronAPI
  if (api?.versions) {
    versionInfo.value = await api.versions.getInfo(versionId.value)
  }
  // 获取当前选中的文件夹
  if (api?.folders) {
    const last = await api.folders.getLast()
    targetFolder.value = last ?? ''
  }
  loading.value = false
}

async function handleDownload() {
  if (downloading.value) return
  downloading.value = true

  // 启动后台下载
  await downloadStore.startVersionDownload(versionId.value, targetFolder.value)

  // 跳转到下载管理页
  router.push('/download/manage')
}

onMounted(() => {
  loadVersionInfo()
})
</script>

<style scoped>
.version-detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.vd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.back-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #c4c4c4;
  transition: all 0.2s;
}
.back-btn:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

.vd-title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.vd-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #888;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(99,102,241,0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.vd-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  background: rgba(99,102,241,0.08);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.vd-icon {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vd-name {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.vd-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.vd-type-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.vd-type-badge.release { background: rgba(34,197,94,0.2); color: #22c55e; }
.vd-type-badge.snapshot { background: rgba(234,179,8,0.2); color: #eab308; }
.vd-type-badge.old_alpha, .vd-type-badge.old_beta { background: rgba(239,68,68,0.2); color: #ef4444; }

.vd-date {
  font-size: 12px;
  color: #888;
}

.vd-desc {
  font-size: 13px;
  color: #666;
}

.vd-section {
  padding: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 6px;
}

.section-hint {
  font-size: 12px;
  color: #666;
  margin-bottom: 16px;
}

.loader-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.loader-card {
  position: relative;
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.loader-card:hover {
  border-color: rgba(99,102,241,0.4);
  background: rgba(99,102,241,0.06);
}
.loader-card.selected {
  border-color: #6366f1;
  background: rgba(99,102,241,0.12);
}

.loader-icon {
  font-size: 18px;
  font-weight: 800;
  color: #6366f1;
  margin-bottom: 2px;
}
.loader-name {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}
.loader-desc {
  font-size: 11px;
  color: #777;
}

.loader-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.vd-footer {
  margin-top: auto;
  padding: 16px 20px 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.target-folder {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #777;
}

.btn-download {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  box-shadow: 0 4px 16px rgba(99,102,241,0.35);
}
.btn-download:hover:not(:disabled) { opacity: 0.9; }
.btn-download:disabled { opacity: 0.5; cursor: not-allowed; }

.spin-icon {
  animation: spin 0.8s linear infinite;
}

.vd-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #888;
}
.vd-error button {
  background: rgba(99,102,241,0.2);
  border: 1px solid rgba(99,102,241,0.4);
  color: #6366f1;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}
</style>
