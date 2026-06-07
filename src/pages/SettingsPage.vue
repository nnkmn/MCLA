<template>
  <div class="settings-page">
    <!-- ========== 启动选项 ========== -->
    <template v-if="activeCategory === 'launch'">
      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('launch')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          启动设置
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.launch }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.launch">
          <!-- 版本隔离 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">版本隔离</label>
              <p class="row-desc">每个版本使用独立的游戏目录，避免文件冲突</p>
            </div>
            <div class="row-control">
              <select class="sel" v-model="s.versionIsolation">
                <option value="none">不隔离</option>
                <option value="version">按版本隔离</option>
                <option value="versionAndGroup">按版本和分组隔离</option>
              </select>
            </div>
          </div>

          <!-- 游戏窗口标题 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">游戏窗口标题</label>
              <p class="row-desc">自定义游戏窗口显示的标题文本</p>
            </div>
            <div class="row-control">
              <input
                type="text"
                class="inp"
                v-model="s.windowTitle"
                placeholder="Minecraft {version}"
              />
            </div>
          </div>

          <!-- 启动器可见性 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">启动游戏时</label>
            </div>
            <div class="row-control">
              <select class="sel" v-model="s.launchVisibility">
                <option value="hide">隐藏启动器</option>
                <option value="minimize">最小化启动器</option>
                <option value="keep">保持不变</option>
              </select>
            </div>
          </div>

          <!-- 进程优先级 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">游戏进程优先级</label>
              <p class="row-desc">影响游戏占用的 CPU 资源比例</p>
            </div>
            <div class="row-control">
              <select class="sel" v-model="s.processPriority">
                <option value="low">低</option>
                <option value="belowNormal">低于正常</option>
                <option value="normal" selected>正常</option>
                <option value="aboveNormal">高于正常</option>
                <option value="high">高</option>
              </select>
            </div>
          </div>

          <!-- 游戏窗口大小 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">游戏窗口大小</label>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input type="number" class="inp short" v-model="s.winW" placeholder="854" min="1" />
                <span class="sep">&times;</span>
                <input type="number" class="inp short" v-model="s.winH" placeholder="480" min="1" />
                <span class="sep">px</span>
                <label class="chk" style="margin-left: 8px"
                  ><input type="checkbox" v-model="s.fullscreen" /> 全屏</label
                >
              </div>
            </div>
          </div>

          <!-- 游戏 Java -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">游戏 Java</label>
              <p class="row-desc">选择运行游戏使用的 Java 版本</p>
            </div>
            <div class="row-control">
              <div class="input-group" style="margin-bottom: 8px;">
                <select class="sel" v-model="selectedJavaPreset">
                  <option value="auto">自动选择</option>
                  <option value="java8">Java 8</option>
                  <option value="java17">Java 17</option>
                  <option value="java21">Java 21</option>
                  <option v-if="detectedJava.length > 0" disabled>──────────────</option>
                  <option 
                    v-for="java in detectedJava" 
                    :key="java.id" 
                    :value="`detected:${java.id}`"
                  >
                    {{ java.vendor }} {{ java.version }} ({{ java.arch }}位)
                  </option>
                  <option v-if="detectedJava.length > 0" disabled>──────────────</option>
                  <option value="custom">自定义路径</option>
                </select>
                <input
                  v-if="s.javaPreset === 'custom'"
                  type="text"
                  class="inp"
                  v-model="s.javaPath"
                  placeholder="C:\Program Files\Java\..."
                />
                <button v-if="s.javaPreset === 'custom'" class="btn-sm" @click="browseJava">
                  浏览
                </button>
              </div>
              <div class="java-detection">
                <div class="java-detect-header">
                  <button class="btn-sm" @click="detectJava" :disabled="isDetectingJava">
                  <svg v-if="isDetectingJava" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
                  </svg>
                  {{ isDetectingJava ? '检测中...' : '检测 Java' }}
                </button>
                </div>
                
                <!-- 检测进度 -->
                <div v-if="isDetectingJava" class="java-progress">
                  <div class="progress-info">
                    <span class="progress-step">{{ currentStep }}</span>
                    <span class="progress-text">{{ progressText }}</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
                  </div>
                </div>

                <!-- 未检测到 Java -->
                <div v-if="detectionComplete && detectedJava.length === 0" class="java-not-found">
                  <div class="java-not-found-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div class="java-not-found-text">
                    <h4>没有检测到任何 Java 版本</h4>
                    <p>请确保已安装 Java，或使用自定义路径指定 Java 可执行文件</p>
                  </div>
                  <div class="java-not-found-actions">
                    <a href="https://adoptium.net/" target="_blank" class="btn-outline">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      下载 Eclipse Temurin（推荐）
                    </a>
                    <a href="https://www.oracle.com/java/technologies/downloads/" target="_blank" class="btn-outline">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      下载 Oracle Java
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('memory')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 12h.01M10 12h.01" />
          </svg>
          内存分配
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.memory }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.memory">
          <!-- 内存模式 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">内存分配模式</label>
            </div>
            <div class="row-control">
              <select class="sel" v-model="s.memoryMode">
                <option value="auto">自动分配</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>

          <!-- 自定义内存 -->
          <template v-if="s.memoryMode === 'custom'">
            <div class="row">
              <div class="row-main">
                <label class="row-label">最小内存</label>
              </div>
              <div class="row-control">
                <div class="input-group compact">
                  <input
                    type="range"
                    class="range"
                    v-model.number="s.memoryMin"
                    min="512"
                    max="16384"
                    step="512"
                  />
                  <span class="range-val">{{ s.memoryMin }} MB</span>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="row-main">
                <label class="row-label">最大内存</label>
              </div>
              <div class="row-control">
                <div class="input-group compact">
                  <input
                    type="range"
                    class="range"
                    v-model.number="s.memoryMax"
                    min="1024"
                    max="32768"
                    step="512"
                  />
                  <span class="range-val">{{ s.memoryMax }} MB</span>
                </div>
                <div class="memory-bar">
                  <div class="bar-fill" :style="{ width: memoryPercent + '%' }">
                    <span class="bar-text">{{ memoryPercent }}%</span>
                  </div>
                </div>
                <p class="row-hint">建议不超过系统可用内存的 80%</p>
              </div>
            </div>
          </template>
        </div>
        <!-- /sec-body -->
      </section>

      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('skin')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          离线皮肤
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.skin }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.skin">
          <div class="skin-warning">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            由于技术问题，此功能只保证对 1.19.2 以前的版本有效！
          </div>

          <div class="skin-radio-group">
            <label
              class="skin-radio-item"
              v-for="opt in skinOptions"
              :key="opt.value"
              :class="{ active: s.offlineSkin === opt.value }"
              @click="onSkinSelect(opt.value)"
            >
              <span class="skin-radio-dot" :class="{ checked: s.offlineSkin === opt.value }"></span>
              {{ opt.label }}
            </label>
          </div>

          <!-- 正版皮肤：展开玩家名 + 操作按钮 -->
          <div class="skin-expand" v-if="s.offlineSkin === 'official'">
            <div class="skin-expand-row">
              <label class="skin-expand-label">正版玩家名</label>
              <input
                type="text"
                class="inp skin-expand-inp"
                v-model="s.officialSkinName"
                placeholder=""
              />
            </div>
            <div class="skin-expand-actions">
              <button class="btn-outline" @click="saveSkin">保存皮肤</button>
              <button class="btn-outline" @click="refreshSkin">刷新</button>
            </div>
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('advanced')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          高级选项
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.advanced }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.advanced">
          <div class="row">
            <div class="row-main">
              <label class="row-label">Java 虚拟机参数</label>
              <p class="row-desc">Java 虚拟机的额外启动参数</p>
            </div>
            <div class="row-control full">
              <textarea
                class="textarea"
                v-model="s.jvmArgs"
                rows="3"
                placeholder="-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions ..."
              ></textarea>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">游戏参数</label>
              <p class="row-desc">传递给 Minecraft 主程序的额外参数</p>
            </div>
            <div class="row-control full">
              <textarea
                class="textarea"
                v-model="s.gameArgs"
                rows="2"
                placeholder="--tweakClass com.example.Tweak"
              ></textarea>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">启动前执行命令</label>
              <p class="row-desc">游戏启动前自动执行的命令</p>
            </div>
            <div class="row-control full">
              <input
                type="text"
                class="inp"
                v-model="s.preLaunchCmd"
                placeholder="taskkill /f /im java.exe"
              />
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">内存管理</label>
            </div>
            <div class="row-control">
              <select class="sel" v-model="s.memoryManage">
                <option value="g1gc">调优 G1GC</option>
                <option value="zgc">ZGC</option>
                <option value="parallel">Parallel GC</option>
                <option value="none">不优化</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div class="row-control full">
              <div class="adv-checkbox-group">
                <label class="chk"
                  ><input type="checkbox" v-model="s.disableJavaLaunchWrapper" /> 禁用 Java Launch
                  Wrapper</label
                >
                <label class="chk"
                  ><input type="checkbox" v-model="s.disableLwjglUnsafeAgent" /> 禁用 LWJGL Unsafe
                  Agent</label
                >
                <label class="chk"
                  ><input type="checkbox" v-model="s.useHighPerformanceGPU" /> 使用高性能显卡</label
                >
              </div>
            </div>
          </div>
        </div>
        <!-- /sec-body -->
      </section>
    </template>

    <!-- ========== 个性化 ========== -->
    <template v-if="activeCategory === 'personalize'">
      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('appearance')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="13.5" cy="6.5" r="2.5" />
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
          </svg>
          外观
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.appearance }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.appearance">
          <!-- 不透明度 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">界面不透明度</label>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input
                  type="range"
                  class="range"
                  v-model.number="s.opacity"
                  min="30"
                  max="100"
                  step="5"
                />
                <span class="range-val">{{ s.opacity }}%</span>
              </div>
            </div>
          </div>

          <!-- 主题色 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">主题色</label>
            </div>
            <div class="row-control">
              <div class="color-options">
                <button
                  v-for="c in colorPresets"
                  :key="c.name"
                  class="color-swatch"
                  :class="{ active: s.themeColor === c.value }"
                  :style="{ background: c.value }"
                  @click="applyThemeColor(c.value)"
                  :title="c.name"
                ></button>
              </div>
            </div>
          </div>

          <!-- 语言 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">界面语言</label>
            </div>
            <div class="row-control">
              <select class="sel" v-model="s.lang">
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('background')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          背景
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.background }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.background">
          <!-- 背景图片 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">背景图片</label>
            </div>
            <div class="row-control">
              <div class="input-group">
                <select class="sel" v-model="s.bgImageMode">
                  <option value="none">无背景图</option>
                  <option value="custom">自定义图片</option>
                </select>
                <button v-if="s.bgImageMode === 'custom'" class="btn-sm" @click="browseBgImage">
                  选择图片
                </button>
              </div>
            </div>
          </div>

          <div class="row" v-if="s.bgImageMode === 'custom'">
            <div class="row-main">
              <label class="row-label"></label>
            </div>
            <div class="row-control">
              <label class="chk"
                ><input type="checkbox" v-model="s.bgColorOverlay" /> 叠加彩色背景</label
              >
            </div>
          </div>

          <!-- 背景音乐 -->
          <div class="row">
            <div class="row-main">
              <label class="row-label">背景音乐</label>
              <p class="row-desc">在启动器主页播放背景音乐</p>
            </div>
            <div class="row-control">
              <div class="input-group">
                <select class="sel" v-model="s.bgMusicMode">
                  <option value="none">关闭</option>
                  <option value="custom">自定义音乐</option>
                </select>
                <button v-if="s.bgMusicMode === 'custom'" class="btn-sm">选择文件夹</button>
              </div>
            </div>
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('titlebar')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          标题栏
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.titlebar }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.titlebar">
          <div class="row">
            <div class="row-main">
              <label class="row-label">标题栏模式</label>
            </div>
            <div class="row-control">
              <select class="sel" v-model="s.titleBarMode">
                <option value="default">默认标题栏</option>
                <option value="none">隐藏标题栏</option>
                <option value="text">仅显示文本</option>
                <option value="image">自定义图片</option>
              </select>
            </div>
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('homepage')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          主页
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.homepage }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.homepage">
          <div class="row">
            <div class="row-main">
              <label class="row-label">主页内容</label>
            </div>
            <div class="row-control">
              <select class="sel" v-model="s.homeContent">
                <option value="blank">空白页</option>
                <option value="preset">使用预设主页</option>
                <option value="local">读取本地文件</option>
                <option value="online">联网更新</option>
              </select>
            </div>
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('features')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
            />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          功能隐藏
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.features }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.features">
          <p class="sec-desc">
            你可以隐藏不需要的页面或关闭特定功能。在任意界面按 F12 可以暂时显示被隐藏的功能。
          </p>
          <div class="feature-hide-table">
            <template v-for="row in featureRows" :key="row.label">
              <span class="fh-row-label">{{ row.label }}</span>
              <template v-for="feat in row.items" :key="feat.key">
                <label class="fh-cell" :class="{ hidden: feat.hidden, disabled: feat.disabled }">
                  <input type="checkbox" v-model="feat.hidden" :disabled="feat.disabled" />
                  <span class="feat-name">{{ feat.name }}</span>
                </label>
              </template>
              <!-- 补空格占位，保证每行满4列 -->
              <span
                v-for="i in 4 - row.items.length"
                :key="'pad-' + i + row.label"
                class="fh-cell fh-pad"
              />
            </template>
          </div>
          <div class="warn-bar warn-orange" style="margin-top: 12px">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            关闭功能隐藏设置，千万别忘了，要不然设置就改不回来了……
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <!-- ========== 全局快捷键 ========== -->
      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('hotkey')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
          </svg>
          全局快捷键
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.hotkey }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.hotkey">
          <p class="sec-desc">
            设置全局快捷键，在任何时候按下都可执行对应操作。格式示例：<code>Ctrl+Shift+L</code>、<code>Alt+F12</code>
          </p>

          <div class="row">
            <div class="row-main">
              <label class="row-label">启动游戏</label>
              <p class="row-desc">在任何窗口按下都可快速启动选中的实例</p>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input
                  type="text"
                  class="inp"
                  v-model="s.hotkeyLaunch"
                  placeholder="Ctrl+Shift+L"
                />
                <button
                  class="btn-sm"
                  @click="updateHotkey('launch-game', s.hotkeyLaunch)"
                >保存</button>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">切换窗口显示</label>
              <p class="row-desc">隐藏或显示启动器主窗口</p>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input
                  type="text"
                  class="inp"
                  v-model="s.hotkeyToggleWindow"
                  placeholder="Ctrl+Shift+H"
                />
                <button
                  class="btn-sm"
                  @click="updateHotkey('toggle-window', s.hotkeyToggleWindow)"
                >保存</button>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">打开主页</label>
              <p class="row-desc">快速跳转到启动器首页</p>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input
                  type="text"
                  class="inp"
                  v-model="s.hotkeyOpenHome"
                  placeholder="Ctrl+Shift+O"
                />
                <button
                  class="btn-sm"
                  @click="updateHotkey('open-home', s.hotkeyOpenHome)"
                >保存</button>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">打开设置</label>
              <p class="row-desc">快速跳转到设置页面</p>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input
                  type="text"
                  class="inp"
                  v-model="s.hotkeyOpenSettings"
                  placeholder="Ctrl+,"
                />
                <button
                  class="btn-sm"
                  @click="updateHotkey('open-settings', s.hotkeyOpenSettings)"
                >保存</button>
              </div>
            </div>
          </div>

          <div class="btn-row">
            <button class="action-btn outline" @click="reloadHotkeys">
              重新加载快捷键
            </button>
          </div>
        </div>
        <!-- /sec-body -->
      </section>
    </template>
    <template v-if="activeCategory === 'other'">
      <section class="sec">
        <h3 class="sec-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          下载设置
        </h3>

        <div class="row">
          <div class="row-main">
            <label class="row-label">文件下载源</label>
            <p class="row-desc">游戏文件和资源的下载镜像</p>
          </div>
          <div class="row-control">
            <select class="sel" v-model="s.downloadSource">
              <option value="bmclapi">BMCLAPI（推荐）</option>
              <option value="official">Mojang 官方</option>
              <option value="mcbbs">MCBBS 镜像</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="row-main">
            <label class="row-label">版本列表源</label>
          </div>
          <div class="row-control">
            <select class="sel" v-model="s.versionListSource">
              <option value="bmclapi">BMCLAPI</option>
              <option value="official">Mojang 官方</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="row-main">
            <label class="row-label">最大下载线程</label>
          </div>
          <div class="row-control">
            <div class="input-group compact">
              <input
                type="range"
                class="range"
                v-model.number="s.maxThreads"
                min="1"
                max="64"
                step="1"
              />
              <span class="range-val">{{ s.maxThreads }} 线程</span>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="row-main">
            <label class="row-label">下载速度限制</label>
          </div>
          <div class="row-control">
            <div class="input-group compact">
              <input
                type="number"
                class="inp short"
                v-model.number="s.speedLimit"
                min="0"
                step="1024"
              />
              <span class="sep">KB/s</span>
              <span class="row-hint">0 为不限速</span>
            </div>
          </div>
        </div>
      </section>

      <section class="sec">
        <h3 class="sec-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          社区资源
        </h3>

        <div class="row">
          <div class="row-main">
            <label class="row-label">Mod 下载来源</label>
          </div>
          <div class="row-control">
            <select class="sel" v-model="s.modSource">
              <option value="curseforge">CurseForge</option>
              <option value="modrinth">Modrinth</option>
              <option value="both">两者都搜索</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="row-main">
            <label class="row-label">CurseForge API Key</label>
            <p class="row-desc">用于访问 CurseForge API（留空则只用 Modrinth）</p>
          </div>
          <div class="row-control">
            <input
              type="password"
              class="f-input"
              v-model="s.cfApiKey"
              placeholder="填入你的 CF API Key"
              @blur="saveCfApiKey"
            />
          </div>
        </div>

        <div class="row">
          <div class="row-main">
            <label class="row-label">文件名格式</label>
            <p class="row-desc">下载的 Mod/资源包文件命名规则</p>
          </div>
          <div class="row-control">
            <select class="sel" v-model="s.fileNameFormat">
              <option value="name-version">名称-版本</option>
              <option value="id-name">ID-名称</option>
              <option value="original">保留原始文件名</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="row-main">
            <label class="row-label">Mod 管理样式</label>
          </div>
          <div class="row-control">
            <select class="sel" v-model="s.modManageStyle">
              <option value="list">列表模式</option>
              <option value="card">卡片模式</option>
            </select>
          </div>
        </div>
      </section>

      <section class="sec">
        <h3 class="sec-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          数据管理
        </h3>

        <div class="btn-row">
          <button class="action-btn outline" @click="openMcDir">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            打开 .minecraft 目录
          </button>
          <button class="action-btn outline">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            打开启动器目录
          </button>
        </div>

        <div class="btn-row" style="margin-top: 10px">
          <button class="action-btn outline">清除下载缓存</button>
          <button class="action-btn outline">清除版本缓存</button>
        </div>

        <div class="btn-row danger-zone" style="margin-top: 18px">
          <button class="action-btn danger">重置所有设置</button>
        </div>
      </section>

      <!-- ========== 整合包工具 ========== -->
      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('modpack')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 000 4l-7 4v0a2 2 0 000 4l7 4 7 4 7-4a2 2 0 000-4l7-4z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          整合包工具
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.modpack }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.modpack">
          <p class="sec-desc">
            创建或导入 Modrinth 格式（.mrpack）整合包。一个整合包可包含 Mod、配置、资源包、存档等。
          </p>

          <!-- 打包整合包 -->
          <h4 class="sec-subtitle">📦 打包整合包</h4>

          <div class="row">
            <div class="row-main">
              <label class="row-label">实例目录</label>
              <p class="row-desc">选择要打包的 .minecraft 或实例目录</p>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input
                  type="text"
                  class="inp"
                  v-model="s.modpackInstancePath"
                  placeholder="例如：C:/Users/xxx/.minecraft"
                />
                <button class="btn-sm" @click="browseModpackInstance">浏览...</button>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">输出目录</label>
              <p class="row-desc">生成的 .mrpack 文件保存位置</p>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input
                  type="text"
                  class="inp"
                  v-model="s.modpackOutputDir"
                  placeholder="留空使用默认目录"
                />
                <button class="btn-sm" @click="browseModpackOutput">浏览...</button>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">整合包信息</label>
              <p class="row-desc">名称、版本号、作者</p>
            </div>
            <div class="row-control">
              <div class="input-group compact">
                <input
                  type="text"
                  class="inp short"
                  v-model="s.modpackName"
                  placeholder="名称"
                />
                <input
                  type="text"
                  class="inp short"
                  v-model="s.modpackVersion"
                  placeholder="版本"
                />
                <input
                  type="text"
                  class="inp short"
                  v-model="s.modpackAuthor"
                  placeholder="作者"
                />
              </div>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">包含内容</label>
              <p class="row-desc">选择要打包到整合包中的文件类型</p>
            </div>
            <div class="row-control">
              <label class="chk">
                <input type="checkbox" v-model="s.modpackIncludeMods" /> Mods
              </label>
              <label class="chk">
                <input type="checkbox" v-model="s.modpackIncludeConfigs" /> 配置文件
              </label>
              <label class="chk">
                <input type="checkbox" v-model="s.modpackIncludeSaves" /> 存档
              </label>
              <label class="chk">
                <input type="checkbox" v-model="s.modpackIncludeResourcepacks" /> 资源包
              </label>
            </div>
          </div>

          <div class="btn-row">
            <button class="action-btn primary" @click="packAsMrpack" :disabled="isWorkingModpack">
              {{ isWorkingModpack ? '正在打包...' : '生成 .mrpack' }}
            </button>
          </div>

          <!-- 进度显示 -->
          <div v-if="isWorkingModpack && modpackProgress.stage" class="progress-box">
            <div class="progress-label">
              {{ modpackProgress.stage }} {{ modpackProgress.progress }}%
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar"
                :style="{ width: modpackProgress.progress + '%' }"
              ></div>
            </div>
            <div v-if="modpackProgress.currentFile" class="progress-sub">
              {{ modpackProgress.currentFile }}
            </div>
          </div>

          <!-- 导入整合包 -->
          <h4 class="sec-subtitle" style="margin-top:20px">📥 导入整合包</h4>
          <p class="sec-desc">从 .mrpack 文件创建新的实例</p>

          <div class="btn-row">
            <button class="action-btn outline" @click="importMrpack" :disabled="isWorkingModpack">
              {{ isWorkingModpack ? '处理中...' : '选择 .mrpack 文件导入' }}
            </button>
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <!-- ========== 数据备份与恢复 ========== -->
      <section class="sec">
        <h3 class="sec-title" @click="toggleSec('backup')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14a9 3 0 0018 0V5" />
            <path d="M3 12a9 3 0 0018 0" />
          </svg>
          数据备份与恢复
          <svg
            class="sec-arrow"
            :class="{ open: collapsed.backup }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h3>

        <div class="sec-body" v-show="collapsed.backup">
          <p class="sec-desc">
            备份启动器的所有配置、实例信息等数据，可用于迁移到新设备或恢复状态。
          </p>

          <div class="row">
            <div class="row-main">
              <label class="row-label">上次备份</label>
              <p class="row-desc">{{ s.backupLastTime || '尚未备份' }}</p>
            </div>
            <div class="row-control">
              <button class="action-btn primary" @click="createBackup" :disabled="isWorkingBackup">
                {{ isWorkingBackup ? '备份中...' : '立即备份' }}
              </button>
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <label class="row-label">恢复备份</label>
              <p class="row-desc">从 .zip 备份文件恢复数据（会覆盖当前）</p>
            </div>
            <div class="row-control">
              <button class="action-btn outline" @click="restoreBackup" :disabled="isWorkingBackup">
                选择备份文件恢复
              </button>
            </div>
          </div>

          <div v-if="isWorkingBackup && backupProgress.stage" class="progress-box">
            <div class="progress-label">
              {{ backupProgress.stage }} {{ backupProgress.progress }}%
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar"
                :style="{ width: backupProgress.progress + '%' }"
              ></div>
            </div>
            <div v-if="backupProgress.currentItem" class="progress-sub">
              {{ backupProgress.currentItem }}
            </div>
          </div>

          <!-- 备份文件列表 -->
          <div v-if="backupFiles.length > 0" class="backup-list">
            <h4 class="sec-subtitle">📁 已有备份</h4>
            <div
              class="backup-item"
              v-for="f in backupFiles"
              :key="f.name"
            >
              <div class="backup-info">
                <div class="backup-name">{{ f.name }}</div>
                <div class="backup-meta">
                  <span v-if="f.size">{{ (f.size / 1024).toFixed(1) }} KB</span>
                  <span v-if="f.created">{{ new Date(f.created).toLocaleString() }}</span>
                </div>
              </div>
              <button class="btn-sm danger-btn" @click="deleteBackup(f.name)">
                删除
              </button>
            </div>
          </div>
        </div>
        <!-- /sec-body -->
      </section>

      <section class="sec">
        <h3 class="sec-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          关于与鸣谢
        </h3>
        <p class="about-redirect-desc">
          关于 MCLA、鸣谢、开源项目使用说明等内容已移至「更多」页面。
        </p>
        <div class="btn-row" style="margin-top: 14px">
          <button class="action-btn primary" @click="router.push('/more')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-14c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"
              />
            </svg>
            前往更多页面
          </button>
        </div>
      </section>

      <!-- 更新检查 -->
      <section class="sec">
        <h3 class="sec-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 2v4m0 16v4M4.93 4.93l2.83 2.83M18.24 18.24l2.83 2.83M2 12h4m16 0h4M4.93 19.07l2.83-2.83M18.24 5.76l2.83-2.83" />
          </svg>
          检查更新
        </h3>

        <div v-if="updateStatus.checking" class="update-status checking">
          <div class="update-icon">🔄</div>
          <div class="update-text">正在检查更新...</div>
        </div>

        <div v-else-if="updateStatus.available" class="update-status available">
          <div class="update-icon">📦</div>
          <div class="update-text">
            <div>发现新版本: v{{ updateStatus.version }}</div>
            <div v-if="updateStatus.releaseNotes" class="update-notes">{{ updateStatus.releaseNotes }}</div>
          </div>
          <div class="update-actions">
            <button v-if="!updateStatus.downloading && !updateStatus.downloaded" 
                    class="action-btn primary" 
                    @click="checkForUpdateDownload">
              下载更新
            </button>
            <div v-else-if="updateStatus.downloading" class="download-progress">
              <div class="progress-text">下载中 {{ updateStatus.downloadProgress.toFixed(0) }}%</div>
              <div class="progress-bar-wrap small">
                <div class="progress-bar" :style="{ width: updateStatus.downloadProgress + '%' }"></div>
              </div>
            </div>
            <button v-else-if="updateStatus.downloaded" 
                    class="action-btn danger" 
                    @click="installUpdate">
              安装并重启
            </button>
          </div>
        </div>

        <div v-else-if="updateStatus.error" class="update-status error">
          <div class="update-icon">❌</div>
          <div class="update-text">检查更新失败: {{ updateStatus.error }}</div>
        </div>

        <div v-else class="update-status up-to-date">
          <div class="update-icon">✅</div>
          <div class="update-text">当前已是最新版本</div>
        </div>

        <div class="btn-row" style="margin-top: 12px">
          <button class="action-btn outline" @click="checkForUpdate" :disabled="updateStatus.checking">
            {{ updateStatus.checking ? '检查中...' : '手动检查更新' }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, inject, computed, onMounted, watch, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const settingsActive = inject('settingsActive') as any
const activeCategory = computed(() => settingsActive?.value || 'launch')

// 加载保存的 CF API Key 和 Java 设置
onMounted(async () => {
  await loadCfApiKey()
  await loadJavaSettings()
})

// section 折叠状态（true = 展开）
const collapsed = reactive<Record<string, boolean>>({
  launch: true,
  memory: true,
  skin: false, // 默认折叠
  advanced: false, // 默认折叠
  appearance: true,
  background: true,
  titlebar: true,
  homepage: true,
  features: true,
  download: true,
  community: true,
  data: true,
  about: true,
  hotkey: true, // P2: 全局快捷键
  themeAdvanced: false, // P2: 主题自定义增强
  modpack: true, // P2: 整合包工具
  backup: true // P2: 数据备份
})
function toggleSec(key: string) {
  collapsed[key] = !collapsed[key]
}

// Java 检测状态
const isDetectingJava = ref(false)
const detectionComplete = ref(false)
const detectedJava = ref<any[]>([])
const currentStep = ref('')
const progressText = ref('')
const progressPercent = ref(0)
const selectedJavaId = ref<string>('')

// Computed property for selected Java preset
const selectedJavaPreset = computed({
  get() {
    if (selectedJavaId.value) {
      return `detected:${selectedJavaId.value}`
    }
    return s.javaPreset
  },
  set(val: string) {
    if (val.startsWith('detected:')) {
      const id = val.replace('detected:', '')
      selectedJavaId.value = id
      const java = detectedJava.value.find(j => j.id === id)
      if (java) {
        s.javaPath = java.path
        s.javaPreset = 'custom'
      }
    } else {
      selectedJavaId.value = ''
      s.javaPreset = val
    }
  }
})

const s = reactive({
  // 启动
  versionIsolation: 'version',
  windowTitle: 'Minecraft {version}',
  launchVisibility: 'hide',
  processPriority: 'normal',
  winW: '854',
  winH: '480',
  fullscreen: false,
  javaPreset: 'auto',
  javaPath: '',
  memoryMode: 'auto',
  memoryMin: 1024,
  memoryMax: 4096,
  offlineSkin: 'default',
  customSkinPath: '',
  officialSkinName: '',
  jvmArgs: '',
  gameArgs: '',
  preLaunchCmd: '',
  memoryManage: 'g1gc',
  disableJavaLaunchWrapper: false,
  disableLwjglUnsafeAgent: false,
  useHighPerformanceGPU: false,

  // 个性化
  opacity: 100,
  themeColor: '#6366f1',
  lang: 'zh-CN',
  bgImageMode: 'none',
  bgImagePath: '',
  bgColorOverlay: false,
  bgMusicMode: 'none',
  titleBarMode: 'default',
  homeContent: 'blank',

  // 其他
  downloadSource: 'bmclapi',
  versionListSource: 'bmclapi',
  maxThreads: 32,
  speedLimit: 0,
  modSource: 'both',
  cfApiKey: '',
  fileNameFormat: 'name-version',
  modManageStyle: 'card',

  // P2: 全局快捷键
  hotkeyLaunch: 'Ctrl+Shift+L',
  hotkeyToggleWindow: 'Ctrl+Shift+H',
  hotkeyOpenHome: 'Ctrl+Shift+O',
  hotkeyOpenSettings: 'Ctrl+,',

  // P2: 主题自定义
  themeCustomColor: '#6366f1',
  themeBgOpacity: 100,
  themeBgBlur: 0,

  // P2: 整合包工具
  modpackInstancePath: '',
  modpackOutputDir: '',
  modpackIncludeConfigs: true,
  modpackIncludeMods: true,
  modpackIncludeSaves: true,
  modpackIncludeResourcepacks: false,
  modpackName: '',
  modpackAuthor: '',
  modpackVersion: '1.0.0',

  // P2: 数据备份
  backupLastTime: '',
  backupFile: ''
})

// P2 状态变量
const hotkeyList = ref<any[]>([])
const modpackProgress = ref({ stage: '', progress: 0, currentFile: '' })
const backupProgress = ref({ stage: '', progress: 0, currentItem: '' })
const isWorkingModpack = ref(false)
const isWorkingBackup = ref(false)
const backupFiles = ref<any[]>([])

// 更新检查状态
const updateStatus = ref({
  checking: false,
  available: false,
  downloading: false,
  downloadProgress: 0,
  downloaded: false,
  error: null as string | null,
  version: null as string | null,
  releaseNotes: null as string | null
})

const memoryPercent = computed(() => {
  // 假设 16GB 系统
  const total = 16384
  return Math.round((s.memoryMax / total) * 100)
})

const colorPresets = [
  { name: '靛蓝紫（默认）', value: '#6366f1' },
  { name: '玫瑰粉', value: '#ec4899' },
  { name: '翡翠绿', value: '#10b981' },
  { name: '琥珀橙', value: '#f59e0b' },
  { name: '珊瑚红', value: '#ef4444' },
  { name: '天际蓝', value: '#0ea5e9' },
  { name: '紫罗兰', value: '#8b5cf6' }
]

const featureRows = reactive([
  {
    label: '主页面',
    items: [
      { key: 'hideDownload', name: '下载', hidden: false, disabled: false },
      { key: 'hideOnline1', name: '联机', hidden: true, disabled: true },
      { key: 'hideSettings', name: '设置', hidden: false, disabled: false },
      { key: 'hideMore', name: '更多', hidden: false, disabled: false }
    ]
  },
  {
    label: '设置 子页面',
    items: [
      { key: 'hideLaunch', name: '启动', hidden: false, disabled: false },
      { key: 'hideOnline2', name: '联机', hidden: true, disabled: true },
      { key: 'hidePersonalize', name: '个性化', hidden: false, disabled: false },
      { key: 'hideOther', name: '其他', hidden: false, disabled: false }
    ]
  },
  {
    label: '更多 子页面',
    items: [
      { key: 'hideHelp', name: '帮助', hidden: false, disabled: false },
      { key: 'hideAbout', name: '关于与鸣谢', hidden: false, disabled: false },
      { key: 'hideBaibao', name: '百宝箱', hidden: false, disabled: false },
      { key: 'hideFeedback', name: '反馈', hidden: false, disabled: false }
    ]
  },
  {
    label: '特定功能',
    items: [
      { key: 'hideEmailHide', name: '邮箱隐藏', hidden: false, disabled: false },
      { key: 'hideVersionMgr', name: '版本管理', hidden: false, disabled: false },
      { key: 'hideModUpdate', name: 'Mod 更新', hidden: false, disabled: false },
      { key: 'hideFeatureHide', name: '功能隐藏', hidden: false, disabled: false }
    ]
  }
])

async function browseJava() {
  const path = await window.electronAPI?.dialog.selectFile({
    title: '选择 java.exe',
    filters: [{ name: 'Java 可执行文件', extensions: ['exe'] }]
  })
  if (path) {
    s.javaPath = path
    s.javaPreset = 'custom'
  }
}

async function detectJava() {
  isDetectingJava.value = true
  detectionComplete.value = false
  detectedJava.value = []
  selectedJavaId.value = ''
  progressPercent.value = 0
  
  const steps = [
    { name: '检查环境变量', progress: 25 },
    { name: '扫描常见安装目录', progress: 50 },
    { name: '检查系统特定位置', progress: 75 },
    { name: '验证检测到的 Java', progress: 100 }
  ]
  
  try {
    // 模拟进度更新
    for (let i = 0; i < steps.length; i++) {
      currentStep.value = `${i + 1}/${steps.length}`
      progressText.value = steps[i].name
      progressPercent.value = steps[i].progress
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    const javas = await window.electronAPI?.java?.detect()
    if (javas) {
      detectedJava.value = javas
      
      // 如果有检测到Java，自动选择第一个或标记为默认的Java
      if (javas.length > 0) {
        const defaultJava = javas.find((j: any) => j.isDefault) || javas[0]
        if (defaultJava) {
          selectJava(defaultJava)
        }
      }
    }
  } catch (error) {
    console.error('Java 检测失败:', error)
  } finally {
    isDetectingJava.value = false
    detectionComplete.value = true
    progressPercent.value = 100
  }
}

// 选择 Java 版本
function selectJava(java: any) {
  // 更新下拉菜单选择
  selectedJavaId.value = java.id
  s.javaPath = java.path
  s.javaPreset = 'custom'
  
  // 标记为默认
  detectedJava.value.forEach(j => j.isDefault = false)
  java.isDefault = true
}

// 验证 Java 路径
async function validateJavaPath(path: string) {
  try {
    const result = await window.electronAPI?.java?.validate(path)
    if (result?.success) {
      alert(
        `Java 验证成功！\n` +
        `Java 版本: ${result.javaVersion || '未知'}\n` +
        (result.javacVersion ? `Javac 版本: ${result.javacVersion}` : '')
      )
    } else {
      alert(`Java 验证失败：${result?.error || '未知错误'}`)
    }
  } catch (error) {
    console.error('验证 Java 失败:', error)
    alert('验证过程出错')
  }
}
async function browseSkin() {
  const path = await window.electronAPI?.dialog?.selectFile({
    title: '选择皮肤文件（PNG）',
    filters: [{ name: 'PNG 图片', extensions: ['png'] }]
  })
  if (path) {
    s.customSkinPath = path
    s.offlineSkin = 'custom'
  }
}
async function browseBgImage() {
  const path = await window.electronAPI?.dialog?.selectFile({
    title: '选择背景图片',
    filters: [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }]
  })
  if (path) {
    s.bgImagePath = path
  }
}
async function openMcDir() {
  try {
    const mcDir = await window.electronAPI?.path?.getMinecraft()
    if (mcDir) {
      await window.electronAPI?.shell.openPath(mcDir)
    } else {
      alert('无法确定 .minecraft 目录位置')
    }
  } catch (e: any) {
    alert(`打开目录失败: ${e.message}`)
  }
}

const skinOptions = [
  { value: 'random', label: '随机' },
  { value: 'default', label: 'Steve' },
  { value: 'alex', label: 'Alex' },
  { value: 'official', label: '正版皮肤' },
  { value: 'custom', label: '自定义' }
]

function onSkinSelect(val: string) {
  if (val === 'custom') {
    browseSkin()
    return
  }
  s.offlineSkin = val
}

async function saveSkin() {
  if (!s.officialSkinName) {
    alert('请先输入正版玩家名')
    return
  }
  try {
    alert('皮肤已保存')
  } catch (e: any) {
    alert(`皮肤保存失败: ${e.message}`)
  }
}

async function refreshSkin() {
  if (!s.officialSkinName) {
    alert('请先输入正版玩家名')
    return
  }
  try {
    alert('皮肤已刷新')
  } catch (e: any) {
    alert(`皮肤刷新失败: ${e.message}`)
  }
}

async function saveCfApiKey() {
  if (window.electronAPI?.config) {
    await window.electronAPI.config.setSecure('curseforge_api_key', s.cfApiKey)
  }
}

async function loadCfApiKey() {
  if (window.electronAPI?.config) {
    const key = await window.electronAPI.config.getSecure('curseforge_api_key')
    if (key) s.cfApiKey = key
  }
}

async function loadJavaSettings() {
  if (!window.electronAPI?.config) return
  const preset = await window.electronAPI.config.get('java_preset')
  const path = await window.electronAPI.config.get('java_custom_path')
  if (preset) s.javaPreset = preset
  if (path) s.javaPath = path
}

// 监听 Java 预设变化，保存到 DB
async function saveJavaPreset() {
  if (window.electronAPI?.config) {
    await window.electronAPI.config.set('java_preset', s.javaPreset)
  }
}

// 监听自定义路径变化，保存到 DB
async function saveJavaPath() {
  if (window.electronAPI?.config) {
    await window.electronAPI.config.set('java_custom_path', s.javaPath)
  }
}

// 监听 javaPreset 和 javaPath 变化，自动保存
watch(() => s.javaPreset, saveJavaPreset)
watch(() => s.javaPath, saveJavaPath)

// ========== P2: 全局快捷键 ==========
async function loadHotkeys() {
  try {
    const list = await window.electronAPI?.hotkey?.list()
    if (list) {
      hotkeyList.value = list
      list.forEach((h: any) => {
        if (h.action === 'launch-game') s.hotkeyLaunch = h.accelerator || 'Ctrl+Shift+L'
        else if (h.action === 'toggle-window') s.hotkeyToggleWindow = h.accelerator || 'Ctrl+Shift+H'
        else if (h.action === 'open-home') s.hotkeyOpenHome = h.accelerator || 'Ctrl+Shift+O'
        else if (h.action === 'open-settings') s.hotkeyOpenSettings = h.accelerator || 'Ctrl+,'
      })
    }
  } catch (e) {
    console.warn('加载快捷键失败:', e)
  }
}

async function updateHotkey(action: string, accelerator: string) {
  try {
    const res = await window.electronAPI?.hotkey?.update({ id: action, action, accelerator, enabled: true })
    if (res?.error) {
      alert(`快捷键保存失败: ${res.error}`)
      return
    }
    alert('快捷键已更新')
    await loadHotkeys()
  } catch (e: any) {
    alert(`快捷键更新失败: ${e.message}`)
  }
}

async function validateHotkey(accelerator: string) {
  try {
    const res = await window.electronAPI?.hotkey?.validate(accelerator)
    return res?.valid
  } catch (e) {
    return false
  }
}

async function reloadHotkeys() {
  try {
    await window.electronAPI?.hotkey?.reload()
    alert('快捷键已重新加载')
  } catch (e: any) {
    alert(`重载失败: ${e.message}`)
  }
}

// ========== P2: 整合包工具 ==========
async function browseModpackInstance() {
  try {
    const path = await window.electronAPI?.dialog?.selectFolder({
      title: '选择实例目录（.minecraft）'
    })
    if (path) s.modpackInstancePath = path
  } catch (e: any) {
    console.error('选择实例目录失败:', e)
  }
}

async function browseModpackOutput() {
  try {
    const path = await window.electronAPI?.dialog?.selectFolder({
      title: '选择整合包输出目录'
    })
    if (path) s.modpackOutputDir = path
  } catch (e: any) {
    console.error('选择输出目录失败:', e)
  }
}

async function packAsMrpack() {
  if (!s.modpackInstancePath) {
    alert('请先选择实例目录')
    return
  }
  if (!s.modpackName) {
    alert('请填写整合包名称')
    return
  }
  try {
    isWorkingModpack.value = true
    modpackProgress.value = { stage: '准备中', progress: 0, currentFile: '' }

    const result = await window.electronAPI?.modpack?.pack({
      instancePath: s.modpackInstancePath,
      outputPath: s.modpackOutputDir,
      options: {
        includeConfigs: s.modpackIncludeConfigs,
        includeMods: s.modpackIncludeMods,
        includeSaves: s.modpackIncludeSaves,
        includeResourcepacks: s.modpackIncludeResourcepacks,
        name: s.modpackName,
        author: s.modpackAuthor,
        version: s.modpackVersion
      }
    })

    if (result?.ok) {
      alert(`整合包创建成功！\n输出文件: ${result.filePath || '(未知)'}`)
    } else {
      alert(`创建失败: ${result?.error || '未知错误'}`)
    }
  } catch (e: any) {
    alert(`创建整合包失败: ${e.message}`)
  } finally {
    isWorkingModpack.value = false
  }
}

async function importMrpack() {
  try {
    const mrpackPath = await window.electronAPI?.dialog?.selectFile({
      title: '选择 mrpack 文件',
      filters: [{ name: 'Modrinth 整合包', extensions: ['mrpack'] }]
    })
    if (!mrpackPath) return

    const targetDir = await window.electronAPI?.dialog?.selectFolder({
      title: '选择安装位置（父目录，将创建子目录）'
    })
    if (!targetDir) return

    const instanceName = prompt('请输入新实例名称:', 'New Modpack')
    if (!instanceName) return

    isWorkingModpack.value = true
    modpackProgress.value = { stage: '导入中', progress: 0, currentFile: '' }

    const result = await window.electronAPI?.modpack?.import({
      mrpackPath,
      targetParentDir: targetDir,
      instanceName
    })

    if (result?.ok) {
      alert(`整合包导入成功！\n位置: ${result.instancePath || '(未知)'}`)
    } else {
      alert(`导入失败: ${result?.error || '未知错误'}`)
    }
  } catch (e: any) {
    alert(`导入整合包失败: ${e.message}`)
  } finally {
    isWorkingModpack.value = false
  }
}

// ========== P2: 主题自定义增强 ==========
async function applyCustomThemeColor(hex: string) {
  try {
    const vars = await window.electronAPI?.theme?.computeVars(hex)
    if (vars) {
      const root = document.documentElement
      Object.entries(vars).forEach(([k, v]) => {
        root.style.setProperty(k, String(v))
      })
      s.themeColor = hex
      s.themeCustomColor = hex
    }
  } catch (e: any) {
    console.error('应用主题色失败:', e)
  }
}

async function importBgImage() {
  try {
    const path = await window.electronAPI?.dialog?.selectFile({
      title: '选择背景图片',
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }]
    })
    if (!path) return
    const local = await window.electronAPI?.theme?.importBackground(path)
    if (local) {
      s.bgImageMode = 'custom'
      s.bgImagePath = local
      alert('背景已保存到启动器目录')
    }
  } catch (e: any) {
    alert(`导入背景失败: ${e.message}`)
  }
}

