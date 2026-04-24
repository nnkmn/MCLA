<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="ver-settings-overlay" @click.self="close">
        <div class="ver-settings-window">
          <!-- 标题栏 -->
          <header class="vs-header">
            <button class="vs-back" @click="close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="vs-title">版本设置 - {{ versionName }}</span>
            <div class="vs-wc">
              <button class="vs-wc-btn" @click="minimize"><svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg></button>
              <button class="vs-wc-btn vs-close" @click="close"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg></button>
            </div>
          </header>

          <!-- 主体 -->
          <div class="vs-body">
            <!-- 左侧导航 -->
            <nav class="vs-nav">
              <button
                v-for="item in navItems"
                :key="item.id"
                class="vs-nav-item"
                :class="{ active: activeTab === item.id }"
                @click="activeTab = item.id"
              >
                <span v-html="item.icon"></span>
                {{ item.label }}
              </button>
            </nav>

            <!-- 右侧内容 -->
            <main class="vs-content">
              <!-- ===== 概览 ===== -->
              <template v-if="activeTab === 'overview'">
                <!-- 版本信息卡片 -->
                <div class="ver-info-card">
                  <div class="ver-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--pcl-blue)" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                  </div>
                  <div class="ver-detail">
                    <p class="ver-full-name">{{ versionName }}</p>
                    <p class="ver-sub">正版版 {{ versionBase }} {{ loaderInfo }}</p>
                  </div>
                </div>

                <!-- 个性化 -->
                <section class="vs-section">
                  <h3 class="sec-title">个性化</h3>
                  <div class="form-row">
                    <label>图标</label>
                    <select class="form-select">
                      <option>自动</option>
                      <option>草方块</option>
                      <option>苦力怕</option>
                      <option>自定义</option>
                    </select>
                  </div>
                  <div class="form-row">
                    <label>分类</label>
                    <select class="form-select">
                      <option>自动</option>
                      <option>原版</option>
                      <option>Modded</option>
                      <option>整合包</option>
                    </select>
                  </div>
                  <div class="form-btns">
                    <button class="form-action-btn">修改版本名</button>
                    <button class="form-action-btn">修改版本描述</button>
                    <button class="form-action-btn">加入收藏夹</button>
                  </div>
                </section>

                <!-- 快捷方式 -->
                <section class="vs-section">
                  <h3 class="sec-title">快捷方式</h3>
                  <div class="form-btns">
                    <button class="form-action-btn">版本文件夹</button>
                    <button class="form-action-btn">存档文件夹</button>
                    <button class="form-action-btn">Mod 文件夹</button>
                  </div>
                </section>

                <!-- 高级管理 -->
                <section class="vs-section">
                  <h3 class="sec-title">高级管理</h3>
                  <div class="form-btns">
                    <button class="form-action-btn outline">导出启动脚本</button>
                    <button class="form-action-btn outline">补全文件</button>
                    <button class="form-action-btn danger">删除版本</button>
                  </div>
                </section>
              </template>

              <!-- ===== 设置 ===== -->
              <template v-if="activeTab === 'settings'">
                <!-- 提示条 -->
                <div class="vs-tip-bar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  这些设置只对该游戏版本生效，不影响其他版本。
                  <button class="tip-close" @click="showTip = false">×</button>
                </div>

                <section class="vs-section">
                  <h3 class="sec-title">启动选项</h3>
                  <div class="form-row">
                    <label>版本隔离</label>
                    <select class="form-select">
                      <option>开启</option>
                      <option>关闭</option>
                    </select>
                  </div>
                  <div class="form-row">
                    <label>游戏窗口标题</label>
                    <input type="text" class="form-input" placeholder="跟随全局设置" />
                  </div>
                  <div class="form-row">
                    <label>自定义信息</label>
                    <input type="text" class="form-input" placeholder="跟随全局设置" />
                  </div>
                  <div class="form-row">
                    <label>游戏 Java</label>
                    <select class="form-select">
                      <option>跟随全局设置</option>
                      <option>Java 17</option>
                      <option>Java 21</option>
                      <option>自定义路径</option>
                    </select>
                  </div>
                </section>

                <section class="vs-section">
                  <h3 class="sec-title">内存分配</h3>
                  <div class="mem-options">
                    <label class="radio-item" :class="{ active: memMode === 'global' }">
                      <input type="radio" name="mem" value="global" v-model="memMode" />
                      跟随全局设置
                    </label>
                    <label class="radio-item" :class="{ active: memMode === 'auto' }">
                      <input type="radio" name="mem" value="auto" v-model="memMode" />
                      自动配置
                    </label>
                    <label class="radio-item" :class="{ active: memMode === 'custom' }">
                      <input type="radio" name="mem" value="custom" v-model="memMode" />
                      自定义
                    </label>
                  </div>

                  <!-- 滑块（自定义模式显示） -->
                  <div v-if="memMode === 'custom'" class="slider-area">
                    <input type="range" class="mem-slider" min="512" max="16384" step="256" v-model="memCustom" />
                  </div>

                  <div v-if="memMode !== 'global'" class="form-row" style="margin-top:10px;">
                    <label>启动游戏前进行内存优化</label>
                    <select class="form-select short-select">
                      <option>跟随全局设置</option>
                      <option>开启</option>
                      <option>关闭</option>
                    </select>
                  </div>

                  <div class="mem-stats">
                    <div class="mem-stat">
                      <span class="mem-stat-label">已使用内存</span>
                      <span class="mem-stat-value">{{ usedMem }} GB / {{ totalMem }} GB</span>
                    </div>
                    <div class="mem-stat">
                      <span class="mem-stat-label">游戏分配</span>
                      <span class="mem-stat-value">{{ gameMem }} GB</span>
                    </div>
                  </div>
                </section>

                <section class="vs-section">
                  <h3 class="sec-title">服务器</h3>
                  <div class="form-row">
                    <label>登录方式</label>
                    <select class="form-select">
                      <option>正版登录或离线登录</option>
                      <option>仅正版登录</option>
                      <option>仅离线登录</option>
                    </select>
                  </div>
                  <div class="form-row">
                    <label>自动进入服务器</label>
                    <input type="text" class="form-input" placeholder="服务器地址（可选）" />
                  </div>
                </section>

                <section class="vs-section collapsible" :class="{ collapsed: !showAdvanced }">
                  <h3 class="sec-title clickable" @click="showAdvanced = !showAdvanced">
                    高级选项
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                         :style="{ transform: showAdvanced ? 'rotate(180deg)' : '' }"
                         style="transition: transform 0.2s;"><path d="M6 9l6 6 6-6"/></svg>
                  </h3>
                  <div v-show="showAdvanced" class="adv-content">
                    <div class="form-row">
                      <label>Java 虚拟机参数</label>
                      <textarea class="form-textarea" rows="2" placeholder="跟随全局设置"></textarea>
                    </div>
                    <div class="form-row">
                      <label>游戏参数</label>
                      <input type="text" class="form-input" placeholder="跟随全局设置" />
                    </div>
                    <div class="form-row">
                      <label>内存管理</label>
                      <select class="form-select">
                        <option>跟随全局设置</option>
                        <option>G1GC</option>
                        <option>ZGC</option>
                        <option>Parallel GC</option>
                      </select>
                    </div>
                    <div class="form-row">
                      <label>启动前执行命令</label>
                      <input type="text" class="form-input" placeholder="" />
                    </div>
                    <div class="checkbox-group">
                      <label class="checkbox-label"><input type="checkbox" /> 禁止更新 Mod</label>
                      <label class="checkbox-label"><input type="checkbox" /> 忽略 Java 兼容性警告</label>
                      <label class="checkbox-label"><input type="checkbox" /> 关闭文件校验</label>
                      <label class="checkbox-label"><input type="checkbox" /> 禁用 Java Launch Wrapper</label>
                      <label class="checkbox-label"><input type="checkbox" /> 禁用 LWJGL Unsafe Agent</label>
                      <label class="checkbox-label"><input type="checkbox" v-model="useHighPerformanceGPU" /> 使用高性能显卡</label>
                    </div>
                  </div>
                </section>

                <!-- 底部按钮 -->
                <button class="btn-global-settings" @click="$router.push('/settings')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  全局设置
                </button>
              </template>

              <!-- ===== Mod 管理 ===== -->
              <template v-if="activeTab === 'mods'">
                <!-- 搜索栏 -->
                <div class="mod-search-card">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input type="text" class="mod-search-input" placeholder="搜索 Mod 名称 / 描述 / 标签" v-model="modSearchText" />
                </div>

                <!-- 操作按钮栏 -->
                <div class="mod-toolbar">
                  <button class="form-action-btn primary-outline">打开文件夹</button>
                  <button class="form-action-btn">从文件安装</button>
                  <button class="form-action-btn">下载新 Mod</button>
                  <button class="form-action-btn">全选</button>
                </div>

                <!-- 分类筛选 -->
                <div class="mod-tabs">
                  <button
                    v-for="tab in modFilterTabs"
                    :key="tab.key"
                    class="mod-tab"
                    :class="{ active: modFilter === tab.key }"
                    @click="modFilter = tab.key"
                  >{{ tab.label }} <span class="mod-tab-count">({{ tab.count }})</span></button>
                </div>

                <!-- Mod 列表卡片 -->
                <div class="vs-section mod-list-section">
                  <div v-if="filteredMods.length" class="mod-list-new">
                    <div v-for="mod in filteredMods" :key="mod.name" class="mod-item-new" @mouseenter="mod.hovered = true" @mouseleave="mod.hovered = false">
                      <img :src="mod.icon" class="mod-icon-img" alt="" @error="(e: Event) => (e.target as HTMLImageElement).src = ''" />
                      <div class="mod-info-main">
                        <div class="mod-name-row">
                          <span class="mod-name-text">{{ mod.name }}</span>
                          <span class="mod-ver-text">{{ mod.version }}</span>
                          <a v-if="mod.link" href="#" class="mod-link-icon" title="来源">⛓</a>
                        </div>
                        <p class="mod-desc-text">
                          <span v-if="mod.category" class="mod-tag">{{ mod.category }}</span>
                          {{ mod.description }}
                        </p>
                      </div>
                      <div class="mod-actions-hover" :class="{ visible: mod.hovered }">
                        <button class="mod-action-icon" title="信息">ℹ️</button>
                        <button class="mod-action-icon" title="打开文件夹">📁</button>
                        <button class="mod-action-icon danger" title="移除" @click.stop="removeMod(mod.name)">🗑</button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--pcl-text-muted)" stroke-width="1.5"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM9 17v-5l-2 2-2-2v5"/></svg>
                    <p>暂无符合条件的 Mod</p>
                  </div>
                </div>
              </template>

              <!-- ===== 导出 ===== -->
              <template v-if="activeTab === 'export'">
                <!-- 基础信息 -->
                <section class="vs-section">
                  <div class="export-header-row">
                    <div class="form-row compact">
                      <label>整合包名称</label>
                      <input type="text" class="form-input" value="1.20.1-Fabric 0.16.9-OptiFine_I6" />
                    </div>
                    <div class="form-row compact">
                      <label>整合包版本</label>
                      <input type="text" class="form-input short" value="1.0.0" style="flex:0 0 120px;" />
                    </div>
                  </div>
                </section>

                <!-- 导出内容列表 -->
                <section class="vs-section export-list-section">
                  <h3 class="sec-title">导出内容列表</h3>
                  <div class="export-tree">
                    <!-- 游戏本体 -->
                    <div class="tree-node">
                      <label class="tree-checkbox"><input type="checkbox" checked /><span class="tree-label-bold">游戏本体</span><span class="tree-sub">正版版 1.20.1 Fabric 0.16.9</span></label>
                    </div>
                    <!-- Mod 组 -->
                    <div class="tree-node tree-parent">
                      <label class="tree-checkbox"><input type="checkbox" checked /><span class="tree-label-bold">Mod</span><span class="tree-sub">模组</span></label>
                      <div class="tree-children">
                        <div class="tree-child"><label class="tree-checkbox"><input type="checkbox" /><span>已禁用的 Mod</span></label></div>
                        <div class="tree-child"><label class="tree-checkbox"><input type="checkbox" checked /><span>Mod 设置</span></label></div>
                        <div class="tree-child"><label class="tree-checkbox"><input type="checkbox" /><span>已绘制的地图</span><span class="tree-sub">地图类 Mod 为现有的存档、服务器记录的地图、路标等</span></label></div>
                      </div>
                    </div>
                    <!-- 资源包组 -->
                    <div class="tree-node tree-parent">
                      <label class="tree-checkbox"><input type="checkbox" checked /><span class="tree-label-bold">资源包</span><span class="tree-sub">纹理包/材质包</span></label>
                      <div class="tree-children">
                        <div class="tree-child"><label class="tree-checkbox"><input type="checkbox" checked /><span>Minecraft-Mod-Language-Modpack-Converted-1.20.1.zip</span></label></div>
                        <div class="tree-child"><label class="tree-checkbox"><input type="checkbox" checked /><span>[1.20.1]MASA全家桶汉化包.zip</span></label></div>
                      </div>
                    </div>
                    <!-- 光影包组 -->
                    <div class="tree-node tree-parent">
                      <label class="tree-checkbox"><input type="checkbox" checked /><span class="tree-label-bold">光影包</span></label>
                      <div class="tree-children">
                        <div class="tree-child"><label class="tree-checkbox"><input type="checkbox" checked /><span>assets</span><span class="tree-sub">schematics 文件夹</span></label></div>
                      </div>
                    </div>
                    <!-- 其他可选项 -->
                    <div class="tree-node">
                      <label class="tree-checkbox"><input type="checkbox" /><span>导出的结构</span><span class="tree-sub">schematics 文件夹</span></label>
                    </div>
                    <div class="tree-node">
                      <label class="tree-checkbox"><input type="checkbox" /><span>录像回放</span><span class="tree-sub">Replay Mod 的录像文件</span></label>
                    </div>
                    <div class="tree-node">
                      <label class="tree-checkbox"><input type="checkbox" /><span>单人游戏存档</span><span class="tree-sub">世界/地图</span></label>
                    </div>
                    <div class="tree-node">
                      <label class="tree-checkbox"><input type="checkbox" checked /><span>PCL 启动器程序</span><span class="tree-sub">打包正版版 PCL，以便没有启动器的玩家安装整合包</span></label>
                    </div>
                    <div class="tree-node">
                      <label class="tree-checkbox"><input type="checkbox" checked /><span>PCL 个性化内容</span><span class="tree-sub">功能隐藏设置、主页、背景音乐和图片等</span></label>
                    </div>
                  </div>
                </section>

                <!-- 高级选项（可折叠） -->
                <section class="vs-section collapsible" :class="{ collapsed: !showExportAdvanced }">
                  <h3 class="sec-title clickable" @click="showExportAdvanced = !showExportAdvanced">
                    高级选项
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                         :style="{ transform: showExportAdvanced ? 'rotate(180deg)' : '' }"
                         style="transition: transform 0.2s;"><path d="M6 9l6 6 6-6"/></svg>
                  </h3>
                  <div v-show="showExportAdvanced" class="adv-content">
                    <label class="checkbox-label block"><input type="checkbox" /> 打包资源文件，以避免在导入时下载</label>
                    <label class="checkbox-label block"><input type="checkbox" /> 仅从 Modrinth 下载资源文件</label>
                    <div class="export-tip-box">
                      配置文件中含有更多高级选项，例如精准控制导出的文件、设置整合包存放位置等。<br/>
                      要修改这些选项，请先点击「保存配置」，在编辑配置文件后再导入。
                    </div>
                  </div>
                </section>

                <!-- 操作按钮 -->
                <div class="export-actions">
                  <button class="form-action-btn outline">读取配置</button>
                  <button class="form-action-btn outline">保存配置</button>
                  <button class="form-action-btn outline">整合包制作指南</button>
                </div>

                <!-- 底部大按钮 -->
                <div class="export-bottom-btn-wrap">
                  <button class="btn-export-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    开始导出
                  </button>
                </div>
              </template>
            </main>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  versionName: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
}>()

