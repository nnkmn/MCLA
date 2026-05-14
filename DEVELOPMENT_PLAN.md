# MCLA 开发计划

> 从零到一，完整的功能规划与技术路线图
>
> 当前版本：v0.3.0（28,000+ 行代码）
>
> 最后更新：2026-05-08

---

## 版本路线图总览

```
v0.1.0  ─→  v0.2.0  ─→  v0.3.0  ─→  v0.4.0  ─→  v0.5.0  ─→  v1.0.0  ─→  v2.0.0
 基础框架    核心认证    功能完善    体验优化    高级功能    稳定发布    生态扩展
 (已完成)   (已完成)   (已完成)   (开发中)   (计划中)   (计划中)   (远景)
```

---

## Phase 1：基础框架 — v0.1.0 ✅

**目标**：搭建启动器骨架，跑通基本流程

> 发布日期：2026-04-24

### 1.1 项目初始化

- [x] Electron + Vue 3 + TypeScript 项目脚手架（electron-vite）
- [x] Vite 构建配置（主进程 / preload / 渲染进程三端分离）
- [x] TypeScript 严格模式（tsconfig.node.json + tsconfig.web.json）
- [x] electron-builder 打包配置（Windows NSIS）
- [x] 像素风 CSS 设计系统（`pixel-ui.css`，8px 间距、渐变按钮、发光阴影）
- [x] Press Start 2P 像素字体接入
- [x] 应用图标制作（ICO / ICNS / PNG，多尺寸）

### 1.2 核心架构

- [x] Electron 主进程入口（`main.ts`）
- [x] 预加载脚本 + IPC 桥接（`preload.ts`）
- [x] SQLite 数据库初始化（`database.ts`，6 张表）
- [x] IPC 通道类型系统（`ipc.types.ts`，30+ 通道）
- [x] 数据库表类型定义（`database.types.ts`）

### 1.3 基础页面

- [x] 首页（`HomePage.vue`）
- [x] 侧边栏导航布局
- [x] Vue Router 路由配置
- [x] 深色主题全局样式

### 1.4 游戏启动基础

- [x] 游戏启动服务骨架（`game.launcher.service.ts`）
- [x] 启动配置管理（`launch.config.service.ts`）
- [x] 版本文件补全（检测缺失 library/client jar，BMCLAPI 自动下载修复）
- [x] 自定义 .minecraft 路径支持
- [x] 窗口控制 IPC（最小化、关闭、最大化）

### 1.5 版本管理基础

- [x] BMCLAPI 版本列表集成（`versions.ts`）
- [x] 版本安装（下载 JAR + JSON）
- [x] 本地版本扫描
- [x] 版本列表页面（`VersionsPage.vue`）

### 1.6 ModLoader 安装

- [x] Fabric / Forge / NeoForge / Quilt 安装框架（`modloader.service.ts`）
- [x] ModLoader 类型定义

### 1.7 打包与发布

- [x] Windows NSIS 安装包（electron-builder 25.x）
- [x] 修复打包后黑屏问题（loadFile 绝对路径）
- [x] 修复任务栏图标问题（nativeImage.createFromPath）
- [x] 修复 ICO 格式兼容性（PNG-in-ICO ICNP 格式）

---

## Phase 2：核心认证 — v0.2.0 ✅

**目标**：完整的微软正版登录 + Mod 下载双平台

> 发布日期：2026-04-26

### 2.1 微软 OAuth 认证

- [x] Device Code Flow 实现（`microsoft.auth.ts`）
  - [x] 请求设备码 → 弹窗展示
  - [x] 用户浏览器确认 → 轮询 token
  - [x] Xbox Live 认证 → XSTS Token
  - [x] XSTS Token → Minecraft Bearer Token
  - [x] Minecraft Profile 获取（用户名、UUID、皮肤）