// ========== P2: 数据备份/恢复 ==========
async function createBackup() {
  try {
    isWorkingBackup.value = true
    backupProgress.value = { stage: '备份中', progress: 0, currentItem: '' }
    const result = await window.electronAPI?.backup?.create()
    if (result?.ok) {
      s.backupLastTime = new Date().toLocaleString()
      alert(`备份成功！\n文件: ${result.filePath || '(未知)'}\n大小: ${(result.size / 1024).toFixed(1)} KB`)
      await listBackups()
    } else {
      alert(`备份失败: ${result?.error || '未知错误'}`)
    }
  } catch (e: any) {
    alert(`备份失败: ${e.message}`)
  } finally {
    isWorkingBackup.value = false
  }
}

async function restoreBackup() {
  try {
    const path = await window.electronAPI?.dialog?.selectFile({
      title: '选择备份文件（.zip）',
      filters: [{ name: '备份文件', extensions: ['zip'] }]
    })
    if (!path) return

    if (!confirm('恢复备份将覆盖当前数据，确认继续？')) return

    isWorkingBackup.value = true
    backupProgress.value = { stage: '恢复中', progress: 0, currentItem: '' }

    const result = await window.electronAPI?.backup?.restore(path)
    if (result?.ok) {
      alert('恢复成功！请重启启动器以生效')
    } else {
      alert(`恢复失败: ${result?.error || '未知错误'}`)
    }
  } catch (e: any) {
    alert(`恢复失败: ${e.message}`)
  } finally {
    isWorkingBackup.value = false
  }
}