const activeTab = ref('overview')

const versionBase = computed(() => {
  const match = props.versionName.match(/^(\d+\.\d+(\.\d+)?)/)
  return match ? match[1] : props.versionName
})

const loaderInfo = computed(() => {
  const parts = props.versionName.split('-')
  return parts.length > 1 ? parts.slice(1).join('-') : ''
})

// 示例数据
const playerName = ref('Steve')
const playerUuid = ref('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')

// 设置页状态
const showTip = ref(true)
const showAdvanced = ref(false)
const memMode = ref<'global' | 'auto' | 'custom'>('global')
const memCustom = ref('4096')
const usedMem = ref('12.6')
const totalMem = ref('15.4')
const gameMem = ref('2.8')
const useHighPerformanceGPU = ref(false)

// Mod 管理数据
const modSearchText = ref('')
const modFilter = ref('all')
const modFilterTabs = [
  { key: 'all', label: '全部', count: 120 },
  { key: 'enabled', label: '启用', count: 119 },
  { key: 'disabled', label: '禁用', count: 1 },
  { key: 'updatable', label: '可更新', count: 77 },
]

const installedMods = ref([
  { name: 'Debugify', version: '1.20.1+2.0', category: '实用', description: '性能优化 | [bug修复] Debugify-1.20.1+2.0: Fixes Minecraft bugs found on the bug tracker', icon: '', link: true, hovered: false },
  { name: 'Cloth Config API', version: '11.1.118', category: '支持库', description: '[cloth前置] cloth-config-11.1.118-fabric: Configuration Library for Minecraft Mods', icon: '', link: false, hovered: false },
  { name: '方块实体优化', version: '0.9+1.20', category: '实用', description: '性能优化 | [EBE实体方块优化] enhancedblockentities-0.9+1.20: Reduce block entity FPS lag with almost no com...', icon: '', link: false, hovered: false },
  { name: '实体模型特性', version: '1.2.1', category: '生物', description: '实用 | [EMF 实体模型支持] entity_model_features_fabric_1.20.1-1.2.1: EMF is an OptiFine format, Custom Entity...', icon: '', link: false, hovered: false },
  { name: '实体纹理特性', version: '5.1.2', category: '实用', description: '实用 | [ETF模型支持] entity_texture_features_fabric_1.20.1-5.1.2: Emissive, Random & Custo...', icon: '', link: false, hovered: false },
  { name: '铁氧体芯蕊', version: '6.0.1', category: '性能', description: '性能优化 | (FC) 铁氧体芯蕊Ferritecore-6.0.1-fabric: Memory usage optimizations', icon: '', link: false, hovered: false },
  { name: 'Forge Config API Port', version: 'v8.0.0', category: '支持库', description: '支持库 | Forge的clofn前置 | ForgeConfigAPIPort-v8.0.0-1.20.1-Fabric: NeoForge s & Forge s config systems provided...', icon: '', link: false, hovered: false },
  { name: 'Puzzles Lib', version: 'v8.1.11', category: '支持库', description: '支持库 | PuzzlesLib前置 | PuzzlesLib-v8.1.11-1.20.1-Fabric: Why it s called Puzzles, you ask? That s the puzzle!', icon: '', link: false, hovered: false },
  { name: '伽玛工具', version: '17.16', category: 'UI工具', description: '实用 | [Gamma调整] Gamma-Utils-1.7.16-mc1.20.1: Gamma / Brightness / Night Vision mod, making it easy to see in...', icon: '', link: false, hovered: false },
  { name: 'Exordium', version: '1.20.1', category: '性能', description: '性能能化 | [GUI渲染优化] exordium-fabric-1.2.1-mc1.20.1: Render the GUI and screens at a lower framerate to speed...', icon: '', link: false, hovered: false },
  { name: '游戏内账号切换', version: '8.0.2', category: '实用', description: '实用 | [AIS) 游戏内账号切换|In-Game Account Switcher-Fabric-1.20-8.0.2: This mod allows you to change your logged in...', icon: '', link: false, hovered: false },
  { name: 'JEI 物品管理器', version: '15.2.0.27', category: '工具', description: '支持库 | [JE]物品管理器| jei-1.20.1-fabric-15.2.0.27: View Items and Recipes', icon: '', link: false, hovered: false },
])