- [x] Token 自动刷新（静默刷新，过期前续期）
- [x] 登录进度实时推送（IPC event: `login:progress`）
- [x] 登录取消支持
- [x] 账户页面 UI（`AccountPage.vue`，设备码弹窗 + 进度状态机）
- [x] 账户 Store（Pinia，多账户切换）
- [x] 离线模式（UUID/用户名生成）

### 2.2 账户存储

- [x] safeStorage 加密存储 token（`crypto.ts`）
- [x] 账户数据库 CRUD（`accounts.ts`）
- [x] 账户 IPC 通道（`account.ipc.ts`）

### 2.3 Mod 下载平台

- [x] CurseForge API 集成（`curseforge.service.ts`）
  - [x] Mod 搜索（分页、筛选）
  - [x] Mod 详情（描述、截图、版本列表）
  - [x] 文件下载
- [x] Modrinth API 集成（`modrinth.service.ts`）
  - [x] Mod 搜索
  - [x] Mod 详情
  - [x] 文件下载
- [x] 下载管理服务（`download.service.ts`）
- [x] 下载页面 UI（`DownloadsPage.vue`，分类/搜索/下载）
- [x] 下载队列管理

### 2.4 崩溃监控

- [x] 崩溃日志自动捕获（`crash.service.ts`）
- [x] JVM 错误分析
- [x] 崩溃报告生成

### 2.5 皮肤管理

- [x] 皮肤下载与缓存（`skin.service.ts`）
- [x] 前端皮肤渲染（App.vue + AccountPage.vue）

### 2.6 基础设施

- [x] 分级日志系统（`logger.ts`，DEBUG/INFO/WARN/ERROR + 文件输出）
- [x] 文件哈希校验（`hash.ts`，SHA1/MD5 流式）
- [x] 跨平台 Java 探测（`platform.ts`）
- [x] macOS ICNS 图标
- [x] 全局 shell IPC（打开文件夹、不存在自动创建）

---

## Phase 3：功能完善 — v0.3.0 ✅

**目标**：完善版本管理交互、真实游戏启动、实例系统

> 发布日期：2026-04-28

### 3.1 版本设置

- [x] 修改版本名称、版本描述
- [x] 收藏夹切换
- [x] 快捷方式：一键打开版本/存档/Mod 文件夹
- [x] 导出启动脚本（.bat 批处理）
- [x] 删除版本（双重确认）
- [x] 自定义输入弹窗（替代 Electron 不兼容的 prompt()）

### 3.2 游戏启动

- [x] 完整的游戏启动流程（IPC 连接真实服务）
- [x] 启动前账号检测（未登录引导）
- [x] 版本选择持久化（localStorage 恢复 + 文件系统真实版本名）
- [x] 启动进度实时推送（`game:progress` IPC）
- [x] Minecraft 进程管理

### 3.3 实例系统

- [x] 实例 Store（Pinia）
- [x] 实例列表页面（`InstancesPage.vue`）
- [x] 实例详情页面（`InstanceDetail.vue`）
- [x] 创建游戏实例（选择版本 + ModLoader）
- [x] 实例单字段快捷更新 API

### 3.4 Mod 管理

- [x] Mod 文件夹扫描
- [x] 批量安装 Mod（文件多选）
- [x] 全选/取消全选
- [x] 一键打开 Mod 文件夹
- [x] 跳转下载页获取新 Mod

### 3.5 Java 管理

- [x] Java 自动检测
- [x] 手动指定 Java 路径
- [x] 推荐版本匹配（`getRecommendedJavaVersion`）
- [x] Java 管理 Store

### 3.6 适配器架构

- [x] IGameAdapter 接口（`IGameAdapter.ts`）
- [x] Minecraft Java Edition 适配器（`minecraft-java.adapter.ts`）
- [x] 适配器注册中心（`registry.ts`）

---

## Phase 4：体验优化 — v0.4.0 ✅

**目标**：Bug 修复 + 动态版本号 + 文档对齐

> 发布日期：2026-05-14

### 4.1 P1 补全（已完成）