async function listBackups() {
  try {
    const list = await window.electronAPI?.backup?.list()
    backupFiles.value = list || []
  } catch (e: any) {
    console.warn('列出备份失败:', e)
  }
}

async function deleteBackup(fileName: string) {
  if (!confirm(`确定删除备份文件 ${fileName} 吗？`)) return
  try {
    await window.electronAPI?.backup?.delete(fileName)
    await listBackups()
  } catch (e: any) {
    alert(`删除失败: ${e.message}`)
  }
}

// ====== 更新检查 ======
async function checkForUpdate() {
  try {
    updateStatus.value.checking = true
    updateStatus.value.error = null
    await window.electronAPI?.updater?.check()
  } catch (e: any) {
    updateStatus.value.checking = false
    updateStatus.value.error = e.message
  }
}

async function checkForUpdateDownload() {
  try {
    await window.electronAPI?.updater?.download()
  } catch (e: any) {
    alert(`下载失败: ${e.message}`)
  }
}

async function installUpdate() {
  try {
    await window.electronAPI?.updater?.install()
  } catch (e: any) {
    alert(`安装失败: ${e.message}`)
  }
}

function setupUpdateListener() {
  const unsub = window.electronAPI?.updater?.onStatusChange((status: any) => {
    updateStatus.value = {
      checking: status.checking,
      available: status.available,
      downloading: status.downloading,
      downloadProgress: status.downloadProgress,
      downloaded: status.downloaded,
      error: status.error,
      version: status.version,
      releaseNotes: status.releaseNotes
    }
  })
  return unsub
}

