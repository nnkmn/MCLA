# MCLA

<div align="center">

![MCLA](https://img.shields.io/badge/MCLA-v0.2.0-6366f1?style=for-the-badge&labelColor=1e1e2e)
![Electron](https://img.shields.io/badge/Electron-33-478cbf?style=flat-square&logo=electron&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.5-4db08b?style=flat-square&logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square)

**一个现代化的 Minecraft 启动器，支持微软正版登录、版本管理、Mod 下载、崩溃监控**

_Powered by Electron + Vue 3 + TypeScript_

</div>

---

## 功能特性

- **微软账号登录** — Device Code Flow + Xbox/XSTS/Minecraft Bearer 三步认证链，支持 token 自动刷新
- **版本管理** — 多版本隔离、支持 Forge/Fabric/NeoForge/Quilt 一键安装
- **Mod 下载** — 接入 CurseForge + Modrinth 双源，支持搜索、筛选、并发下载
- **崩溃监控** — 游戏崩溃后自动捕获日志并提供分析
- **皮肤管理** — 下载并缓存 Minecraft 玩家皮肤
- **账户管理** — 多账户切换、离线模式、token 状态实时显示
- **Java 管理** — 自动检测、手动指定、本地化管理
- **深色主题 UI** — 暗色调像素风界面，流畅动效 + Press Start 2P 字体

---

## 支持的系统

| 系统 | 状态 |
|---|---|
| Windows 10+ amd64 | ✅ 已支持 |
| macOS | ⏳ 待支持 |
| Linux | ⏳ 待支持 |

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | Electron 33 |
| 前端框架 | Vue 3 + Composition API |
| 构建工具 | Vite + electron-vite |
| 语言 | TypeScript 5.5 |
| UI 样式 | SCSS + CSS Variables |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 数据库 | better-sqlite3 |
| 日志 | electron-log |
| 图标 | Iconify Vue + unplugin-icons |

---

## 安装与运行

### 前置要求

- Node.js 20+
- npm 10+
- Windows 10+ / macOS / Linux

### 开发模式

```bash
git clone https://github.com/nnkmn/MCLA.git
cd MCLA
npm install
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

Windows 安装包输出在 `build/`，macOS `.dmg` 输出在 `dist/`。

---

## 项目结构

```
MCLA/
├── electron/                      # Electron 主进程
│   ├── main.ts                    # 主进程入口
│   ├── preload.ts                 # 预加载脚本（IPC 桥接）
│   ├── adapters/                  # 平台适配器
│   ├── ipc/                      # IPC 处理器（12个模块）
│   │   ├── account.ipc.ts        # 账户相关
│   │   ├── config.ipc.ts         # 配置读写
│   │   ├── content.ipc.ts        # 内容服务（皮肤等）
│   │   ├── crash.ipc.ts          # 崩溃监控
│   │   ├── dialog.ipc.ts         # 系统对话框
│   │   ├── download.ipc.ts       # 下载管理
│   │   ├── game.ipc.ts           # 游戏启动
│   │   ├── instance.ipc.ts      # 实例管理
│   │   ├── java.ipc.ts           # Java 管理
│   │   ├── mod.ipc.ts            # Mod 管理
│   │   └── window.ipc.ts         # 窗口控制
│   ├── services/                 # 业务服务层（25个模块）
│   │   ├── microsoft.auth.ts     # 微软 OAuth（Device Code Flow）
│   │   ├── accounts.ts           # 账户存储
│   │   ├── versions.ts           # 版本列表（BMCLAPI）
│   │   ├── modloader.service.ts  # ModLoader 安装
│   │   ├── curseforge.service.ts # CurseForge API
│   │   ├── modrinth.service.ts   # Modrinth API
│   │   ├── skin.service.ts       # 皮肤管理
│   │   ├── crash.service.ts      # 崩溃捕获
│   │   ├── launcher.ts           # 启动器核心
│   │   ├── instances.ts          # 实例管理
│   │   ├── database.ts           # SQLite 数据库
│   │   └── download.service.ts   # 下载队列
│   ├── types/                    # TypeScript 类型定义
│   │   ├── ipc.types.ts         # IPC 通道类型（30+通道）
│   │   ├── database.types.ts    # 数据库表结构
│   │   └── modloader.types.ts   # ModLoader 类型
│   └── utils/                   # 工具函数
│       ├── logger.ts            # 分级日志（DEBUG/INFO/WARN/ERROR）
│       ├── crypto.ts            # safeStorage 加解密
│       ├── hash.ts              # 文件哈希校验
│       └── platform.ts          # 跨平台工具
├── src/                          # 渲染进程（Vue）
│   ├── main.ts                  # Vue 入口
│   ├── App.vue                  # 根组件
│   ├── router/                  # 路由配置
│   ├── stores/                  # Pinia 状态管理
│   ├── pages/                   # 页面组件（9个）
│   │   ├── HomePage.vue         # 首页
│   │   ├── AccountPage.vue      # 账户登录
│   │   ├── VersionsPage.vue     # 版本管理
│   │   ├── InstancesPage.vue     # 实例列表
│   │   ├── InstanceDetail.vue   # 实例详情
│   │   ├── LaunchPage.vue       # 游戏启动
│   │   ├── DownloadsPage.vue     # 下载管理
│   │   ├── SettingsPage.vue     # 设置
│   │   └── MorePage.vue         # 更多（关于/鸣谢/反馈）
│   ├── components/              # 通用组件
│   │   ├── common/             # Px UI 组件库
│   │   ├── account/            # 账户相关组件
│   │   ├── download/           # 下载相关组件
│   │   ├── instance/            # 实例相关组件
│   │   └── launch/             # 启动相关组件
│   ├── styles/                 # 全局样式
│   │   ├── pixel-ui.css        # 像素风 CSS 设计系统
│   │   └── global.scss         # 全局样式
│   ├── types/                  # 渲染进程类型
│   └── utils/                  # 渲染进程工具
├── resources/                   # 应用图标、字体等资源
│   └── icons/                  # 多尺寸图标（ICO/ICNS/PNG）
├── scripts/                     # 构建脚本（ICO 生成等）
└── public/                      # 公共资源
```

---

## 认证流程

MCLA 使用微软官方 Device Code Flow 完成登录，无需在启动器中输入密码：

```
1. 启动器请求设备码
2. 用户在浏览器打开 microsoft.com/devicelogin 并输入设备码
3. 微软返回 user_code → 浏览器确认登录
4. Xbox Live 认证 → XSTS Token
5. XSTS Token → Minecraft Bearer Token
6. Bearer Token → Minecraft Profile（用户名、UUID、皮肤）
7. Token 自动刷新，无需重复登录
```

---

## 数据库表结构

| 表名 | 用途 |
|---|---|
| `accounts` | 账户信息（access_token、refresh_token、profile） |
| `instances` | 游戏实例（版本、ModLoader、启动参数） |
| `downloads` | 下载任务队列（URL、进度、状态） |
| `versions` | 版本缓存（元数据、本地路径） |
| `configs` | 全局配置（Java 路径、窗口大小等） |
| `crashes` | 崩溃记录（时间戳、日志路径） |

---

## 鸣谢

- [StarLight.Core](https://github.com/Ink-Marks/StarLight.Core)（墨痕工作室）— MCLA 参考其模块化架构
- [BMCLAPI](https://bmclapi2.bangbang93.com) — Minecraft 版本文件镜像
- [Fabric Meta API](https://meta.fabricmc.net) — Fabric 版本元数据
- [CurseForge API](https://docs.curseforge.com) — Mod 资源
- [Modrinth API](https://docs.modrinth.com) — Mod 资源

---

## 协议

本项目基于 MIT 协议开源。

> Minecraft® 为 Microsoft Corporation 的商标。本项目与 Mojang Studios 及 Microsoft 均无关联。

---

## 作者

**nnkmn** — [GitHub](https://github.com/nnkmn)

---

## Star History

如果这个项目对你有帮助，欢迎 star ⭐
