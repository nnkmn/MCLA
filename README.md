# MCLA

<div align="center">

![MCLA](https://img.shields.io/badge/MCLA-v0.3.0-6366f1?style=for-the-badge&labelColor=1e1e2e)
![Electron](https://img.shields.io/badge/Electron-33-478cbf?style=flat-square&logo=electron&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.5-4db08b?style=flat-square&logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square)

**MCLA - Minecraft Launcher Advanced**
一个现代化的 Minecraft 启动器，支持微软正版登录、版本管理、Mod 下载与管理、崩溃监控

_Powered by Electron + Vue 3 + TypeScript + Pixel UI_

</div>

---

## 功能概览

### 核心功能

| 功能 | 说明 |
|------|------|
| **微软账号登录** | Device Code Flow + Xbox/XSTS/Minecraft 三步认证链，token 自动刷新，多账户切换，离线模式 |
| **游戏启动** | 完整的游戏启动流程（Java 参数拼装、类路径构建、 natives 提取），启动进度实时推送 |
| **版本管理** | 多版本隔离、BMCLAPI 版本列表、一键安装/删除，支持正式版/快照/远古版/愚人节版 |
| **ModLoader 安装** | Fabric / Forge / NeoForge / Quilt 一键安装，安装进度实时反馈 |
| **Mod 下载** | 接入 CurseForge + Modrinth 双源，搜索、筛选、分类浏览、并发下载 |
| **Mod 管理** | 本地 Mod 扫描、批量安装、启用/禁用、配置编辑（toml/json）、自动更新检测 |
| **Mod 自动更新** | 基于 Modrinth SHA1 哈希批量检测更新，一键更新并流式下载 |
| **实例系统** | 创建/导入/导出游戏实例，独立管理每个版本的 Mod、配置、存档 |
| **崩溃监控** | 游戏崩溃自动捕获日志，JVM 错误分析，崩溃报告生成 |
| **皮肤管理** | 下载并缓存 Minecraft 玩家皮肤，前端实时渲染 |

### 下载与进度

| 功能 | 说明 |
|------|------|
| **下载队列** | 版本 JAR/JSON 下载、Mod 文件下载、ModLoader 安装器下载 |
| **全局下载弹窗** | 右下角浮动组件，实时显示所有下载进度 |
| **通知系统** | 铃铛通知面板，下载完成提醒、更新可用提醒，支持路由跳转 |

### 系统功能

| 功能 | 说明 |
|------|------|
| **Java 管理** | 自动检测系统 Java 安装，手动指定路径，本地化管理 |
| **配置持久化** | SQLite 数据库存储账户、实例、下载、配置、崩溃记录 |
| **自定义 .minecraft 路径** | 用户可指定非默认游戏目录，重启后持久化 |
| **安全存储** | Electron safeStorage 加密存储敏感 token |
| **日志系统** | 分级日志（DEBUG/INFO/WARN/ERROR）+ 文件持久化 |
| **深色主题** | 暗色调像素风界面，Press Start 2P 字体，流畅动效 |

---

## 支持的平台

| 平台 | 状态 | 架构 |
|------|------|------|
| Windows 10+ | ✅ 已支持 | x64 |
| macOS | ⏳ 计划中 | x64 / arm64 |
| Linux | ⏳ 计划中 | x64 |

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron | 33.4.11 |
| 前端框架 | Vue 3 + Composition API | 3.5.0 |
| 构建工具 | Vite + electron-vite | 5.4.21 / 2.3.0 |
| 语言 | TypeScript | 5.5.0 |
| UI 样式 | SCSS + CSS Variables | 像素风设计系统 |
| 状态管理 | Pinia | 2.2.0 |
| 路由 | Vue Router | 4.4.0 |
| 数据库 | better-sqlite3 | 11.0.0 |
| 日志 | electron-log | 5.0.0 |
| 图标 | Iconify Vue + unplugin-icons | 5.0.0 / 23.0.1 |

---

## 快速开始

### 前置要求

- Node.js 20+
- npm 10+
- Windows 10+ （当前仅支持 Windows）

### 克隆与安装

```bash
git clone https://github.com/nnkmn/MCLA.git
cd MCLA
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建安装包

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

> 安装包输出在 `build/` 目录。Windows 产物为 NSIS 安装程序（`MCLA Setup x.x.x.exe`）。

---

## 项目结构

```
MCLA/
├── electron/                      # Electron 主进程
│   ├── main.ts                    # 主进程入口
│   ├── preload.ts                 # 预加载脚本（IPC 桥接，30+ 通道）
│   ├── adapters/                  # 平台适配器（接口 + Minecraft 实现 + 注册中心）
│   ├── ipc/                      # IPC 处理器（16 个模块）
│   │   ├── account.ipc.ts        # 账户认证
│   │   ├── config.ipc.ts         # 配置读写
│   │   ├── content.ipc.ts        # 内容服务（皮肤等）
│   │   ├── crash.ipc.ts          # 崩溃监控
│   │   ├── dialog.ipc.ts         # 系统对话框
│   │   ├── download.ipc.ts       # 下载管理
│   │   ├── game.ipc.ts           # 游戏启动
│   │   ├── instance.ipc.ts      # 实例管理
│   │   ├── java.ipc.ts           # Java 管理
│   │   ├── mod.ipc.ts            # Mod 管理 + 更新检测
│   │   ├── modloader.ipc.ts     # ModLoader 安装
│   │   └── window.ipc.ts         # 窗口控制
│   ├── services/                 # 业务服务层（15+ 模块）
│   │   ├── microsoft.auth.ts     # 微软 OAuth Device Code Flow
│   │   ├── accounts.ts           # 账户存储与切换
│   │   ├── versions.ts           # BMCLAPI 版本列表
│   │   ├── modloader.service.ts  # ModLoader 安装（Fabric/Forge/NeoForge/Quilt）
│   │   ├── curseforge.service.ts # CurseForge API
│   │   ├── modrinth.service.ts   # Modrinth API
│   │   ├── mod.service.ts        # Mod 管理 + 自动更新
│   │   ├── skin.service.ts       # 皮肤缓存
│   │   ├── crash.service.ts      # 崩溃捕获与分析
│   │   ├── game.launcher.service.ts # 游戏启动核心（JVM 参数、类路径、natives）
│   │   ├── launch.config.service.ts  # 启动配置管理
│   │   ├── instances.ts          # 实例 CRUD
│   │   ├── database.ts           # SQLite 数据库
│   │   ├── download.service.ts   # 下载队列
│   │   └── instance.enhanced.service.ts # 实例导入/导出
│   ├── types/                    # TypeScript 类型定义
│   │   ├── ipc.types.ts         # 30+ IPC 通道类型映射
│   │   ├── database.types.ts    # 6 张表 Row 类型 + DDL
│   │   └── modloader.types.ts   # ModLoader 类型
│   └── utils/                   # 工具函数
│       ├── logger.ts            # 分级日志
│       ├── crypto.ts            # safeStorage 加解密
│       ├── hash.ts              # SHA1/MD5 文件哈希
│       └── platform.ts          # 跨平台 Java 探测
├── src/                          # 渲染进程（Vue）
│   ├── main.ts                  # Vue 入口
│   ├── App.vue                  # 根组件（侧边栏 + 内容区 + 全局组件）
│   ├── router/                  # 路由配置
│   ├── stores/                  # Pinia 状态管理
│   ├── pages/                   # 页面（9 个）
│   │   ├── HomePage.vue         # 首页
│   │   ├── AccountPage.vue      # 账户登录与管理
│   │   ├── LaunchPage.vue       # 游戏启动（版本选择 + 启动按钮）
│   │   ├── InstancesPage.vue     # 实例列表
│   │   ├── InstanceDetail.vue   # 实例详情（Mod 管理 + 配置）
│   │   ├── VersionsPage.vue     # 版本浏览与安装
│   │   ├── DownloadsPage.vue     # Mod/整合包下载
│   │   ├── SettingsPage.vue     # 全局设置
│   │   └── MorePage.vue         # 关于 / 鸣谢 / FAQ
│   ├── components/              # 组件
│   │   ├── common/             # Px UI 组件库（Modal/Progress/Badge/Notification）
│   │   ├── download/           # 下载浮动组件
│   │   ├── instance/            # 实例相关组件
│   │   ├── launch/             # 启动相关组件
│   │   └── ModManager.vue      # Mod 管理核心组件
│   ├── styles/                 # 全局样式
│   │   ├── pixel-ui.css        # 像素风 CSS 设计系统
│   │   └── global.scss         # 全局样式
│   └── types/                  # 渲染进程类型
├── resources/                   # 应用资源
│   └── icons/                  # 多尺寸图标（ICO/ICNS/PNG）
├── public/                      # 公共资源（字体、图片）
├── scripts/                     # 构建辅助脚本
├── electron-builder.yml         # 打包配置
├── electron.vite.config.ts      # electron-vite 配置
└── package.json
```

---

## 数据库

MCLA 使用 SQLite（better-sqlite3）持久化数据，6 张表：

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `accounts` | 账户信息 | access_token（加密）、refresh_token、profile、type |
| `instances` | 游戏实例 | version、loader、game_dir、launch_args |
| `downloads` | 下载任务 | url、progress、status、file_path |
| `versions` | 版本缓存 | id、type、metadata、local_path |
| `configs` | 全局配置 | key-value 结构（Java 路径、自定义 .minecraft 路径等） |
| `crashes` | 崩溃记录 | timestamp、log_path、analysis |

---

## 认证流程

使用微软官方 Device Code Flow，无需在启动器内输入密码：

```
用户点击「微软登录」
  → 请求设备码（POST /oauth20_token.srf）
  → 弹窗显示设备码 + microsoft.com/devicelogin 链接
  → 用户浏览器打开链接并输入设备码
  → 轮询 token（每 5 秒）
  → 获取 Access Token
  → Xbox Live 认证 → XSTS Token
  → XSTS Token → Minecraft Bearer Token
  → Minecraft Profile（用户名、UUID、皮肤 URL）
  → 保存到数据库（token 使用 safeStorage 加密）
  → 后续自动刷新，无需重复登录
```

---

## 鸣谢

- [StarLight.Core](https://github.com/Ink-Marks/StarLight.Core)（墨痕工作室）— 模块化架构参考
- [BMCLAPI](https://bmclapi2.bangbang93.com) — Minecraft 版本文件国内镜像
- [Fabric Meta API](https://meta.fabricmc.net) — Fabric 版本元数据
- [CurseForge API](https://docs.curseforge.com) — Mod 资源平台
- [Modrinth API](https://docs.modrinth.com) — Mod 资源平台

---

## 协议

本项目基于 [MIT 协议](LICENSE) 开源。

> Minecraft is a trademark of Microsoft Corporation. This project is not affiliated with Mojang Studios or Microsoft.

---

## 作者

**nnkmn (EccenTri)** — [GitHub](https://github.com/nnkmn)