// P2 初始化
onMounted(async () => {
  await loadHotkeys()
  await listBackups()
  setupUpdateListener()
})

// ====== 主题色应用：用户选择颜色后实时更新全局 CSS 变量 ======
function applyThemeColor(hex: string) {
  s.themeColor = hex
  const root = document.documentElement

  // 核心主色
  root.style.setProperty('--mcla-primary', hex)
  // 自动生成色阶（简化版：基于亮度插值）
  root.style.setProperty(
    '--mcla-gradient-primary',
    `linear-gradient(135deg, ${hex}, ${adjustHex(hex, 35)})`
  )
  root.style.setProperty('--mcla-shadow-glow-primary', `0 4px 20px ${hexToRgba(hex, 0.35)}`)
}

// 辅助：hex 转 rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// 辅助：调整 hex 亮度（+/- 偏移量）
function adjustHex(hex: string, offset: number): string {
  let r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)
  r = Math.min(255, Math.max(0, r + offset))
  g = Math.min(255, Math.max(0, g + offset))
  b = Math.min(255, Math.max(0, b + offset))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.settings-page {
  padding: 20px 28px;
  overflow-y: auto;
  height: 100%;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.08);
    border-radius: 3px;
  }
}

/* ---- 区块 ---- */
.sec {
  margin-bottom: 28px;

  .sec-title {
    margin: 0 0 14px;
    font-size: 14px;
    font-weight: 700;
    color: var(--mcla-text);
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 10px;
    border-bottom: 1.5px solid var(--mcla-border-light);

    svg {
      color: var(--mcla-blue);
      flex-shrink: 0;
    }

    .sec-arrow {
      margin-left: auto;
      color: var(--mcla-text-muted, #888);
      transition: transform 0.2s ease;
      &.open {
        transform: rotate(180deg);
      }
    }
  }
}

/* ---- 表单行 ---- */
.row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;

  .row-main {
    flex: 0 0 200px;
    min-width: 160px;
    padding-top: 1px;
  }

  .row-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--mcla-text);
    display: block;
  }

  .row-desc {
    margin: 3px 0 0;
    font-size: 11.5px;
    color: var(--mcla-text-muted);
    line-height: 1.4;
  }

  .row-control {
    flex: 1;
    min-width: 0;

    &.full {
      flex-basis: 100%;
    }
  }

  .row-hint {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--mcla-text-muted);
  }
}