- [x] 修复 `isVersionInstalled()` 对 ModLoader 版本误判（继承版本 now 正确识别）
- [x] 新增 `versions:is-installed` IPC 通道
- [x] `modloader.ipc.ts` 重写，接入真实 `ModLoaderService`
- [x] 皮肤系统完整接入前端渲染（`AccountPage.vue` 渲染皮肤头像）
- [x] `MorePage.vue` 版本号改为动态获取（`app:get-version` IPC）
- [x] git commit v0.3.0 全部改动（86 files，commit `7d591bc`）

### 4.2 P2 功能（部分完成）

- [x] Mod 自动更新检测（v0.3.0 已完成）
- [ ] 背景自定义（上传图片）
- [ ] 主题自定义（色盘 / 主题编辑器）
- [ ] 快捷键系统（全局快捷键启动游戏）
- [ ] 整合包创建工具（打包 Mod + 资源包）

---

## Phase 5：高级功能 — v0.5.0 📋 计划中

**目标**：专业级功能，对齐主流启动器

> 预计发布：2026-06

### 5.1 数据与同步

- [ ] 数据备份/迁移（一键导出所有账户、配置、实例数据）
- [ ] 配置云同步（可选，WebDAV / 自定义服务器）
- [ ] 跨设备配置同步

### 5.2 Mod 增强

- [ ] Mod 依赖管理（自动安装依赖 Mod）
- [ ] Mod 冲突检测（提示不兼容的 Mod 组合）
- [ ] Mod 分类/标签管理
- [ ] CurseForge + Modrinth 双源自动更新

### 5.3 下载增强

- [ ] 多线程下载（大文件分片并发）
- [ ] 下载限速
- [ ] 断点续传
- [ ] CDN 智能选择（自动测速，选择最快镜像）

### 5.4 社区功能

- [ ] 整合包市场（浏览/搜索/一键安装社区整合包）
- [ ] 整合包分享（导出为标准 mrpack/zip 格式）
- [ ] 整合包版本管理

### 5.5 UI/UX

- [ ] 浅色主题
- [ ] 动画过渡系统完善
- [ ] 多语言支持（i18n，至少中/英）
- [ ] 自定义启动页组件（用户可拖拽排列）

---

## Phase 6：稳定发布 — v1.0.0 📋 计划中

**目标**：第一个生产就绪版本，全面对齐 HMCL/PCL2 功能

> 预计发布：2026-08

### 6.1 服务器管理

- [ ] 多人游戏服务器列表（添加/编辑/删除服务器）
- [ ] 服务器延迟检测
- [ ] 一键加入服务器
- [ ] 服务器 MotD / 玩家数量显示
- [ ] 收藏服务器

### 6.2 光影/材质包

- [x] 资源包管理（已有基础）
- [ ] 光影包安装/管理
- [ ] 光影配置编辑
- [ ] 材质包预览

### 6.3 启动器自身更新

- [ ] GitHub Releases 自动检测新版本
- [ ] 后台下载安装包
- [ ] 一键更新启动器
- [ ] 增量更新（仅下载变更文件）

### 6.4 性能优化

- [ ] 渲染进程性能优化（虚拟滚动、懒加载）
- [ ] 启动速度优化（延迟加载非核心模块）
- [ ] 内存占用优化
- [ ] 大量 Mod 场景性能（1000+ Mod 扫描优化）

### 6.5 插件系统

- [ ] 插件 API 设计
- [ ] 插件沙箱（隔离运行环境）
- [ ] 插件市场（可选功能）
- [ ] Lua/JavaScript 脚本支持

### 6.6 多平台

- [ ] macOS 原生支持（arm64 + x64）
- [ ] Linux 原生支持（AppImage / deb / snap）
- [ ] Wayland 兼容

### 6.7 测试与 CI/CD

- [ ] 核心功能单元测试（Vitest）
- [ ] E2E 测试（Playwright）
- [ ] GitHub Actions CI（自动构建 + 测试）
- [ ] 自动发布到 GitHub Releases