// 导出页状态
const showExportAdvanced = ref(false)

// 计算属性：过滤后的 Mod 列表
const filteredMods = computed(() => {
  let list = installedMods.value
  if (modFilter.value === 'enabled') {
    // 演示用：除了第一个都算启用
    list = list.slice(1)
  } else if (modFilter.value === 'disabled') {
    list = [list[0]]
  }
  if (modSearchText.value.trim()) {
    const kw = modSearchText.value.toLowerCase()
    list = list.filter(m => m.name.toLowerCase().includes(kw) || m.description.toLowerCase().includes(kw))
  }
  return list
})

function close() {
  emit('update:visible', false)
}

function minimize() {
  // Electron 最小化窗口逻辑
}

function removeMod(name: string) {
  installedMods.value = installedMods.value.filter(m => m.name !== name)
}

const navItems = [
  {
    id: 'overview',
    label: '概览',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>',
  },
  {
    id: 'settings',
    label: '设置',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  },
  {
    id: 'mods',
    label: 'Mod 管理',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
  },
  {
    id: 'export',
    label: '导出',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  },
]
</script>

<style scoped lang="scss">
/* ====== PCL2 变量（本地定义，Teleport 到 body 后脱离 .mcla-app 作用域）====== */
.ver-settings-overlay {
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
  --pcl-orange: #FB8C00;
}

