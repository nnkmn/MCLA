<template>
  <div class="instance-detail">
    <!-- 顶部导航栏 -->
    <div class="detail-header">
      <button class="back-btn" @click="$router.push('/instances')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        返回实例列表
      </button>

      <h2 v-if="instance" class="instance-name">{{ instance.name }}</h2>
      <span v-else class="loading-placeholder">加载中...</span>

      <div v-if="instance" class="header-actions">
        <button
          class="action-btn"
          :class="{ active: instance.isFavorited === 1 }"
          @click="toggleFavorite"
          title="收藏"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" :fill="instance.isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </button>
        <button class="action-btn" @click="openFolder" title="打开文件夹">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="!instance && !error" class="detail-loading">
      <div class="spinner"></div>
      <p>正在加载实例信息...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="detail-error">
      <p>{{ error }}</p>
      <button @click="fetchDetail">重试</button>
    </div>

    <!-- 实例详情内容 -->
    <div v-if="instance" class="detail-content">
      <!-- 基本信息卡片 -->
      <section class="info-section">
        <h3 class="section-title">基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>MC 版本</label>
            <span class="value version-badge">{{ instance.mcVersion }}</span>
          </div>
          <div class="info-item">
            <label>加载器</label>
            <span class="value loader-badge">{{ loaderLabel }}</span>
          </div>
          <div class="info-item">
            <label>游戏目录</label>
            <span class="value path-value" :title="instance.path">{{ instance.path || '未设置' }}</span>
          </div>
          <div class="info-item">
            <label>最后游玩</label>
            <span class="value">{{ formatLastPlayed }}</span>
          </div>
          <div class="info-item">
            <label>总游玩时长</label>
            <span class="value">{{ playTimeStr }}</span>
          </div>
          <div class="info-item">
            <label>窗口尺寸</label>
            <span class="value">{{ instance.width }} x {{ instance.height }}</span>
          </div>
        </div>
      </section>

      <!-- Java / 内存设置 -->
      <section class="info-section">
        <h3 class="section-title">Java & 内存</h3>
        <div class="info-grid">
          <div class="info-item full-width">
            <label>Java 路径</label>
            <input
              type="text"
              v-model="editForm.javaPath"
              placeholder="留空使用默认 Java"
              class="edit-input"
            />
          </div>
          <div class="info-item">
            <label>最小内存 (MB)</label>
            <input
              type="number"
              v-model.number="editForm.minMemory"
              min="256"
              step="256"
              class="edit-input number-input"
            />
          </div>
          <div class="info-item">
            <label>最大内存 (MB)</label>
            <input
              type="number"
              v-model.number="editForm.maxMemory"
              min="512"
              step="512"
              class="edit-input number-input"
            />
          </div>
          <div class="info-item full-width">
            <label>JVM 参数</label>
            <input
              type="text"
              v-model="editForm.jvmArgs"
              placeholder="-Xmn128m ..."
              class="edit-input"
            />
          </div>
        </div>
        <button class="save-btn" @click="saveSettings" :disabled="saving">
          {{ saving ? '保存中...' : '保存设置' }}
        </button>
      </section>

      <!-- Mod 列表（占位） -->
      <section class="info-section">
        <h3 class="section-title">
          已安装 Mod
          <span class="mod-count" v-if="modsStats.total > 0">({{ modsStats.active }}/{{ modsStats.total }})</span>
        </h3>
        <div v-if="modsStats.total === 0" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mcla-text-muted)" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
          <p>暂无已安装的 Mod</p>
          <router-link to="/downloads" class="link-btn">去下载 Mod →</router-link>
        </div>
        <div v-else class="mod-list-preview">
          <!-- TODO: 对接 mods.store 后渲染实际列表 -->
          <p class="hint-text">Mod 列表将在对接完成后显示</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInstancesStore } from '../stores/instances.store'
import { useModsStore } from '../stores/mods.store'
import { formatRelativeTime, formatDuration } from '../utils/format'
import type { GameInstance } from '../types/instance'

const route = useRoute()
const router = useRouter()
const instancesStore = useInstancesStore()
const modsStore = useModsStore()

// ====== 状态 ======
const instance = ref<GameInstance | null>(null)
const error = ref<string | null>(null)
const saving = ref(false)

// 编辑表单
const editForm = ref({
  javaPath: '',
  minMemory: 1024,
  maxMemory: 4096,
  jvmArgs: '',
})

// ====== 计算属性 ======
const instanceId = computed(() => route.params.id as string)

const loaderLabel = computed(() => {
  if (!instance.value) return '-'
  const { getLoaderName } = require('../utils/format')
  if (instance.value.loaderType === 'vanilla') return '原版'
  return `${getLoaderName(instance.value.loaderType)} ${instance.value.loaderVersion}`.trim()
})

const formatLastPlayed = computed(() => {
  if (!instance.value?.lastPlayed) return '从未游玩'
  return formatRelativeTime(instance.value.lastPlayed)
})

const playTimeStr = computed(() => {
  if (!instance.value) return '0分钟'
  return formatDuration(instance.value.playTime)
})

const modsStats = computed(() => modsStore.stats)

