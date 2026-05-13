<template>
  <div class="downloads-page">
    <!-- ====== 原版游戏视图 ====== -->
    <template v-if="activeCategory === 'vanilla'">
      <!-- 顶部提示 -->
      <div class="dl-header">
        <div class="dl-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div class="dl-header-text">
          <h3 class="dl-title">原版游戏</h3>
          <p class="dl-subtitle">选择 Minecraft 版本下载</p>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="dl-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" v-model="verSearch" placeholder="搜索版本号..." />
        <button class="btn-refresh" @click="refreshVersions" title="刷新">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
      </div>

      <!-- 版本分类折叠面板（Accordion） -->
      <div class="ver-accordion">
        <!-- 正式版 -->
        <div class="acc-group">
          <button class="acc-header" :class="{ open: accOpen.release }" @click="accOpen.release = !accOpen.release">
            <span class="acc-title">正式版</span>
            <span class="acc-count">{{ allVersions.filter(v => v.type === 'release').length }} 个版本</span>
            <svg class="acc-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="acc-body" v-show="accOpen.release">
            <div
              v-for="ver in filteredBySearch(releaseVersions)"
              :key="'r-'+ver.id"
              class="ver-item"
              :class="{ featured: ver.featured }"
              @mouseenter="ver.hovered = true"
              @mouseleave="ver.hovered = false"
              @click="goToDetail(ver)"
            >
              <div class="ver-icon" :style="{ background: ver.color }">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div class="ver-info">
                <div class="ver-header">
                  <span class="ver-name">{{ ver.name }}</span>
                  <span class="ver-type-tag release">正式版</span>
                  <span class="ver-date">{{ ver.date }}</span>
                </div>
                <p class="ver-desc">{{ ver.desc }}</p>
              </div>
              <div class="ver-actions" :class="{ visible: ver.hovered || ver.featured }">
                <button
                  class="va-btn primary"
                  :class="{ 'is-dl': ver.downloading, 'is-done': ver.downloaded }"
                  :disabled="ver.downloading || ver.downloaded"
                  @click.stop="downloadVersion(ver)"
                >
                  <svg v-if="ver.downloading" class="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  <svg v-else-if="ver.downloaded" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {{ ver.downloading ? '下载中' : ver.downloaded ? '已下载' : '下载' }}
                </button>
                <button class="va-btn" @click.stop="addVersion(ver)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>
            <div v-if="filteredBySearch(releaseVersions).length === 0" class="acc-empty">
              {{ isLoadingVersions ? '加载中...' : '无匹配结果' }}
            </div>
          </div>
        </div>

        <!-- 预览版 -->
        <div class="acc-group">
          <button class="acc-header" :class="{ open: accOpen.snapshot }" @click="accOpen.snapshot = !accOpen.snapshot">
            <span class="acc-title">预览版</span>
            <span class="acc-count">{{ snapshotVersions.length }} 个版本</span>
            <svg class="acc-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="acc-body" v-show="accOpen.snapshot">
            <div
              v-for="ver in filteredBySearch(snapshotVersions)"
              :key="'s-'+ver.id"
              class="ver-item"
              :class="{ featured: ver.featured }"
              @mouseenter="ver.hovered = true"
              @mouseleave="ver.hovered = false"
              @click="goToDetail(ver)"
            >
              <div class="ver-icon" :style="{ background: ver.color }">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div class="ver-info">
                <div class="ver-header">
                  <span class="ver-name">{{ ver.name }}</span>
                  <span class="ver-type-tag snapshot">快照</span>
                  <span class="ver-date">{{ ver.date }}</span>
                </div>
                <p class="ver-desc">{{ ver.desc }}</p>
              </div>
              <div class="ver-actions" :class="{ visible: ver.hovered || ver.featured }">
                <button
                  class="va-btn primary"
                  :class="{ 'is-dl': ver.downloading, 'is-done': ver.downloaded }"
                  :disabled="ver.downloading || ver.downloaded"
                  @click.stop="downloadVersion(ver)"
                >
                  <svg v-if="ver.downloading" class="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  <svg v-else-if="ver.downloaded" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {{ ver.downloading ? '下载中' : ver.downloaded ? '已下载' : '下载' }}
                </button>
                <button class="va-btn" @click.stop="addVersion(ver)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>
            <div v-if="filteredBySearch(snapshotVersions).length === 0" class="acc-empty">
              {{ isLoadingVersions ? '加载中...' : '无匹配结果' }}
            </div>
          </div>
        </div>

        <!-- 远古版 -->
        <div class="acc-group">
          <button class="acc-header" :class="{ open: accOpen.old }" @click="accOpen.old = !accOpen.old">
            <span class="acc-title">远古版</span>
            <span class="acc-count">{{ oldVersions.length }} 个版本</span>
            <svg class="acc-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="acc-body" v-show="accOpen.old">
            <div
              v-for="ver in filteredBySearch(oldVersions)"
              :key="'o'+ver.id"
              class="ver-item"
              @mouseenter="ver.hovered = true"
              @mouseleave="ver.hovered = false"
              @click="goToDetail(ver)"
            >
              <div class="ver-icon" :style="{ background: ver.color }">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div class="ver-info">
                <div class="ver-header">
                  <span class="ver-name">{{ ver.name }}</span>
                  <span class="ver-type-tag old">旧版</span>
                  <span class="ver-date">{{ ver.date }}</span>
                </div>
                <p class="ver-desc">{{ ver.desc }}</p>
              </div>
              <div class="ver-actions" :class="{ visible: ver.hovered }">
                <button
                  class="va-btn primary"
                  :class="{ 'is-dl': ver.downloading, 'is-done': ver.downloaded }"
                  :disabled="ver.downloading || ver.downloaded"
                  @click.stop="downloadVersion(ver)"
                >
                  <svg v-if="ver.downloading" class="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  <svg v-else-if="ver.downloaded" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {{ ver.downloading ? '下载中' : ver.downloaded ? '已下载' : '下载' }}
                </button>
                <button class="va-btn" @click.stop="addVersion(ver)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>
            <div v-if="filteredBySearch(oldVersions).length === 0" class="acc-empty">
              {{ isLoadingVersions ? '加载中...' : '无匹配结果' }}
            </div>
          </div>
        </div>

        <!-- 愚人节版 -->
        <div class="acc-group">
          <button class="acc-header" :class="{ open: accOpen.april }" @click="accOpen.april = !accOpen.april">
            <span class="acc-title">愚人节版</span>
            <span class="acc-count">{{ aprilVersions.length }} 个版本</span>
            <svg class="acc-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="acc-body" v-show="accOpen.april">
            <div
              v-for="ver in filteredBySearch(aprilVersions)"
              :key="'a'+ver.id"
              class="ver-item"
              :class="{ featured: ver.featured }"
              @mouseenter="ver.hovered = true"
              @mouseleave="ver.hovered = false"
              @click="goToDetail(ver)"
            >
              <div class="ver-icon" :style="{ background: ver.color }">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div class="ver-info">
                <div class="ver-header">
                  <span class="ver-name">{{ ver.name }}</span>
                  <span class="ver-type-tag april">愚人节</span>
                  <span class="ver-date">{{ ver.date }}</span>
                </div>
                <p class="ver-desc">{{ ver.desc }}</p>
              </div>
              <div class="ver-actions" :class="{ visible: ver.hovered || ver.featured }">
                <button
                  class="va-btn primary"
                  :class="{ 'is-dl': ver.downloading, 'is-done': ver.downloaded }"
                  :disabled="ver.downloading || ver.downloaded"
                  @click.stop="downloadVersion(ver)"
                >
                  <svg v-if="ver.downloading" class="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  <svg v-else-if="ver.downloaded" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {{ ver.downloading ? '下载中' : ver.downloaded ? '已下载' : '下载' }}
                </button>
                <button class="va-btn" @click.stop="addVersion(ver)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>
            <div v-if="filteredBySearch(aprilVersions).length === 0" class="acc-empty">
              {{ isLoadingVersions ? '加载中...' : '无匹配结果' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div class="ver-more" v-if="hasMoreVersions">
        <button class="btn-loadmore" @click="loadMoreVersions">加载更多版本</button>
      </div>
    </template>

    <!-- ====== 社区资源视图（Mod/整合包/数据包/资源包/光影包） ====== -->
    <template v-else>
      <!-- 筛选表单 -->
      <section class="filter-section">
        <h3 class="fs-title">搜索{{ categoryLabel }}</h3>
        <div class="filter-grid">
          <div class="f-row">
            <label>名称</label>
            <input type="text" class="f-input" v-model="searchName" placeholder="" />
          </div>
          <div class="f-row">
            <label>来源</label>
            <select class="f-select" v-model="searchSource">
              <option value="all">全部</option>
              <option value="modrinth">Modrinth</option>
              <option value="curseforge">CurseForge</option>
            </select>
          </div>
          <div class="f-row">
            <label>版本</label>
            <select class="f-select" v-model="searchVersion">
              <option value="">全部</option>
              <option value="1.20.1">1.20.1</option>
              <option value="1.20.4">1.20.4</option>
              <option value="1.21">1.21</option>
              <option value="26.1">26.1</option>
            </select>
          </div>
          <!-- 选了版本后出现加载器选项（仅 Mod） -->
          <div class="f-row" v-if="activeCategory === 'mod' && searchVersion">
            <label>加载器</label>
            <select class="f-select" v-model="searchLoader">
              <option value="">任意 Mod 加载器</option>
              <option value="fabric">Fabric</option>
              <option value="forge">Forge</option>
              <option value="neoforge">NeoForge</option>
              <option value="quilt">Quilt</option>
              <option value="liteLoader">LiteLoader</option>
              <option value="optifine">OptiFine</option>
            </select>
          </div>
          <!-- Mod 分类 / 光影分类 -->
          <div class="f-row" v-if="activeCategory === 'mod' || activeCategory === 'shader' || activeCategory === 'resourcepack' || activeCategory === 'datapack'">
            <label>类型</label>
            <select class="f-select" v-model="searchType">
              <option value="">全部</option>
              <option v-for="t in availableTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
        </div>

        <div class="filter-actions">
          <button class="btn-search" @click="doSearch">搜索</button>
          <button class="btn-reset" @click="resetSearch">重置条件</button>
          <button v-if="activeCategory === 'modpack'" class="btn-secondary">安装已有整合包</button>
        </div>
      </section>

      <!-- 加载状态 -->
      <section v-if="isLoading" class="loading-section">
        <div class="load-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--mcla-blue)" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        </div>
        <p class="load-text">正在获取 {{ categoryLabel }} 列表 - {{ loadProgress }}%</p>
      </section>

      <!-- 结果列表 -->
      <section v-else-if="filteredResources.length" class="result-list">
        <div
          v-for="r in filteredResources"
          :key="r.id"
          class="res-card"
          :class="{ 'has-real-data': dlStore.searchResults.length > 0 }"
          @click="handleCardClick(r)"
        >
          <div v-if="!r.icon" class="res-thumb-placeholder" :style="{ background: r.color }">
            {{ r.name[0] }}
          </div>
          <img v-else :src="r.icon" class="res-thumb" />
          <div class="res-body">
            <p class="res-name">{{ r.name }}</p>
            <div class="res-tags">
              <span class="tag" v-for="tag in (r.tags || []).slice(0, 5)" :key="tag">{{ tag }}</span>
            </div>
            <p class="res-desc">{{ r.desc }}</p>
            <div class="res-meta">
              <span><b>{{ r.downloads }}</b></span>
              <span>{{ r.time }}</span>
              <span>{{ r.source }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 空状态 -->
      <section v-else class="empty-section">
        <p>没有找到匹配的{{ categoryLabel }}</p>
      </section>
    </template>

    <!-- Mod 详情弹窗 -->
    <ModDetailModal
      v-model="showModDetail"
      :mod="selectedMod"
      :instance="selectedInstance"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useDownloadStore } from '../stores/download.store'
import { useInstancesStore } from '../stores/instances.store'
import type { ModSearchResult } from '../types/download'
import type { GameInstance } from '../types/instance'
import ModDetailModal from '../components/download/ModDetailModal.vue'

const dlActiveCat = inject<ref<string>>('dlActiveCat')!
const activeCategory = computed(() => dlActiveCat.value)

const categoryMap: Record<string, string> = {
  vanilla: '原版游戏', mod: 'Mod', modpack: '整合包',
  datapack: '数据包', resourcepack: '资源包', shader: '光影包',
}
const categoryLabel = computed(() => categoryMap[activeCategory.value] || '资源')

// ====== Stores ======
const dlStore = useDownloadStore()
const instancesStore = useInstancesStore()

// ====== Mod 详情弹窗 ======
const showModDetail = ref(false)
const selectedMod = ref<ModSearchResult | null>(null)
const selectedInstance = ref<GameInstance | null>(null)

function openModDetail(mod: ModSearchResult) {
  selectedMod.value = mod
  // 如果有当前选中的实例，传入弹窗自动设置目标
  selectedInstance.value = instancesStore.currentInstance
  showModDetail.value = true
}

// ---- 原版游戏 ----
const verSearch = ref('')
const hasMoreVersions = ref(true)
const isLoadingVersions = ref(false)

// 折叠面板状态
const accOpen = reactive({
  release: true,   // 正式版默认展开
  snapshot: false,
  old: false,
  april: false,
})

// 已安装版本缓存（用于判断是否已下载）
const installedVersionIds = ref<Set<string>>(new Set())

interface VerItem {
  id: string
  name: string
  type: 'release' | 'snapshot' | 'old' | 'april'
  typeLabel: string
  date: string
  desc: string
  color: string
  featured: boolean
  hovered: boolean
  downloading: boolean
  downloaded: boolean
}

// 所有版本（扁平，分类显示）
const allVersions = ref<VerItem[]>([])
const PAGE_SIZE = 20
const displayedCount = ref(PAGE_SIZE)

// 分类版本（计算属性，从 allVersions 过滤）
const releaseVersions = computed(() =>
  allVersions.value.filter(v => v.type === 'release').slice(0, displayedCount.value)
)
const snapshotVersions = computed(() =>
  allVersions.value.filter(v => v.type === 'snapshot').slice(0, 10)
)
const oldVersions = computed(() =>
  allVersions.value.filter(v => v.type === 'old').slice(0, 20)
)
const aprilVersions = computed(() =>
  allVersions.value.filter(v => v.type === 'april')
)

// 加载更多
const hasMoreReleases = computed(() =>
  allVersions.value.filter(v => v.type === 'release').length > displayedCount.value
)

function loadMoreVersions() {
  if (!hasMoreReleases.value) return
  displayedCount.value += PAGE_SIZE
}

function toVerItem(raw: any, isInstalled: boolean): VerItem {
  const t = raw.type as string
  let type: VerItem['type'] = 'release'
  if (t === 'snapshot' || t.includes('snapshot')) type = 'snapshot'
  else if (t === 'old_alpha' || t === 'old_beta') type = 'old'
  else if (isAprilFools(raw.id)) type = 'april'

  const color = typeColor(type)
  const isFeatured = isFeaturedVersion(raw.id, type)

  return {
    id: raw.id,
    name: raw.id,
    type,
    typeLabel: typeLabelOf(type),
    date: raw.releaseTime ? raw.releaseTime.slice(0, 10) : '',
    desc: getVersionDesc(raw.id),
    color,
    featured: isFeatured,
    hovered: false,
    downloading: false,
    downloaded: isInstalled,
  }
}

function isAprilFools(id: string): boolean {
  // 愚人节版本命名规律：含 craftmine/potato/or_b|oneblockatatime 或日期在4月1日
  return /craftmine|potato|or_b|oneblockatatime/i.test(id)
}

function typeLabelOf(type: VerItem['type']): string {
  const map: Record<string, string> = { release: '正式版', snapshot: '快照', old: '旧版', april: '愚人节' }
  return map[type] || '正式版'
}

function typeColor(type: VerItem['type']): string {
  const map: Record<string, string> = {
    release: '#4CAF50',
    snapshot: '#FF9800',
    old: '#78909C',
    april: '#E91E63',
  }
  return map[type] || '#4CAF50'
}

function isFeaturedVersion(id: string, type: string): boolean {
  const featured = ['1.21.4', '1.21.3', '1.20.4', '1.20.1', '1.19.2', '1.18.2', '1.16.5', '1.12.2']
  return type === 'release' && featured.includes(id)
}

function getVersionDesc(id: string): string {
  const descs: Record<string, string> = {
    '1.21.4': '花园与密林更新',
    '1.21.3': 'Bundles of Bravery',
    '1.21.2': '错误修复更新',
    '1.21.1': '错误修复更新',
    '1.21': '棘巧试炼',
    '1.20.6': '错误修复更新',
    '1.20.4': '错误修复更新',
    '1.20.3': '主要更新',
    '1.20.2': '主要更新',
    '1.20.1': '足迹与故事',
    '1.19.4': '主要更新',
    '1.19.3': '深暗古城更新',
    '1.19.2': '荒野更新',
    '1.19.1': '错误修复更新',
    '1.19': '荒野更新',
    '1.18.2': '洞穴与悬崖 Part 2',
    '1.18.1': '主要更新',
    '1.18': '洞穴与悬崖 Part 1',
    '1.17.1': '主要更新',
    '1.17': '洞穴与悬崖 Part 1',
    '1.16.5': '主要更新',
    '1.16.4': '主要更新',
    '1.16.3': '主要更新',
    '1.16.2': '主要更新',
    '1.16.1': '主要更新',
    '1.16': '下界更新',
    '1.15.2': '蜜蜂更新',
    '1.15.1': '主要更新',
    '1.15': '蜜蜂更新',
    '1.14.4': '主要更新',
    '1.14.3': '主要更新',
    '1.14.2': '主要更新',
    '1.14.1': '主要更新',
    '1.14': '村庄与掠夺',
    '1.13.2': '水域更新',
    '1.13.1': '主要更新',
    '1.13': '水域更新',
    '1.12.2': '缤纷更新',
    '1.12.1': '主要更新',
    '1.12': '缤纷更新',
    '1.11.2': '主要更新',
    '1.11.1': '主要更新',
    '1.11': '探险时间',
    '1.10.2': '主要更新',
    '1.10.1': '主要更新',
    '1.10': '主要更新',
    '1.9.4': 'Combat Update',
    '1.9.3': '主要更新',
    '1.9.2': '主要更新',
    '1.9.1': '主要更新',
    '1.9': 'Combat Update',
    '1.8.9': '重要更新',
    '1.8.8': '主要更新',
    '1.8.7': '主要更新',
    '1.8.6': '主要更新',
    '1.8.5': '主要更新',
    '1.8.4': '主要更新',
    '1.8.3': '主要更新',
    '1.8.2': '主要更新',
    '1.8.1': '主要更新',
    '1.8': '重要更新',
    '1.7.10': '改变世界的更新',
    '1.7.9': '主要更新',
    '1.7.8': '主要更新',
    '1.7.7': '主要更新',
    '1.7.6': '主要更新',
    '1.7.5': '主要更新',
    '1.7.4': '主要更新',
    '1.7.2': '改变世界的更新',
  }
  return descs[id] || ''
}

// 加载版本列表
async function refreshVersions() {
  isLoadingVersions.value = true
  try {
    const api = window.electronAPI
    if (!api?.versions) {
      isLoadingVersions.value = false
      return
    }

    // 获取已安装版本
    let mcDir = ''
    if (api.path) {
      mcDir = await api.path.getMinecraft()
    }

    // 扫描已安装版本
    let installed: Set<string> = new Set()
    if (mcDir && api.versions.scanFolder) {
      try {
        const res = await api.versions.scanFolder(mcDir)
        if (res?.ok && res.data) {
          for (const v of res.data as any[]) {
            installed.add(v.id)
          }
        }
      } catch { /* 忽略扫描错误 */ }
    }
    installedVersionIds.value = installed

    // 从 BMCLAPI 获取版本列表
    const rawVersions = await api.versions.list()
    allVersions.value = (rawVersions || []).map((raw: any) =>
      toVerItem(raw, installed.has(raw.id))
    )
  } catch (err) {
  } finally {
    isLoadingVersions.value = false
  }
}

// 跳转到版本详情页
const router = useRouter()
function goToDetail(ver: VerItem) {
  router.push(`/download/version/${ver.id}`)
}

// 下载版本（下载到当前选中的 .minecraft 文件夹 + 创建实例）
async function downloadVersion(ver: VerItem) {
  if (ver.downloading || ver.downloaded) return
  const api = window.electronAPI
  if (!api?.versions || !api?.instance) {
    return
  }

  // 优先使用 VersionSelect 当前选中的文件夹，否则用默认路径
  let mcDir = ''
  if (api?.folders) {
    mcDir = await api.folders.getLast() ?? ''
  }
  if (!mcDir && api?.path) {
    mcDir = await api.path.getMinecraft()
  }
  if (!mcDir) {
    return
  }

  ver.downloading = true
  try {
    const res = await api.versions.download(ver.id, mcDir)
    if (res?.ok) {
      ver.downloaded = true
      installedVersionIds.value.add(ver.id)
      // 创建实例
      await api.instance.create({
        name: ver.id,
        mcVersion: ver.id,
        loaderType: 'vanilla',
        loaderVersion: '',
      })
    } else {
    }
  } catch (err) {
  } finally {
    ver.downloading = false
  }
}

// 添加已下载版本（仅创建实例，不下载）
async function addVersion(ver: VerItem) {
  const api = window.electronAPI
  if (!api?.instance) return
  await api.instance.create({
    name: ver.id,
    mcVersion: ver.id,
    loaderType: 'vanilla',
    loaderVersion: '',
  })
}

// 搜索过滤（各分类独立）
function filteredBySearch(list: VerItem[]): VerItem[] {
  if (!verSearch.value) return list
  const q = verSearch.value.toLowerCase()
  return list.filter(v => v.name.toLowerCase().includes(q))
}

// 初始加载
refreshVersions()

// ---- 搜索筛选 ----
const searchName = ref('')
const searchSource = ref('all')
const searchVersion = ref('')
const searchType = ref('')
const searchLoader = ref('')  // Mod 加载器（选了版本后才出现）
const isLoading = ref(false)
const loadProgress = ref(55)

const availableTypes = computed(() => {
  if (activeCategory.value === 'mod') return [
    '世界元素', '生物群系', '维度', '矿物与资源', '天然结构',
    '科技', '管道与物流', '自动化', '能源', '红石',
    '食物与烹饪', '农业', '游戏机制', '存储', '合成表',
    '冒险探索', '魔法', '战斗', '生物', '物品',
    '装备工具', 'GUI', '信息显示', '优化性能', '服务器管理'
  ]
  if (activeCategory.value === 'shader') return ['Iris', 'OptiFine', 'Voyager', 'Complementary']
  if (activeCategory.value === 'resourcepack') return ['16x', '32x', '64x', '128x+']
  if (activeCategory.value === 'datapack') return ['实用', 'QoL', '机制', '冒险']
  return []
})

interface ResourceItem {
  id: string; name: string; tags: string[]; desc: string;
  downloads: string; time: string; source: string;
  icon?: string; color?: string;
}

const allResources: Record<string, ResourceItem[]> = {
  mod: [
    { id: 'm1', name: 'Sodium', tags: ['性能','Fabric'], desc: 'Modern rendering engine for Fabric, dramatically improves FPS.', downloads: '1.2 亿', time: '3 天前', source: 'Modrinth', color: '#78909C' },
    { id: 'm2', name: 'Iris Shaders', tags: ['光影','Fabric','Forge'], desc: 'Shader mod compatible with Continuum and other packs.', downloads: '8900 万', time: '1 周前', source: 'Modrinth', color: '#42A5F5' },
    { id: 'm3', name: 'Lithium', tags: ['性能','服务端','Fabric'], desc: 'General optimization mod for Fabric.', downloads: '6700 万', time: '2 周前', source: 'CurseForge', color: '#FFB74D' },
  ],
  modpack: [],
  datapack: [
    { id: 'd1', name: 'Vanilla Tweaks', tags: ['实用','QoL'], desc: 'A collection of small vanilla-friendly tweaks.', downloads: '3200 万', time: '1 个月前', source: 'Modrinth', color: '#78909C' },
  ],
  resourcepack: [
    { id: 'r1', name: 'Fresh Animations', tags: ['16x','动态'], desc: 'Dynamic animated entities to freshen your Minecraft!', downloads: '8218 万', time: '22 天前', source: 'CurseForge', color: '#90CAF9' },
    { id: 'r2', name: 'Xray Ultimate', tags: ['16x','实用'], desc: 'Xray for 1.21', downloads: '7281 万', time: '5 个月前', source: 'CurseForge', color: '#ECEFF1' },
  ],
  shader: [
    { id: 's1', name: 'Complementary Shaders', tags: ['Iris','半写实'], desc: 'Transforming the visuals of Minecraft with excellence.', downloads: '4639 万', time: '2 个月前', source: 'Modrinth', color: '#CE93D8' },
    { id: 's2', name: 'BSL Shaders', tags: ['Iris','OptiFine'], desc: 'Bright, colorful, beautiful shaderpack.', downloads: '2126 万', time: '3 天前', source: 'Modrinth', color: '#42A5F5' },
  ],
}

const filteredResources = computed(() => {
  // 有搜索结果时用真实数据
  if (dlStore.searchResults.length > 0) {
    return dlStore.searchResults.map(r => ({
      id: r.id,
      name: r.name,
      tags: r.loaders || r.categories || [],
      desc: r.description,
      downloads: String(r.downloads),
      time: '',
      source: r.source === 'curseforge' ? 'CurseForge' : 'Modrinth',
      icon: r.iconUrl,
      color: '#6366f1',
    }))
  }
  // 无搜索时用静态示例数据
  const items = allResources[activeCategory.value] || []
  if (!searchName.value) return items
  const q = searchName.value.toLowerCase()
  return items.filter(r => r.name.toLowerCase().includes(q))
})

function doSearch() {
  isLoading.value = true
  loadProgress.value = 0

  // 真实 API 调用
  dlStore.searchMods({
    query: searchName.value,
    source: searchSource.value === 'all' ? 'modrinth' : searchSource.value as any,
    gameVersion: searchVersion.value || undefined,
    loaderType: searchLoader.value || undefined,
    offset: 0,
    limit: 20,
  }).finally(() => {
    isLoading.value = false
  })
}

function resetSearch() {
  searchName.value = ''
  searchSource.value = 'all'
  searchVersion.value = ''
  searchType.value = ''
  searchLoader.value = ''
  dlStore.searchResults = []
}

function handleCardClick(r: any) {
  // 如果是真实搜索结果，转换为 ModSearchResult 格式打开详情
  const real = dlStore.searchResults.find(m => m.id === r.id)
  if (real) {
    openModDetail(real)
  }
}
</script>

<style scoped lang="scss">
.downloads-page {
  padding: 20px 24px;
  overflow-y: auto;
  height: 100%;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }
}

/* ---- 顶部头 ---- */
.dl-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;

  .dl-header-icon {
    width: 44px; height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--mcla-blue), #42A5F5);
    display: flex; align-items: center; justify-content: center;
    color: #fff; flex-shrink: 0;
  }

  .dl-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--mcla-text); }
  .dl-subtitle { margin: 2px 0 0; font-size: 12px; color: var(--mcla-text-muted); }
}