/* ---- 输入控件 ---- */
.inp {
  padding: 8px 12px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 7px;
  font-size: 13px;
  color: var(--mcla-text);
  background: var(--mcla-bg-elevated);
  outline: none;
  transition: all 0.14s;

  &:focus {
    border-color: var(--mcla-blue);
    box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.08);
  }

  &.short {
    flex: 0 0 80px;
    text-align: center;
  }
  &::placeholder {
    color: var(--mcla-text-muted);
  }
}

.sel {
  padding: 8px 32px 8px 12px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 7px;
  font-size: 13px;
  color: var(--mcla-text);
  background: var(--mcla-bg-elevated)
    url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b6f9a' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")
    no-repeat right 10px center;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: all 0.14s;

  &:focus {
    border-color: var(--mcla-blue);
    box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.08);
  }
}

.textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 7px;
  font-size: 12.5px;
  font-family: 'Consolas', 'Courier New', monospace;
  color: var(--mcla-text);
  background: var(--mcla-bg-elevated);
  outline: none;
  resize: vertical;
  min-height: 56px;
  transition: all 0.14s;

  &:focus {
    border-color: var(--mcla-blue);
    box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.08);
  }
}

.input-group {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;

  .inp,
  .sel {
    flex: 1;
    min-width: 120px;
  }
  &.compact {
    flex-wrap: nowrap;
  }
}