/* ---- 遮罩层 ---- */
.ver-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* ---- 窗口容器 ---- */
.ver-settings-window {
  width: 800px;
  max-width: 90vw;
  height: 560px;
  max-height: 85vh;
  background: var(--pcl-bg);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* ---- 主体布局 ---- */
.vs-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ---- 左侧导航 ---- */
.vs-nav {
  width: 160px;
  background: var(--pcl-surface);
  border-right: 1px solid var(--pcl-border);
  padding: 10px 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vs-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 18px;
  border: none;
  background: transparent;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--pcl-text-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
  position: relative;

  > span { flex-shrink: 0; display: flex; color: var(--pcl-text-muted); }

  &:hover {
    color: var(--pcl-blue);
    background: var(--pcl-blue-light);
    > span { color: var(--pcl-blue); }
  }

  &.active {
    color: var(--pcl-blue);
    font-weight: 650;
    background: linear-gradient(to right, var(--pcl-blue-light), transparent);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      bottom: 4px;
      width: 3px;
      background: var(--pcl-blue);
      border-radius: 0 2px 2px 0;
    }

    > span { color: var(--pcl-blue); }
  }
}

/* ---- 右侧内容区 ---- */
.vs-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  background: var(--pcl-bg);

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
}

/* ---- 版本信息卡片 ---- */
.ver-info-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--pcl-surface);
  border-radius: 8px;
  border: 1px solid var(--pcl-border-light);
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  margin-bottom: 14px;

  .ver-icon {
    width: 44px; height: 44px;
    border-radius: 8px;
    background: var(--pcl-blue-light);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .ver-detail {
    .ver-full-name { margin: 0; font-size: 15px; font-weight: 700; color: var(--pcl-text); }
    .ver-sub   { margin: 3px 0 0; font-size: 12px; color: var(--pcl-text-muted); }
  }
}