/* ---- 版本分类 Tab ---- */
.ver-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.ver-tab {
  padding: 7px 16px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 7px;
  background: var(--mcla-surface);
  font-size: 13px;
  font-weight: 500;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  transition: all 0.14s;
  display: flex; align-items: center; gap: 4px;

  &:hover { border-color: var(--mcla-blue); color: var(--mcla-blue); }
  &.active {
    background: var(--mcla-blue);
    border-color: var(--mcla-blue);
    color: #fff;
  }

  .tab-count {
    font-size: 11px;
    opacity: 0.7;
  }
}

/* ---- 搜索栏 ---- */
.dl-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--mcla-surface);
  border: 1px solid var(--mcla-border);
  border-radius: 7px;
  margin-bottom: 14px;
  flex-shrink: 0;

  svg { color: var(--mcla-text-muted); flex-shrink: 0; }
  input {
    flex: 1; border: none; outline: none;
    font-size: 13px; color: var(--mcla-text); background: transparent;
    &::placeholder { color: var(--mcla-text-muted); }
  }

  .btn-refresh {
    width: 28px; height: 28px; border: none; background: transparent;
    color: var(--mcla-text-muted); cursor: pointer; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.12s;
    &:hover { background: var(--mcla-bg); color: var(--mcla-blue); }
  }
}