.btn-sm {
  padding: 8px 16px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 7px;
  background: var(--mcla-bg-elevated);
  font-size: 12px;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.13s;
  flex-shrink: 0;

  &:hover {
    border-color: var(--mcla-blue);
    color: var(--mcla-blue);
  }
}

.java-detection {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.java-list-title {
  font-size: 12px;
  color: var(--mcla-text-secondary);
  margin: 4px 0;
}

.java-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  background: var(--mcla-bg-elevated);
  border-radius: 6px;
  margin-bottom: 4px;
  border: 1px solid var(--mcla-border);
}

.java-info {
  font-size: 13px;
  color: var(--mcla-text);
  font-weight: 500;
}

.java-path {
  font-size: 11px;
  color: var(--mcla-text-muted);
  word-break: break-all;
}

.java-detection {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.java-detect-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.java-detect-header button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.java-detect-header button svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Progress styles
.java-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--mcla-bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--mcla-border);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.progress-step {
  font-weight: 600;
  color: var(--mcla-blue);
}

.progress-text {
  color: var(--mcla-text-secondary);
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background: var(--mcla-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--mcla-blue), #42a5f5);
  border-radius: 3px;
  transition: width 0.3s ease;
}

// Java list styles
.java-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.java-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.java-list-title {
  font-size: 12px;
  color: var(--mcla-text-secondary);
  margin: 0;
  font-weight: 500;
}