/* ---- 区块（PCL2 风格：每个区块独立白底卡片）---- */
.vs-section {
  background: var(--pcl-surface);
  border-radius: 8px;
  border: 1px solid var(--pcl-border-light);
  padding: 16px 18px;
  margin-bottom: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);

  .sec-title {
    margin: 0 0 12px;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--pcl-text);
  }

  .desc-text {
    font-size: 12.5px;
    color: var(--pcl-text-secondary);
    line-height: 1.55;
    margin: 0 0 12px;
  }

  /* 区块内的按钮组不需要额外上边距 */
  .form-btns { margin-top: 4px; }
}

/* ---- 表单行 ---- */
.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  > label {
    min-width: 70px;
    font-size: 13px;
    font-weight: 500;
    color: var(--pcl-text-secondary);
  }
}

.form-select,
.form-input {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid var(--pcl-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--pcl-text);
  background: #fff;
  outline: none;
  transition: border-color 0.14s;

  &:focus { border-color: var(--pcl-blue); box-shadow: 0 0 0 3px rgba(21,101,192,0.08); }
  &.short { flex: 0 0 80px; }
  &.mono { font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; }
}

.form-textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid var(--pcl-border);
  border-radius: 6px;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--pcl-text);
  background: #fff;
  outline: none;
  resize: vertical;
  min-height: 60px;
  transition: border-color 0.14s;

  &:focus { border-color: var(--pcl-blue); box-shadow: 0 0 0 3px rgba(21,101,192,0.08); }
}