/* ---- 版本列表（Accordion） ---- */
.ver-accordion {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.acc-group {
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-lg);
  border: 1.5px solid var(--mcla-border-color);
  overflow: hidden;
  box-shadow: var(--mcla-shadow-sm);

  &:hover { border-color: var(--mcla-primary-200); }
}

.acc-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background var(--mcla-transition-fast);

  &:hover { background: var(--mcla-bg-hover); }

  .acc-title {
    font-size: 14.5px;
    font-weight: var(--mcla-font-bold);
    color: var(--mcla-text-primary);
  }

  .acc-count {
    font-size: 12px;
    color: var(--mcla-text-muted);
    margin-left: auto;
  }

  .acc-arrow {
    color: var(--mcla-text-tertiary);
    transition: transform var(--mcla-transition-normal);
    flex-shrink: 0;
  }

  &.open .acc-arrow {
    transform: rotate(180deg);
  }
}

.acc-body {
  border-top: 1.5px solid var(--mcla-border-strong);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px 10px;
  background: var(--mcla-bg-secondary);
}

.acc-empty {
  text-align: center;
  padding: 16px;
  font-size: 12.5px;
  color: var(--mcla-text-muted);
}

.ver-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: var(--mcla-surface);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.14s;

  &:hover {
    border-color: var(--mcla-border);
    box-shadow: 0 1px 6px rgba(0,0,0,0.05);
  }

  &.featured {
    border-left: 3px solid var(--mcla-blue);
    background: linear-gradient(135deg, rgba(21,101,192,0.03), var(--mcla-surface));
  }
}