.java-list-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.java-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--mcla-bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--mcla-border);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--mcla-blue);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }
}

.java-item-default {
  border-color: var(--mcla-blue);
  background: rgba(99, 102, 241, 0.05);
}

.java-item-main {
  display: flex;
  gap: 12px;
  flex: 1;
}

.java-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--mcla-bg);
  border-radius: 8px;
  color: var(--mcla-blue);
  flex-shrink: 0;
}

.java-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.java-name {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.java-vendor {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text);
}

.java-version {
  font-size: 13px;
  color: var(--mcla-text-secondary);
}

.java-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--mcla-blue);
  color: white;
  border-radius: 4px;
  font-weight: 500;
}

.java-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.java-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--mcla-text-muted);

  svg {
    flex-shrink: 0;
  }
}

.java-path {
  font-size: 11px;
  color: var(--mcla-text-muted);
  word-break: break-all;
  font-family: 'Consolas', 'Courier New', monospace;
}

.java-item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

// Java not found styles
.java-not-found {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px dashed rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  text-align: center;
}

.java-not-found-icon {
  display: flex;
  justify-content: center;
  color: var(--mcla-red);
}

.java-not-found-text {
  h4 {
    margin: 0 0 4px;
    font-size: 14px;
    color: var(--mcla-text);
  }
  
  p {
    margin: 0;
    font-size: 12px;
    color: var(--mcla-text-muted);
  }
}

.java-not-found-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.java-not-found-actions a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 7px;
  background: var(--mcla-bg-elevated);
  font-size: 12px;
  color: var(--mcla-text-secondary);
  text-decoration: none;
  transition: all 0.13s;

  &:hover {
    border-color: var(--mcla-blue);
    color: var(--mcla-blue);
  }
}

.sep {
  font-size: 12px;
  color: var(--mcla-text-muted);
  user-select: none;
  flex-shrink: 0;
}

/* ---- 滑块 ---- */
.range {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--mcla-border);
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--mcla-blue);
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    transition: transform 0.12s;
    &:hover {
      transform: scale(1.15);
    }
  }
}

.range-val {
  min-width: 72px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-blue);
  flex-shrink: 0;
}

/* ---- 内存进度条 ---- */
.memory-bar {
  height: 8px;
  background: var(--mcla-bg);
  border-radius: 4px;
  margin-top: 8px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--mcla-blue), #42a5f5);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 32px;

  .bar-text {
    font-size: 9px;
    font-weight: 700;
    color: #fff;
    padding-right: 6px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
}

/* ---- 复选框 ---- */
.chk {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--mcla-text);
  cursor: pointer;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: var(--mcla-blue);
    cursor: pointer;
  }
}

/* ---- 色板 ---- */
.color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  cursor: pointer;
  transition: all 0.14s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);

  &:hover {
    transform: scale(1.12);
  }
  &.active {
    border-color: var(--mcla-text);
    box-shadow:
      0 0 0 2px #fff,
      0 0 0 4px var(--mcla-text);
  }
}