.input-with-btn {
  display: flex;
  gap: 8px;
  flex: 1;
  .form-input { flex: 1; }
}

.uuid-row {
  display: flex;
  gap: 8px;
  flex: 1;
  .form-input { flex: 1; }
}

.browse-btn {
  padding: 8px 16px;
  border: 1.5px solid var(--pcl-border);
  border-radius: 6px;
  background: #fff;
  font-size: 12.5px;
  color: var(--pcl-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.13s;
  flex-shrink: 0;

  &:hover { border-color: var(--pcl-blue); color: var(--pcl-blue); }
  &.small { padding: 8px 12px; }
}

/* ---- 复选框标签 ---- */
.checkbox-label {
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: normal;
  color: var(--pcl-text);
  min-width: auto !important;
  cursor: pointer;
  margin-right: 16px;
  margin-bottom: 6px;

  input[type="checkbox"] {
    width: 15px;
    height: 15px;
    accent-color: var(--pcl-blue);
    cursor: pointer;
  }
}

.export-options {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

/* ---- 操作按钮组 ---- */
.form-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

/* 独立按钮组（不在 .vs-section 内时，也用卡片底框）*/
.vs-content > .form-btns {
  background: var(--pcl-surface);
  border-radius: 8px;
  border: 1px solid var(--pcl-border-light);
  padding: 14px 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.form-action-btn {
  padding: 8px 18px;
  border: 1.5px solid var(--pcl-border);
  border-radius: 6px;
  background: #fff;
  font-size: 12.5px;
  color: var(--pcl-text-secondary);
  cursor: pointer;
  transition: all 0.13s;

  &:hover { border-color: var(--pcl-blue); color: var(--pcl-blue); }

  &.primary {
    background: var(--pcl-blue);
    border-color: var(--pcl-blue);
    color: #fff;
    &:hover { background: var(--pcl-blue-hover); border-color: var(--pcl-blue-hover); }
  }

  &.outline {
    &:hover { border-color: var(--pcl-blue); color: var(--pcl-blue); background: var(--pcl-blue-light); }
  }

  &.danger {
    border-color: var(--pcl-red);
    color: var(--pcl-red);
    &:hover { background: var(--pcl-red); color: #fff; }
  }
}

/* ---- 内存/分辨率输入组 ---- */
.memory-inputs,
.resolution-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.memory-sep {
  font-size: 12.5px;
  color: var(--pcl-text-muted);
  user-select: none;
}

/* ---- Mod 列表 ---- */
.mod-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mod-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--pcl-surface);
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.12s;

  &:hover { border-color: var(--pcl-border); }

  .mod-name { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--pcl-text); }
  .mod-ver { font-size: 11.5px; color: var(--pcl-text-muted); }

  .mod-remove {
    padding: 4px 12px;
    border: 1px solid var(--pcl-border);
    border-radius: 4px;
    background: #fff;
    font-size: 11.5px;
    color: var(--pcl-text-secondary);
    cursor: pointer;
    opacity: 0;
    transition: all 0.12s;

    &:hover { border-color: var(--pcl-red); color: var(--pcl-red); }
  }

  &:hover .mod-remove { opacity: 1; }
}

.empty-state {
  text-align: center;
  padding: 36px 0;
  color: var(--pcl-text-muted);

  p { margin: 10px 0 0; font-size: 13.5px; }
  svg { opacity: 0.35; }
}

/* ---- 动画 ---- */
.modal-fade-enter-active { transition: opacity 0.18s ease; }
.modal-fade-leave-active { transition: opacity 0.12s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

.modal-fade-enter-active .ver-settings-window {
  transition: transform 0.2s ease, opacity 0.18s ease;
}
.modal-fade-enter-from .ver-settings-window {
  transform: scale(0.96) translateY(10px);
  opacity: 0;
}

/* ====== 设置页专用样式 ====== */

/* 提示条 */
.vs-tip-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--pcl-blue-light);
  border-radius: 7px;
  font-size: 12px;
  color: var(--pcl-blue-dark);
  margin-bottom: 14px;

  svg { flex-shrink: 0; opacity: 0.7; }

  .tip-close {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 16px;
    color: var(--pcl-blue);
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    &:hover { opacity: 0.6; }
  }
}