.ver-icon {
  width: 40px; height: 40px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.ver-info {
  flex: 1; min-width: 0;

  .ver-header {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }

  .ver-name {
    font-size: 14px; font-weight: 700; color: var(--mcla-text);
  }

  .ver-type-tag {
    font-size: 10px; font-weight: 600;
    padding: 1px 7px; border-radius: 3px;

    &.release { background: #E8F5E9; color: #2E7D32; }
    &.snapshot { background: #FFF3E0; color: #E65100; }
    &.old { background: #ECEFF1; color: #546E7A; }
    &.april { background: #FCE4EC; color: #C62828; }
  }

  .ver-date {
    font-size: 11px; color: var(--mcla-text-muted); margin-left: auto;
  }

  .ver-desc {
    margin: 3px 0 0;
    font-size: 12px; color: var(--mcla-text-muted);
  }
}

.ver-actions {
  display: flex; gap: 6px; opacity: 0;
  transition: opacity 0.15s; flex-shrink: 0;

  &.visible { opacity: 1; }
}

.va-btn {
  height: 30px; padding: 0 12px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 6px; background: var(--mcla-bg-elevated);
  font-size: 12px; color: var(--mcla-text-secondary);
  cursor: pointer; transition: all 0.12s;
  display: flex; align-items: center; gap: 4px;

  &:hover { border-color: var(--mcla-blue); color: var(--mcla-blue); }
  &.primary {
    background: var(--mcla-blue); border-color: var(--mcla-blue); color: #fff;
    &:hover { background: var(--mcla-blue-hover); }
  }
  &.is-dl {
    background: var(--mcla-blue-hover); border-color: var(--mcla-blue); color: #fff; cursor: wait; opacity: 0.85;
  }
  &.is-done {
    background: #2E7D32; border-color: #2E7D32; color: #fff; cursor: default; opacity: 0.8;
  }
}

.spin-icon {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ver-empty {
  text-align: center; padding: 48px 20px; color: var(--mcla-text-muted);
  p { margin: 8px 0 0; font-size: 13px; }
  svg { opacity: 0.3; }
}

.ver-more {
  text-align: center; padding: 12px 0;
}

.btn-loadmore {
  padding: 8px 24px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 7px; background: var(--mcla-surface);
  font-size: 13px; color: var(--mcla-text-secondary);
  cursor: pointer; transition: all 0.13s;
  &:hover { border-color: var(--mcla-blue); color: var(--mcla-blue); }
}

/* ====== 社区资源 ====== */
.filter-section {
  background: var(--mcla-surface);
  border-radius: 10px;
  padding: 18px 20px;
  border: 1px solid var(--mcla-border-light);
  margin-bottom: 16px;
}

.fs-title { margin: 0 0 14px; font-size: 15px; font-weight: 700; color: var(--mcla-text); }

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 18px;
  margin-bottom: 14px;
}

.f-row {
  display: flex; align-items: center; gap: 10px;

  label {
    font-size: 13px; font-weight: 500; color: var(--mcla-text);
    white-space: nowrap; min-width: 36px;
  }

  .f-input, .f-select {
    flex: 1; padding: 8px 10px;
    border: 1.5px solid var(--mcla-border); border-radius: 7px;
    font-size: 13px; color: var(--mcla-text); background: var(--mcla-bg-elevated);
    outline: none; transition: all 0.14s;
    &:focus { border-color: var(--mcla-blue); box-shadow: 0 0 0 3px rgba(21,101,192,0.08); }
  }
}

.filter-actions { display: flex; gap: 10px; }

.btn-search {
  padding: 8px 28px; background: var(--mcla-bg-elevated);
  border: 1.5px solid var(--mcla-blue); border-radius: 7px;
  font-size: 13px; font-weight: 600; color: var(--mcla-blue);

  cursor: pointer; transition: all 0.14s;
  &:hover { background: rgba(21,101,192,0.06); }
}
.btn-reset {
  padding: 8px 20px; background: var(--mcla-bg-elevated);
  border: 1.5px solid var(--mcla-border); border-radius: 7px;
  font-size: 13px; color: var(--mcla-text-secondary);

  cursor: pointer; transition: all 0.14s;
  &:hover { border-color: #999; color: var(--mcla-text); }
}
.btn-secondary {
  padding: 8px 20px; background: var(--mcla-bg-elevated);
  border: 1.5px solid #43A047; border-radius: 7px;
  font-size: 13px; color: #43A047; cursor: pointer;
  transition: all 0.14s; margin-left: auto;
  &:hover { background: #E8F5E9; }
}

/* 加载 */
.loading-section {
  text-align: center; padding: 56px 20px;
  background: var(--mcla-surface); border-radius: 10px;
  border: 1px solid var(--mcla-border-light);
  .load-icon { margin-bottom: 12px; animation: bounce 1.4s infinite ease-in-out; }
  .load-text { margin: 0; font-size: 14px; color: var(--mcla-blue); font-weight: 500; }
}
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

/* 结果 */
.result-list { display: flex; flex-direction: column; gap: 8px; }

.res-card {
  display: flex; gap: 14px; padding: 12px 14px;
  background: var(--mcla-surface); border-radius: 10px;
  border: 1px solid transparent; transition: all 0.13s; cursor: default;

  &.has-real-data { cursor: pointer; }

  &:hover {
    border-color: var(--mcla-border);
    box-shadow: 0 1px 6px rgba(0,0,0,0.05);
    transform: translateY(-1px);
  }

  .res-thumb { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
  .res-thumb-placeholder {
    width: 52px; height: 52px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0;
  }

  .res-body { flex: 1; min-width: 0;
    .res-name { margin: 0; font-size: 14px; font-weight: 600; color: var(--mcla-text); }
    .res-tags { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap;
      .tag { font-size: 11px; padding: 1px 7px; border-radius: 3px; background: var(--mcla-bg); color: var(--mcla-text-secondary); }
    }
    .res-desc { margin: 4px 0 0; font-size: 12px; color: var(--mcla-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .res-meta { display: flex; gap: 14px; margin-top: 4px; font-size: 11px; color: var(--mcla-text-muted);
      span b { color: var(--mcla-text-secondary); }
    }
  }
}

.empty-section { text-align: center; padding: 48px 20px; color: var(--mcla-text-muted); font-size: 14px; }
</style>
