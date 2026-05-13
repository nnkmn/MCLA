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
                    <button class="form-action-btn" @click="editVersionName">修改版本名</button>
                    <button class="form-action-btn" @click="editVersionDescription">修改版本描述</button>
                    <button class="form-action-btn" :class="{ active: isFavorited }" @click="toggleFavorite">
                      {{ isFavorited ? '★ 已收藏' : '☆ 加入收藏夹' }}
                    </button>
                  </div>
                </section>

                <!-- 快捷方式 -->
                <section class="vs-section">
                  <h3 class="sec-title">快捷方式</h3>
                  <div class="form-btns">
                    <button class="form-action-btn" @click="openFolder('')">版本文件夹</button>
                    <button class="form-action-btn" @click="openFolder('saves')">存档文件夹</button>
                    <button class="form-action-btn" @click="openFolder('mods')">Mod 文件夹</button>
                  </div>
                </section>

                <!-- 高级管理 -->
                <section class="vs-section">
                  <h3 class="sec-title">高级管理</h3>
                  <div class="form-btns">
                    <button class="form-action-btn outline" @click="exportScript">导出启动脚本</button>
                    <button class="form-action-btn outline" @click="completeFiles">补全文件</button>
                    <button class="form-action-btn danger" @click="deleteVersion">删除版本</button>
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
                <ModManager :gameDir="gameDir" />
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

    <!-- 补全文件弹窗 -->
    <transition name="modal-fade">
      <div v-if="showCompleteModal" class="ver-settings-overlay" @click.self="showCompleteModal = false">
        <div class="ver-settings-window" style="width:520px;">
          <header class="vs-header">
            <button class="vs-back" @click="showCompleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="vs-title">补全文件</span>
            <div class="vs-wc">
              <button class="vs-wc-btn vs-close" @click="showCompleteModal = false">
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg>
              </button>
            </div>
          </header>

          <div class="vs-body" style="padding:20px;max-height:70vh;overflow-y:auto;">

            <!-- 检测中 -->
            <div v-if="completeState === 'checking'" class="complete-status checking">
              <div class="complete-spinner"></div>
              <p class="complete-status-text">正在检测缺失文件...</p>
              <p class="complete-status-sub">{{ completeTarget }}</p>
            </div>

            <!-- 检测完成：文件完整 -->
            <div v-else-if="completeState === 'complete'" class="complete-status success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              <p class="complete-status-text">所有文件完整，无需补全</p>
              <p class="complete-status-sub">{{ completeTarget }} · 共检测 {{ completeTotal }} 个库文件</p>
            </div>

            <!-- 检测完成：有缺失 -->
            <div v-else-if="completeState === 'missing'" class="complete-status warning">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p class="complete-status-text">发现 <strong>{{ missingFiles.length }}</strong> 个缺失文件</p>
              <p class="complete-status-sub">即将从 BMCLAPI 下载补全</p>

              <!-- 缺失文件列表（仅显示前 10 个） -->
              <div v-if="missingFiles.length" class="missing-file-list">
                <div v-for="f in missingFiles.slice(0, 10)" :key="f" class="missing-file-item">
                  <span class="missing-file-dot"></span>
                  <span class="missing-file-path">{{ f }}</span>
                </div>
                <div v-if="missingFiles.length > 10" class="missing-file-more">
                  还有 {{ missingFiles.length - 10 }} 个文件...
                </div>
              </div>

              <!-- 下载按钮 -->
              <button class="form-action-btn" style="margin-top:16px;width:100%;" @click="startDownloadMissing">
                开始下载
              </button>
            </div>

            <!-- 下载中 -->
            <div v-else-if="completeState === 'downloading'" class="complete-status downloading">
              <p class="complete-status-text">正在下载缺失文件...</p>
              <p class="complete-status-sub">{{ completeTarget }}</p>
              <div class="dl-progress-wrap">
                <div class="dl-progress-bar">
                  <div class="dl-progress-fill" :style="{ width: dlProgress + '%' }"></div>
                </div>
                <p class="dl-progress-text">{{ dlCurrent }} / {{ dlTotal }}</p>
                <p class="dl-progress-file">{{ dlCurrentFile }}</p>
              </div>
            </div>

            <!-- 下载完成 -->
            <div v-else-if="completeState === 'done'" class="complete-status success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              <p class="complete-status-text">补全完成！</p>
              <p class="complete-status-sub">已补全 {{ dlTotal }} 个文件</p>
              <button class="form-action-btn" style="margin-top:16px;" @click="showCompleteModal = false">完成</button>
            </div>

            <!-- 错误 -->
            <div v-else-if="completeState === 'error'" class="complete-status error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <p class="complete-status-text">补全失败</p>
              <p class="complete-status-sub" style="color:#ef4444;">{{ completeError }}</p>
              <button class="form-action-btn" style="margin-top:16px;" @click="completeFiles">重试</button>
            </div>

          </div>
        </div>
      </div>
    </transition>

    <!-- 输入弹窗 -->
    <transition name="modal-fade">
      <div v-if="showInputModal" class="ver-settings-overlay" @click.self="cancelInputModal">
        <div class="ver-settings-window input-modal-win">
          <header class="vs-header">
            <button class="vs-back" @click="cancelInputModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="vs-title">{{ inputModalTitle }}</span>
            <div class="vs-wc">
              <button class="vs-wc-btn vs-close" @click="cancelInputModal">
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg>
              </button>
            </div>
          </header>
          <div class="vs-body" style="padding:20px;flex-direction:column;gap:12px;">
            <input
              v-if="!inputModalMultiline"
              v-model="inputModalValue"
              type="text"
              class="form-input"
              :placeholder="inputModalPlaceholder"
              @keydown.enter="confirmInputModal"
              @keydown.esc="cancelInputModal"
              style="width:100%;"
            />
            <textarea
              v-else
              v-model="inputModalValue"
              class="form-textarea"
              :placeholder="inputModalPlaceholder"
              rows="4"
              style="width:100%;resize:vertical;min-height:80px;"
              @keydown.esc="cancelInputModal"
            />
            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <button class="form-action-btn" @click="cancelInputModal">取消</button>
              <button class="form-action-btn primary" @click="confirmInputModal">确定</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ModManager from './ModManager.vue'