/* 内存选项 - radio 按钮组 */
.mem-options {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
}

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
  color: var(--pcl-text-secondary);

  input { accent-color: var(--pcl-blue); }

  &.active {
    color: var(--pcl-blue);
    font-weight: 600;
  }
}

/* 滑块 */
.slider-area {
  padding: 8px 4px;
}

.mem-slider {
  width: 100%;
  height: 4px;
  accent-color: var(--pcl-blue);
  cursor: pointer;
}

/* 内存统计 */
.mem-stats {
  display: flex;
  justify-content: space-between;
  border-top: 2px solid var(--pcl-blue-light);
  padding-top: 8px;
  margin-top: 10px;
}

.mem-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .mem-stat-label { font-size: 11px; color: var(--pcl-text-muted); }
  .mem-stat-value { font-size: 14px; font-weight: 700; color: var(--pcl-text); }
}

/* 可折叠区块 */
.collapsed {
  .sec-title.clickable { margin-bottom: 0; }
  .adv-content { display: none; }
}

.sec-title.clickable {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;

  &:hover { color: var(--pcl-blue); }
  svg { flex-shrink: 0; }
}

.adv-content {
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* checkbox 组 */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.checkbox-label.block {
  display: flex !important;
  width: 100%;
  margin-right: 0;
  margin-bottom: 0;
  padding: 3px 0;
}

.short-select {
  flex: 0 0 auto !important;
  min-width: 160px;
}

/* 全局设置按钮 */
.btn-global-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 11px 0;
  margin-top: 8px;
  background: var(--pcl-blue);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: var(--pcl-blue-hover); }
}