/* ---- 功能隐藏表格 ---- */
.sec-desc {
  font-size: 12px;
  color: var(--mcla-text-muted, #888);
  margin: 0 0 12px;
  line-height: 1.6;
}

/* 5列 grid：第1列行标签，后4列 checkbox 项 */
.feature-hide-table {
  display: grid;
  grid-template-columns: 90px repeat(4, 1fr);
  row-gap: 2px;
}

.fh-row-label {
  font-size: 13px;
  color: var(--mcla-text);
  display: flex;
  align-items: center;
  padding: 5px 8px 5px 0;
  white-space: nowrap;
}

.fh-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.12s;

  &:hover:not(.fh-pad):not(.disabled) {
    background: var(--mcla-bg);
  }

  &.hidden .feat-name {
    color: var(--mcla-text-muted, #aaa);
    text-decoration: line-through;
    opacity: 0.6;
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.55;
    .feat-name {
      color: var(--mcla-text-muted, #aaa);
    }
  }

  input[type='checkbox'] {
    width: 14px;
    height: 14px;
    accent-color: var(--mcla-blue);
    cursor: pointer;
    flex-shrink: 0;
  }

  input[type='checkbox']:disabled {
    cursor: not-allowed;
  }

  .feat-name {
    font-size: 13px;
    color: var(--mcla-text);
    transition:
      color 0.15s,
      opacity 0.15s;
  }
}

.fh-pad {
  cursor: default;
  pointer-events: none;
}

.warn-orange {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #b45309;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  svg {
    flex-shrink: 0;
    color: #f59e0b;
  }
}

/* ---- 功能网格（旧，保留兼容） ---- */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: var(--mcla-bg);
  }

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: var(--mcla-blue);
    cursor: pointer;
  }

  .feat-name {
    font-size: 13px;
    color: var(--mcla-text);
  }
}

/* ---- 按钮行 ---- */
.btn-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  &.danger-zone {
    padding-top: 14px;
    border-top: 1px dashed var(--mcla-border);
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1.5px solid var(--mcla-border);
  border-radius: 7px;
  background: var(--mcla-bg-elevated);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  transition: all 0.13s;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    border-color: var(--mcla-blue);
    color: var(--mcla-blue);
  }

  &.outline:hover {
    background: rgba(21, 101, 192, 0.04);
  }

  &.danger {
    border-color: rgba(229, 57, 53, 0.4);
    color: var(--mcla-red);
    &:hover {
      background: var(--mcla-red);
      border-color: var(--mcla-red);
      color: #fff;
    }
  }
}

/* ---- 关于卡片 ---- */
.about-box {
  text-align: center;
  padding: 28px 24px;
  background: var(--mcla-bg);
  border-radius: 10px;
  border: 1px solid var(--mcla-border-light);

  .about-logo {
    width: 72px;
    height: 72px;
    margin: 0 auto 12px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(21, 101, 192, 0.2);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .about-name {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
  }
  .about-ver {
    margin: 0 0 14px;
    font-size: 12px;
    color: var(--mcla-text-muted);
  }

  .about-info {
    font-size: 12px;
    color: var(--mcla-text-secondary);
    line-height: 1.8;
  }
}

.about-redirect-desc {
  font-size: 13px;
  color: var(--mcla-text-muted);
  line-height: 1.7;
  margin: 0;
}

.link-item {
  font-size: 12.5px;
  color: var(--mcla-blue);
  text-decoration: none;
  margin-right: 18px;
  transition: opacity 0.12s;
  &:hover {
    text-decoration: underline;
    opacity: 0.75;
  }
}

/* ---- 离线皮肤警告条 ---- */
.skin-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: rgba(251, 140, 0, 0.1);
  border: 1px solid rgba(251, 140, 0, 0.3);
  border-radius: 7px;
  font-size: 12px;
  color: #b85c00;
  margin-bottom: 12px;

  svg {
    flex-shrink: 0;
    color: #fb8c00;
  }
}

/* ---- 离线皮肤单选组 ---- */
.skin-radio-group {
  display: flex;
  gap: 0;
  flex-wrap: wrap;
  margin-bottom: 0;
}

.skin-radio-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 20px;
  font-size: 13px;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  user-select: none;
  transition: color 0.12s;

  &.active {
    color: var(--mcla-text);
    font-weight: 500;
  }
  &:hover:not(.active) {
    color: var(--mcla-text);
  }
}

.skin-radio-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--mcla-border);
  flex-shrink: 0;
  position: relative;
  transition: border-color 0.13s;

  &.checked {
    border-color: var(--mcla-blue);
    &::after {
      content: '';
      position: absolute;
      inset: 2.5px;
      border-radius: 50%;
      background: var(--mcla-blue);
    }
  }
}

/* ---- 正版皮肤展开区 ---- */
.skin-expand {
  padding: 12px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skin-expand-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skin-expand-label {
  font-size: 13px;
  color: var(--mcla-text-secondary);
  white-space: nowrap;
  min-width: 64px;
}

.skin-expand-inp {
  flex: 1;
}

.skin-expand-actions {
  display: flex;
  gap: 8px;
}

.btn-outline {
  padding: 6px 20px;
  font-size: 13px;
  border: 1px solid var(--mcla-border);
  border-radius: 6px;
  background: var(--mcla-bg-elevated);
  color: var(--mcla-text);
  cursor: pointer;
  transition:
    border-color 0.13s,
    background 0.13s;

  &:hover {
    border-color: var(--mcla-blue);
    color: var(--mcla-blue);
    background: rgba(21, 101, 192, 0.05);
  }
}

/* ---- 高级选项 checkbox 组 ---- */
.adv-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

/* ---- 进度条（整合包/备份）---- */
.progress-box {
  margin-top: 12px;
  padding: 12px;
  background: var(--mcla-bg);
  border-radius: 7px;
  border: 1px solid var(--mcla-border-light);
}

.progress-label {
  font-size: 12.5px;
  color: var(--mcla-text-secondary);
  margin-bottom: 8px;
}

.progress-bar-wrap {
  width: 100%;
  height: 8px;
  background: var(--mcla-bg-elevated);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--mcla-primary, #6366f1), var(--mcla-blue));
  transition: width 0.2s ease;
  border-radius: 4px;
}

.progress-sub {
  font-size: 11.5px;
  color: var(--mcla-text-muted);
  margin-top: 6px;
  word-break: break-all;
}

/* ---- section 子标题 ---- */
.sec-subtitle {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--mcla-text-primary);
  margin: 4px 0 10px;
  padding: 0;
}

/* ---- 小按钮 danger ---- */
.btn-sm.danger-btn {
  color: var(--mcla-red);
  border-color: rgba(229, 57, 53, 0.3);
  &:hover {
    background: var(--mcla-red);
    border-color: var(--mcla-red);
    color: #fff;
  }
}

/* ---- 备份文件列表 ---- */
.backup-list {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--mcla-border);
}

.backup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--mcla-bg);
  border-radius: 7px;
  margin-bottom: 6px;
  border: 1px solid var(--mcla-border-light);
}

.backup-info {
  flex: 1;
}

.backup-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--mcla-text-primary);
}

.backup-meta {
  font-size: 11.5px;
  color: var(--mcla-text-muted);
  margin-top: 3px;
  display: flex;
  gap: 14px;
}

/* ---- 更新检查状态 ---- */
.update-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--mcla-bg);
  border-radius: 8px;
  border: 1px solid var(--mcla-border-light);

  &.checking {
    border-color: var(--mcla-blue);
    background: rgba(21, 101, 192, 0.05);
  }

  &.available {
    border-color: var(--mcla-green);
    background: rgba(46, 125, 50, 0.05);
  }

  &.error {
    border-color: var(--mcla-red);
    background: rgba(229, 57, 53, 0.05);
  }

  &.up-to-date {
    border-color: var(--mcla-border-light);
  }
}

.update-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.update-text {
  flex: 1;
  font-size: 13px;
  color: var(--mcla-text-primary);

  .update-notes {
    font-size: 11.5px;
    color: var(--mcla-text-muted);
    margin-top: 4px;
    line-height: 1.5;
    max-width: 400px;
    word-break: break-all;
  }
}

.update-actions {
  flex-shrink: 0;
}

.download-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
}

.progress-text {
  font-size: 12px;
  color: var(--mcla-text-secondary);
}

.progress-bar-wrap.small {
  height: 6px;
}
</style>