const props = defineProps<{
  visible: boolean
  versionName: string
  gameDir: string
  instanceId: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'version-deleted'): void
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
const isFavorited = ref(false)

// 输入弹窗状态
const showInputModal = ref(false)
const inputModalTitle = ref('')
const inputModalValue = ref('')
const inputModalPlaceholder = ref('')
const inputModalMultiline = ref(false)
let inputModalResolve: ((value: string | null) => void) | null = null

function openInputModal(title: string, value: string, placeholder: string, multiline = false): Promise<string | null> {
  return new Promise((resolve) => {
    inputModalTitle.value = title
    inputModalValue.value = value
    inputModalPlaceholder.value = placeholder
    inputModalMultiline.value = multiline
    inputModalResolve = resolve
    showInputModal.value = true
  })
}

function confirmInputModal() {
  inputModalResolve?.(inputModalValue.value)
  showInputModal.value = false
}

function cancelInputModal() {
  inputModalResolve?.(null)
  showInputModal.value = false
}

// ====== 快捷方式：打开文件夹 ======
// 始终从主进程获取 .minecraft 根目录（尊重自定义路径设置）
async function resolveMinecraftRoot(): Promise<string> {
  const api = window.electronAPI
  if (!api?.path) {
    // 兜底：从 gameDir 推导
    const parts = props.gameDir.split(/[\\/]/)
    const idx = parts.indexOf('.minecraft')
    return idx >= 0 ? parts.slice(0, idx + 1).join('/') : props.gameDir
  }
  const custom = await api.path.getCustom()
  if (custom) return custom
  return await api.path.getMinecraft()
}

async function openFolder(subPath: string) {
  const api = window.electronAPI
  if (!api?.shell) return

  const mcRoot = await resolveMinecraftRoot()

  if (!subPath) {
    // 版本文件夹：打开 versions/<版本名>
    const versionFolderName = props.gameDir.split(/[\\/]/).pop() || ''
    const target = `${mcRoot}/versions/${versionFolderName}`
    await api.shell.openPath(target)
    return
  }

  // saves / mods：优先打开版本隔离目录，不存在则回退全局
  if (subPath === 'saves' || subPath === 'mods') {
    const versionFolderName = props.gameDir.split(/[\\/]/).pop() || ''
    const isolated = `${mcRoot}/versions/${versionFolderName}/${subPath}`
    const isolatedExists = await api.path.exists(isolated)
    if (isolatedExists) {
      await api.shell.openPath(isolated)
      return
    }
    // 回退全局目录
    const globalTarget = `${mcRoot}/${subPath}`
    await api.shell.openPath(globalTarget)
    return
  }

  // 其他路径（如果有）直接拼全局
  const target = `${mcRoot}/${subPath}`
  await api.shell.openPath(target)
}