/* ====== Mod 管理页专用样式 ====== */

/* 搜索栏 */
.mod-search-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: var(--pcl-surface);
  border: 1.5px solid var(--pcl-border);
  border-radius: 8px;
  margin-bottom: 10px;

  svg { flex-shrink: 0; }

  .mod-search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 13px;
    color: var(--pcl-text);
    background: transparent;

    &::placeholder { color: var(--pcl-text-muted); }
  }
}

/* 工具栏 */
.mod-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.form-action-btn.primary-outline {
  border-color: var(--pcl-blue);
  color: var(--pcl-blue);
  &:hover { background: var(--pcl-blue-light); }
}

/* 筛选标签 */
.mod-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.mod-tab {
  padding: 5px 12px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--pcl-text-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.13s;

  &.active {
    background: var(--pcl-blue);
    color: #fff;
    font-weight: 600;
  }

  &:hover:not(.active) { background: rgba(21,101,192,0.08); color: var(--pcl-blue); }

  .mod-tab-count { font-weight: 400; opacity: 0.75; }
}

/* 新版 Mod 列表 */
.mod-list-section { padding: 12px 16px !important; }

.mod-list-new {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mod-item-new {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 6px;
  transition: background 0.12s;
  position: relative;

  &:hover { background: var(--pcl-blue-light); }
}

.mod-icon-img {
  width: 32px; height: 32px;
  border-radius: 5px;
  object-fit: cover;
  flex-shrink: 0;
  background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
}

.mod-info-main {
  flex: 1;
  min-width: 0;
}

.mod-name-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.mod-name-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--pcl-text);
}

.mod-ver-text {
  font-size: 11px;
  color: var(--pcl-text-muted);
  white-space: nowrap;
}

.mod-link-icon {
  font-size: 11px;
  text-decoration: none;
  opacity: 0.5;
  &:hover { opacity: 1; }
}

.mod-desc-text {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: var(--pcl-text-secondary);
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mod-tag {
  display: inline-block;
  padding: 0 5px;
  font-size: 10.5px;
  color: var(--pcl-orange);
  background: rgba(251,140,0,0.08);
  border-radius: 3px;
  margin-right: 4px;
  vertical-align: middle;
}

/* hover 操作图标 */
.mod-actions-hover {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;

  &.visible { opacity: 1; }
}

.mod-action-icon {
  width: 26px; height: 26px;
  border: none;
  background: transparent;
  border-radius: 5px;
  font-size: 13px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;

  &:hover { background: rgba(0,0,0,0.06); }
  &.danger:hover { background: rgba(229,57,53,0.1); }
}

/* ====== 导出页专用样式 ====== */

.export-header-row {
  display: flex;
  gap: 24px;

  .form-row.compact {
    flex: 1;
    > label { min-width: 70px; }
  }
}

.export-list-section { padding: 16px 18px !important; }

/* 导出树 */
.export-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tree-node {
  padding: 5px 0;
}

.tree-parent {
  padding-bottom: 2px;
}

.tree-children {
  padding-left: 22px;
  margin-top: 2px;
}

.tree-child {
  padding: 3px 0;
}

.tree-checkbox {
  display: flex;
  align-items: baseline;
  gap: 6px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--pcl-text);

  input[type="checkbox"] {
    width: 14px; height: 14px;
    accent-color: var(--pcl-blue);
    cursor: pointer;
  }

  .tree-label-bold { font-weight: 600; }
  .tree-sub {
    font-size: 11px;
    color: var(--pcl-text-muted);
    margin-left: 4px;
  }
}

/* 导出操作区 */
.export-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.export-tip-box {
  margin-top: 10px;
  padding: 10px 12px;
  background: #E3F2FD;
  border-radius: 6px;
  font-size: 11.5px;
  color: var(--pcl-blue-dark);
  line-height: 1.55;
}

/* 底部大按钮 */
.export-bottom-btn-wrap {
  display: flex;
  justify-content: center;
  padding: 18px 0 4px;
}

.btn-export-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 36px;
  background: var(--pcl-blue);
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(21,101,192,0.3);
  transition: all 0.16s;

  &:hover {
    background: var(--pcl-blue-hover);
    box-shadow: 0 4px 16px rgba(21,101,192,0.4);
    transform: translateY(-1px);
  }
}
</style>