---

## Phase 7：生态扩展 — v2.0.0 🔭 远景

**目标**：从启动器到 Minecraft 生态平台

> 预计发布：2026 Q4 或更远

### 7.1 多版本支持

- [ ] Minecraft Bedrock Edition 支持（适配器架构扩展）
- [ ] Minecraft Dungeons 支持
- [ ] 多版本游戏切换

### 7.2 社区平台

- [ ] 内置 Mod 发布平台
- [ ] 创作者中心（Mod 开发者工具链）
- [ ] 用户评价/评分系统
- [ ] 社区论坛/反馈系统

### 7.3 高级工具

- [ ] 录像功能（游戏内录制/截图）
- [ ] 存档管理（存档备份/恢复/分享）
- [ ] 世界编辑器集成
- [ ] 皮肤编辑器
- [ ] 像素画编辑器

### 7.4 网络功能

- [ ] 局域网联机助手
- [ ] 内网穿透集成
- [ ] 服务器搭建向导
- [ ] 玩家统计与成就追踪

### 7.5 AI 功能（探索性）

- [ ] AI 崩溃诊断（智能分析崩溃日志，给出修复建议）
- [ ] AI Mod 推荐（根据已安装 Mod 推荐兼容 Mod）
- [ ] AI 配置优化（根据硬件配置推荐最佳游戏参数）

---

## 技术演进计划

### 短期（v0.4 ~ v0.5）

| 方向 | 内容 |
|------|------|
| 类型安全 | 严格化 IPC 类型推导，消除 `any` |
| 代码质量 | ESLint + Prettier 统一格式， stricter TSConfig |
| 错误处理 | 统一错误类型体系，前端友好错误提示 |
| 日志增强 | 结构化日志，支持日志导出分析 |

### 中期（v1.0）

| 方向 | 内容 |
|------|------|
| 测试覆盖 | Vitest 单元测试 + Playwright E2E |
| CI/CD | GitHub Actions 自动构建/测试/发布 |
| 性能 | 虚拟滚动、Web Worker 离线计算、渲染优化 |
| 安全 | 代码签名、自动更新签名验证 |

### 长期（v2.0）

| 方向 | 内容 |
|------|------|
| 架构 | 插件系统沙箱、微前端（大型功能模块独立） |
| 多平台 | macOS/Linux 原生适配 |
| 生态 | 开放 API、第三方开发者 SDK |

---

## 里程碑时间线

```
2026-04
  ├── 04-24  v0.1.0  基础框架 ✅
  ├── 04-26  v0.2.0  核心认证 ✅
  └── 04-28  v0.3.0  功能完善 ✅

2026-05
 ├── 05-04  P1 全部完成 ✅
 ├── 05-05  项目审计通过 ✅
 ├── 05-08  v0.3.0 重新打包（版本号统一）✅
 ├── 05-08  Mod 自动更新 ✅
 ├── 05-14  v0.4.0  体验优化 ✅
 └── 05-xx  v0.5.0  P1 补全 📋

2026-06
  └── 06-xx  v0.5.0  高级功能 📋

2026-07~08
  └── 08-xx  v1.0.0  稳定发布 📋

2026 Q4+
  └── TBD    v2.0.0  生态扩展 🔭
```

---

## 设计原则

1. **务实优先** — 能用再说，不追求完美架构，先跑通再优化
2. **类型安全** — TypeScript 严格模式，IPC 通道完整类型映射
3. **模块化** — 服务层/IPC 层/前端层分离，适配器模式支持多游戏
4. **用户体验** — 每个操作都有实时反馈（进度条、状态提示、通知）
5. **安全** — token 加密存储、不存储密码、安全审计
6. **像素美学** — Press Start 2P 字体 + 暗色调 + 霓虹发光，保持统一视觉风格

---

> 本文档随项目开发持续更新。每个版本发布后同步更新对应 Phase 的完成状态。