// ====== 个性化 ======
async function editVersionName() {
  const newName = await openInputModal('修改版本名称', props.versionName, '输入新名称')
  if (!newName || newName === props.versionName) return
  await window.electronAPI?.instance.updateName(props.instanceId, newName)
  emit('update:visible', false)
}

async function editVersionDescription() {
  const newDesc = await openInputModal('修改版本描述', '', '输入描述（支持多行）', true)
  if (newDesc === null) return
  await window.electronAPI?.instance.updateDescription(props.instanceId, newDesc)
}

async function toggleFavorite() {
  if (!props.instanceId) return
  isFavorited.value = !isFavorited.value
  await window.electronAPI?.instance.toggleFavorite(props.instanceId)
}

// ====== 导出启动脚本 ======
async function exportScript() {
  const name = props.versionName.replace(/[^a-zA-Z0-9_\-]/g, '_')
  const script = [
    '@echo off',
    `title ${props.versionName}`,
    'cd /d "%~dp0"',
    `start javaw -jar "${name}.jar"`,
  ].join('\r\n')

  const blob = new Blob([script], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.bat`
  a.click()
  URL.revokeObjectURL(url)
}

// ====== 删除版本 ======
async function deleteVersion() {
  if (!props.instanceId) return
  if (!confirm(`确定要删除版本「${props.versionName}」吗？\n这将删除版本文件夹及其所有文件，无法恢复！`)) return
  if (!confirm('再次确认：此操作不可逆！')) return
  await window.electronAPI?.instance.delete(props.instanceId, true)
  emit('version-deleted')
}

// 设置页状态
const showTip = ref(true)
const showAdvanced = ref(false)
const memMode = ref<'global' | 'auto' | 'custom'>('global')
const memCustom = ref('4096')
const usedMem = ref('12.6')
const totalMem = ref('15.4')
const gameMem = ref('2.8')
const useHighPerformanceGPU = ref(false)

// 导出页状态
const showExportAdvanced = ref(false)

// ===== 补全文件 =====
type CompleteState = 'idle' | 'checking' | 'complete' | 'missing' | 'downloading' | 'done' | 'error'

const showCompleteModal = ref(false)
const completeState = ref<CompleteState>('idle')
const completeError = ref('')
const completeTarget = ref('')
const completeTotal = ref(0)
const missingFiles = ref<string[]>([])
const dlProgress = ref(0)
const dlCurrent = ref(0)
const dlTotal = ref(0)
const dlCurrentFile = ref('')
let dlProgressUnsubscribe: (() => void) | null = null

async function completeFiles() {
  // 从 gameDir 提取版本 ID（gameDir 格式: .../.minecraft/versions/1.20.1-Fabric）
  const parts = props.gameDir.split(/[/\\]/)
  const versionsIdx = parts.findIndex(p => p === 'versions')
  const versionId = versionsIdx >= 0 ? parts[versionsIdx + 1] : props.versionName
  // 找到 .minecraft 目录
  const mcIdx = parts.findIndex(p => p === '.minecraft')
  const gameDir = mcIdx >= 0 ? parts.slice(0, mcIdx + 1).join('/') : props.gameDir.replace(/[/\\][^/\\]+$/, '')

  showCompleteModal.value = true
  completeState.value = 'checking'
  completeError.value = ''
  completeTarget.value = versionId
  missingFiles.value = []

  // 监听下载进度
  dlProgressUnsubscribe = window.electronAPI?.versions.onDownloadProgress?.((data) => {
    if (data.versionId !== versionId) return
    dlCurrent.value = data.current
    dlTotal.value = data.total
    dlProgress.value = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0
    dlCurrentFile.value = data.file
  })

  try {
    const result = await window.electronAPI?.versions.validate(versionId, gameDir)
    if (!result?.ok) {
      completeState.value = 'error'
      completeError.value = result?.error || '检测失败'
      return
    }

    const { missing, total } = result.data
    completeTotal.value = total
    missingFiles.value = missing

    if (!missing.length) {
      completeState.value = 'complete'
    } else {
      completeState.value = 'missing'
    }
  } catch (e: any) {
    completeState.value = 'error'
    completeError.value = e.message
  }
}

async function startDownloadMissing() {
  const parts = props.gameDir.split(/[/\\]/)
  const versionsIdx = parts.findIndex(p => p === 'versions')
  const versionId = versionsIdx >= 0 ? parts[versionsIdx + 1] : props.versionName
  const mcIdx = parts.findIndex(p => p === '.minecraft')
  const gameDir = mcIdx >= 0 ? parts.slice(0, mcIdx + 1).join('/') : props.gameDir.replace(/[/\\][^/\\]+$/, '')

  dlCurrent.value = 0
  dlTotal.value = missingFiles.value.length || 1
  dlProgress.value = 0
  completeState.value = 'downloading'

  try {
    const result = await window.electronAPI?.versions.downloadMissing(versionId, gameDir)
    if (result?.ok) {
      dlTotal.value = result.data.downloaded
      completeState.value = 'done'
    } else {
      completeState.value = 'error'
      completeError.value = result?.error || '下载失败'
    }
  } catch (e: any) {
    completeState.value = 'error'
    completeError.value = e.message
  }
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
/* ====== MCLA Design System ====== */

/* ---- 遮罩层 ---- */
.ver-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
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
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-xl);
  border: 1px solid var(--mcla-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--mcla-shadow-xl);
}

/* ---- 标题栏 ---- */
.vs-header {
  height: 42px;
  background: var(--mcla-bg-secondary);
  border-bottom: 1px solid var(--mcla-border-color);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.vs-back {
  width: 30px; height: 30px; border: none; background: transparent;
  color: var(--mcla-text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--mcla-radius-sm); transition: all 0.12s;
  -webkit-app-region: no-drag;
  &:hover { background: var(--mcla-bg-hover); color: var(--mcla-text-primary); }
}

.vs-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary);
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
    color: var(--mcla-text-tertiary); transition: background 0.12s;
    &:hover { background: var(--mcla-bg-hover); color: var(--mcla-text-primary); }
    &.vs-close:hover { background: rgba(239,68,68,0.15); color: var(--mcla-error); }
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
  background: var(--mcla-bg-secondary);
  border-right: 1px solid var(--mcla-border-color);
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
  font-size: 13px;
  font-weight: 500;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
  position: relative;

  > span { flex-shrink: 0; display: flex; color: var(--mcla-text-muted); }

  &:hover {
    color: var(--mcla-primary-muted);
    background: rgba(99,102,234,0.08);
    > span { color: var(--mcla-primary-muted); }
  }

  &.active {
    color: var(--mcla-primary-muted);
    font-weight: 600;
    background: rgba(99,102,234,0.06);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      bottom: 4px;
      width: 3px;
      background: var(--mcla-primary);
      border-radius: 0 2px 2px 0;
    }

    > span { color: var(--mcla-primary-muted); }
  }
}

/* ---- 右侧内容区 ---- */
.vs-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  background: var(--mcla-bg-primary);

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--mcla-border-color); border-radius: 3px; }
}

/* ---- 版本信息卡片 ---- */
.ver-info-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-lg);
  border: 1px solid var(--mcla-border-color);
  margin-bottom: 14px;

  .ver-icon {
    width: 44px; height: 44px;
    border-radius: var(--mcla-radius-md);
    background: rgba(99,102,234,0.1);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .ver-detail {
    .ver-full-name { margin: 0; font-size: 15px; font-weight: 700; color: var(--mcla-text-primary); }
    .ver-sub   { margin: 3px 0 0; font-size: 12px; color: var(--mcla-text-muted); }
  }
}

/* ---- 区块 ---- */
.vs-section {
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-lg);
  border: 1px solid var(--mcla-border-color);
  padding: 16px 18px;
  margin-bottom: 14px;

  .sec-title {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 700;
    color: var(--mcla-text-primary);
  }

  .desc-text {
    font-size: 12px;
    color: var(--mcla-text-secondary);
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
    color: var(--mcla-text-secondary);
  }
}

.form-select,
.form-input {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  font-size: 13px;
  color: var(--mcla-text-primary);
  background: var(--mcla-bg-primary);
  outline: none;
  transition: border-color 0.14s;

  &:focus { border-color: var(--mcla-primary); box-shadow: 0 0 0 3px rgba(99,102,234,0.15); }
  &.short { flex: 0 0 80px; }
  &.mono { font-family: var(--mcla-font-mono); font-size: 12px; }
}

.form-textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  font-size: 12px;
  font-family: inherit;
  color: var(--mcla-text-primary);
  background: var(--mcla-bg-primary);
  outline: none;
  resize: vertical;
  min-height: 60px;
  transition: border-color 0.14s;

  &:focus { border-color: var(--mcla-primary); box-shadow: 0 0 0 3px rgba(99,102,234,0.15); }
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
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  background: var(--mcla-bg-elevated);
  font-size: 12px;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.13s;
  flex-shrink: 0;

  &:hover { border-color: var(--mcla-primary); color: var(--mcla-primary); }
  &.small { padding: 8px 12px; }
}

/* ---- 复选框标签 ---- */
.checkbox-label {
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: normal;
  color: var(--mcla-text-primary);
  min-width: auto !important;
  cursor: pointer;
  margin-right: 16px;
  margin-bottom: 6px;

  input[type="checkbox"] {
    width: 15px;
    height: 15px;
    accent-color: var(--mcla-primary);
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

/* 独立按钮组 */
.vs-content > .form-btns {
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-lg);
  border: 1px solid var(--mcla-border-color);
  padding: 14px 18px;
}

.form-action-btn {
  padding: 8px 18px;
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  background: var(--mcla-bg-elevated);
  font-size: 12px;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  transition: all 0.13s;

  &:hover { border-color: var(--mcla-primary); color: var(--mcla-primary); }

  &.primary {
    background: var(--mcla-gradient-primary);
    border-color: transparent;
    color: #fff;
    &:hover { filter: brightness(1.1); }
  }

  &.outline {
    &:hover { border-color: var(--mcla-primary); color: var(--mcla-primary); background: rgba(99,102,234,0.06); }
  }

  &.danger {
    border-color: rgba(239,68,68,0.5);
    color: var(--mcla-error);
    &:hover { background: rgba(239,68,68,0.1); border-color: var(--mcla-error); }
  }

  &.active {
    border-color: #f59e0b;
    color: #f59e0b;
    background: rgba(245,158,11,0.08);
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
  font-size: 12px;
  color: var(--mcla-text-muted);
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
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-md);
  border: 1px solid transparent;
  transition: all 0.12s;

  &:hover { border-color: var(--mcla-border-color); }

  .mod-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--mcla-text-primary); }
  .mod-ver { font-size: 11px; color: var(--mcla-text-muted); }

  .mod-remove {
    padding: 4px 12px;
    border: 1px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-sm);
    background: var(--mcla-bg-elevated);
    font-size: 11px;
    color: var(--mcla-text-secondary);
    cursor: pointer;
    opacity: 0;
    transition: all 0.12s;

    &:hover { border-color: var(--mcla-error); color: var(--mcla-error); }
  }

  &:hover .mod-remove { opacity: 1; }
}

.empty-state {
  text-align: center;
  padding: 36px 0;
  color: var(--mcla-text-muted);

  p { margin: 10px 0 0; font-size: 13px; }
  svg { opacity: 0.35; }
}

/* ---- 动画 ---- */
.modal-fade-enter-active { transition: opacity 0.18s ease; }
.modal-fade-leave-active { transition: opacity 0.12s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* ---- 补全文件弹窗 ---- */
.complete-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px;
  gap: 8px;

  &.checking svg,
  &.downloading svg {
    animation: spin 1s linear infinite;
  }
}

.complete-status-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--mcla-text-primary);
  margin: 4px 0 0;
}

.complete-status-sub {
  font-size: 12px;
  color: var(--mcla-text-muted);
  margin: 0;
  word-break: break-all;
  text-align: center;
}

.complete-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--mcla-border-color);
  border-top-color: var(--mcla-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.missing-file-list {
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  padding: 8px 12px;
  text-align: left;
  margin-top: 12px;
}

.missing-file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border-bottom: 1px solid var(--mcla-border-color);
  &:last-child { border-bottom: none; }
}

.missing-file-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

.missing-file-path {
  font-size: 11px;
  color: var(--mcla-text-secondary);
  word-break: break-all;
  font-family: monospace;
}

.missing-file-more {
  font-size: 11px;
  color: var(--mcla-text-muted);
  text-align: center;
  padding: 4px 0 0;
}

.dl-progress-wrap {
  width: 100%;
  margin-top: 12px;
}

.dl-progress-bar {
  width: 100%;
  height: 8px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.dl-progress-fill {
  height: 100%;
  background: var(--mcla-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.dl-progress-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary);
  margin: 8px 0 2px;
}

.dl-progress-file {
  font-size: 11px;
  color: var(--mcla-text-muted);
  font-family: monospace;
  word-break: break-all;
  margin: 0;
}

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
  background: rgba(99,102,234,0.08);
  border-radius: var(--mcla-radius-md);
  font-size: 12px;
  color: var(--mcla-primary-muted);
  margin-bottom: 14px;

  svg { flex-shrink: 0; opacity: 0.7; }

  .tip-close {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 16px;
    color: var(--mcla-primary-muted);
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
  color: var(--mcla-text-secondary);

  input { accent-color: var(--mcla-primary); }

  &.active {
    color: var(--mcla-primary-muted);
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
  accent-color: var(--mcla-primary);
  cursor: pointer;
}

/* 内存统计 */
.mem-stats {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--mcla-border-color);
  padding-top: 8px;
  margin-top: 10px;
}

.mem-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .mem-stat-label { font-size: 11px; color: var(--mcla-text-muted); }
  .mem-stat-value { font-size: 14px; font-weight: 700; color: var(--mcla-text-primary); }
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

  &:hover { color: var(--mcla-primary-muted); }
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
  background: var(--mcla-gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { filter: brightness(1.08); }
}

/* ====== Mod 管理页专用样式 ====== */

/* 搜索栏 */
.mod-search-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: var(--mcla-bg-primary);
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  margin-bottom: 10px;

  svg { flex-shrink: 0; }

  .mod-search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 13px;
    color: var(--mcla-text-primary);
    background: transparent;

    &::placeholder { color: var(--mcla-text-muted); }
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
  border-color: var(--mcla-primary);
  color: var(--mcla-primary);
  &:hover { background: rgba(99,102,234,0.06); }
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
  font-size: 12px;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  border-radius: var(--mcla-radius-md);
  transition: all 0.13s;

  &.active {
    background: var(--mcla-gradient-primary);
    color: #fff;
    font-weight: 600;
  }

  &:hover:not(.active) { background: rgba(99,102,234,0.08); color: var(--mcla-primary-muted); }

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
  border-radius: var(--mcla-radius-md);
  transition: background 0.12s;
  position: relative;

  &:hover { background: var(--mcla-bg-hover); }
}

.mod-icon-img {
  width: 32px; height: 32px;
  border-radius: var(--mcla-radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.mod-icon-default {
  width: 32px; height: 32px;
  border-radius: var(--mcla-radius-sm);
  background: var(--mcla-gradient-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin-icon {
  animation: spin 1.2s linear infinite;
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
  color: var(--mcla-text-primary);
}

.mod-ver-text {
  font-size: 11px;
  color: var(--mcla-text-muted);
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
  font-size: 11px;
  color: var(--mcla-text-secondary);
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mod-tag {
  display: inline-block;
  padding: 0 5px;
  font-size: 10px;
  color: var(--mcla-primary-muted);
  background: rgba(99,102,234,0.08);
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
  border-radius: var(--mcla-radius-sm);
  font-size: 13px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;

  &:hover { background: var(--mcla-bg-hover); }
  &.danger:hover { background: rgba(239,68,68,0.1); }
}

/* 输入弹窗尺寸（名称单行为窄窗，描述多行自动撑高） */
.input-modal-win {
  width: 420px;
  max-width: 90vw;
  .vs-body { padding: 20px !important; }
  textarea { min-height: 90px; }
}

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
  font-size: 12px;
  color: var(--mcla-text-primary);

  input[type="checkbox"] {
    width: 14px; height: 14px;
    accent-color: var(--mcla-primary);
    cursor: pointer;
    flex-shrink: 0;
  }

  > span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tree-label-bold { font-weight: 600; }
  .tree-sub {
    font-size: 11px;
    color: var(--mcla-text-muted);
    margin-left: 4px;
    flex-shrink: 0;
    min-width: unset;
    overflow: visible;
    white-space: normal;
    align-self: center;
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
  background: rgba(99,102,234,0.06);
  border-radius: var(--mcla-radius-md);
  font-size: 11px;
  color: var(--mcla-primary-muted);
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
  background: var(--mcla-gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-full);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--mcla-shadow-glow-primary);
  transition: all 0.16s;

  &:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 24px rgba(99,102,234,0.5);
    transform: translateY(-1px);
  }
}
</style>
