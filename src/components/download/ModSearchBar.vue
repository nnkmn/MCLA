<template>
  <div class="mod-search-bar">
    <!-- 搜索输入 -->
    <div class="search-input-wrap">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        ref="searchInput"
        type="text"
        v-model="query"
        :placeholder="placeholder"
        @keydown.enter="handleSearch"
      />
      <button v-if="query" class="clear-btn" @click="clearQuery">×</button>
    </div>

    <!-- 平台切换 -->
    <div class="platform-switch">
      <button
        v-for="p in platforms"
        :key="p.id"
        class="platform-btn"
        :class="{ active: currentSource === p.id }"
        @click="switchPlatform(p.id)"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- 分类标签（可选） -->
    <div v-if="showCategories && categories.length" class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="cat-tab"
        :class="{ active: activeCategory === cat.id }"
        @click="$emit('update:activeCategory', cat.id)"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 搜索按钮 -->
    <button class="search-btn" @click="handleSearch" :disabled="!query.trim()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      搜索
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ContentPlatform } from '../../types/download'

const props = withDefaults(defineProps<{
  modelValue?: string
  source?: ContentPlatform
  activeCategory?: string
  showCategories?: boolean
  categories?: { id: string; label: string }[]
  placeholder?: string
}>(), {
  modelValue: '',
  source: 'modrinth',
  activeCategory: '',
  showCategories: false,
  placeholder: '搜索 Mod、资源包、整合包...',
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'update:source', val: ContentPlatform): void
  (e: 'update:activeCategory', val: string): void
  (e: 'search'): void
}>()

const query = ref(props.modelValue)
const searchInput = ref<HTMLInputElement | null>(null)
const currentSource = ref<ContentPlatform>(props.source)

const platforms = [
  { id: 'modrinth' as ContentPlatform, label: 'Modrinth' },
  { id: 'curseforge' as ContentPlatform, label: 'CurseForge' },
]

function switchPlatform(p: ContentPlatform) {
  currentSource.value = p
  emit('update:source', p)
}

function handleSearch() {
  if (query.value.trim()) {
    emit('update:modelValue', query.value)
    emit('search')
  }
}

function clearQuery() {
  query.value = ''
  emit('update:modelValue', '')
}

onMounted(() => {
  // 自动聚焦
})
</script>

<style scoped lang="scss">
.mod-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);

  flex-wrap: wrap;
}

.search-input-wrap {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--mcla-bg-input);
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  transition: all var(--mcla-transition-fast);

  &:focus-within {
    border-color: var(--mcla-border-color-focus);
    box-shadow: var(--mcla-input-focus-shadow);
  }

  svg {
    color: var(--mcla-text-muted);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--mcla-text-primary);
    font-size: 14px;

    &::placeholder { color: var(--mcla-text-muted); }
  }

  .clear-btn {
    padding: 0 4px;
    font-size: 18px;
    color: var(--mcla-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    line-height: 1;

    &:hover { color: var(--mcla-text-primary); }
  }
}

.platform-switch {
  display: flex;
  gap: 3px;
  background: var(--mcla-bg-input);
  padding: 3px;
  border-radius: var(--mcla-radius-sm);

  .platform-btn {
    padding: 6px 14px;
    border: none;
    border-radius: 3px;
    background: transparent;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--mcla-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &.active {
      background: #fff;
      color: var(--mcla-primary-700);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    &:hover:not(.active) { color: var(--mcla-text-secondary); }
  }
}

.category-tabs {
  display: flex;
  gap: 4px;
  margin-left: auto;

  .cat-tab {
    padding: 5px 12px;
    border: 1px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-sm);
    background: transparent;
    font-size: 12px;
    color: var(--mcla-text-muted);
    cursor: pointer;
    transition: all 0.12s;

    &.active {
      background: var(--mcla-primary-light);
      border-color: var(--mcla-primary-300);
      color: var(--mcla-primary-600);
      font-weight: 600;
    }
    &:hover:not(.active) { color: var(--mcla-text-secondary); }
  }
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px 20px;
  background: var(--mcla-gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-md);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--mcla-transition-fast);

  &:hover:not(:disabled) { filter: brightness(1.06); box-shadow: var(--mcla-shadow-glow-primary); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
}
</style>