// ====== 方法 ======
async function fetchDetail() {
  error.value = null
  try {
    // 从 store 获取或通过 IPC 加载
    const inst = instancesStore.instances.find(i => i.id === instanceId.value)
    if (inst) {
      instance.value = inst
      editForm.value.javaPath = inst.javaPath
      editForm.value.minMemory = inst.minMemory
      editForm.value.maxMemory = inst.maxMemory
      editForm.value.jvmArgs = inst.jvmArgs
    } else {
      // store 没有的话尝试单独获取
      const raw = await window.electronAPI?.instance.getById(instanceId.value)
      if (raw) {
        instance.value = raw as any
      }
    }

    // 加载该实例的 Mod 列表
    await modsStore.fetchMods(instanceId.value)
  } catch (e: any) {
    error.value = e.message || '加载实例详情失败'
  }
}

async function toggleFavorite() {
  if (instance.value) {
    await instancesStore.toggleFavorite(instance.value.id)
    fetchDetail() // 刷新
  }
}

function openFolder() {
  if (instance.value?.path) {
    window.electronAPI?.path.exists(instance.value.path).then((exists: boolean) => {
      if (exists) {
        // TODO: 用 shell.openPath 打开文件夹
        console.log('Open folder:', instance.value!.path)
      }
    })
  }
}

async function saveSettings() {
  if (!instance.value) return
  saving.value = true
  try {
    await instancesStore.updateInstance(instance.value.id, {
      javaPath: editForm.value.javaPath,
      minMemory: editForm.value.minMemory,
      maxMemory: editForm.value.maxMemory,
      jvmArgs: editForm.value.jvmArgs,
    })
  } finally {
    saving.value = false
  }
}

// ====== 生命周期 ======
onMounted(fetchDetail)
watch(instanceId, () => {
  fetchDetail()
})
</script>

<style scoped lang="scss">
.instance-detail {
  padding: 20px 28px;
  max-width: 860px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  .back-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-md);
    color: var(--mcla-text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all var(--mcla-transition-fast);

    &:hover {
      color: var(--mcla-primary);
      border-color: var(--mcla-primary-400);
      background: var(--mcla-primary-light);
    }
  }

  .instance-name {
    font-size: 22px;
    font-weight: 700;
    color: var(--mcla-text-primary);
    flex: 1;
  }

  .header-actions {
    display: flex;
    gap: 6px;

    .action-btn {
      padding: 7px 10px;
      border: 1px solid var(--mcla-border-color);
      border-radius: var(--mcla-radius-md);
      background: transparent;
      color: var(--mcla-text-muted);
      cursor: pointer;
      transition: all var(--mcla-transition-fast);

      &:hover { color: var(--mcla-primary); border-color: var(--mcla-primary-300); }
      &.active { color: #f59e0b; border-color: #f59e0b; background: rgba(245,158,11,0.08); }
    }
  }
}

.detail-loading,
.detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: var(--mcla-text-muted);

  button {
    padding: 8px 20px;
    background: var(--mcla-gradient-primary);
    color: #fff;
    border: none;
    border-radius: var(--mcla-radius-md);
    cursor: pointer;
  }
}

.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--mcla-border-color);
  border-top-color: var(--mcla-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.info-section {
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  padding: 20px 24px;
  margin-bottom: 16px;

  .section-title {
    font-size: 15px;
    font-weight: 650;
    color: var(--mcla-text-primary);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;

    .mod-count {
      font-size: 12px;
      color: var(--mcla-text-muted);
      font-weight: 400;
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &.full-width {
      grid-column: 1 / -1;
    }

    label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--mcla-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .value {
      font-size: 14px;
      color: var(--mcla-text-primary);
      font-weight: 500;
    }

    .version-badge {
      display: inline-block;
      padding: 2px 10px;
      background: var(--mcla-info-light);
      color: var(--mcla-info);
      border-radius: var(--mcla-radius-sm);
      font-weight: 600;
      font-size: 13px;
    }

    .loader-badge {
      display: inline-block;
      padding: 2px 10px;
      background: var(--mcla-success-light);
      color: var(--mcla-success);
      border-radius: var(--mcla-radius-sm);
      font-weight: 600;
      font-size: 13px;
    }

    .path-value {
      font-family: var(--mcla-font-mono);
      font-size: 13px;
      word-break: break-all;
      color: var(--mcla-text-secondary);
    }

    .edit-input {
      padding: 8px 12px;
      background: var(--mcla-bg-input);
      border: 1px solid var(--mcla-border-color);
      border-radius: var(--mcla-radius-md);
      color: var(--mcla-text-primary);
      font-size: 14px;
      outline: none;
      transition: all var(--mcla-transition-fast);

      &:focus {
        border-color: var(--mcla-border-color-focus);
        box-shadow: var(--mcla-input-focus-shadow);
      }

      &.number-input {
        width: 120px;
      }
    }
  }
}

.save-btn {
  margin-top: 14px;
  padding: 8px 24px;
  background: var(--mcla-gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-md);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover:not(:disabled) { filter: brightness(1.06); box-shadow: var(--mcla-shadow-glow-primary); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: var(--mcla-text-muted);

  p { margin: 12px 0 16px; }

  .link-btn {
    display: inline-block;
    padding: 8px 20px;
    color: var(--mcla-primary-500);
    font-size: 13.5px;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid var(--mcla-primary-300);
    border-radius: var(--mcla-radius-md);
    transition: all var(--mcla-transition-fast);

    &:hover { background: var(--mcla-primary-light); }
  }
}

.hint-text {
  color: var(--mcla-text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}
</style>
