# MCLA

<div align="center">

![MCLA](https://img.shields.io/badge/MCLA-v0.1.0-6366f1?style=for-the-badge&labelColor=1e1e2e)
![Electron](https://img.shields.io/badge/Electron-35.1.0-478cbf?style=flat-square&logo=electron&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.5-4db08b?style=flat-square&logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square)

**一个现代化的 Minecraft 启动器，支持微软正版登录、版本管理、Mod 下载**

*Powered by Electron + Vue 3 + TypeScript*

</div>

---

## ✨ 功能特性

- **微软账号登录** — Device Code Flow + Xbox/XSTS/Minecraft 三步认证链，支持 token 自动刷新
- **版本管理** — 多版本隔离、支持 Forge/Fabric/Quilt/OptiFine 一键安装
- **Mod 下载** — 接入 CurseForge + Modrinth 双源，支持搜索、筛选、并发下载
- **账户管理** — 多账户切换、离线模式、token 状态实时显示
- **Java 管理** — 自动检测、手动指定、本地化管理
- **深色主题 UI** — 暗色调像素风界面，流畅动效

---

## 🖥️ 支持的系统

- Windows 10+ amd64
- macOS（待支持）
- Linux（待支持）

---

## 🔧 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | Electron 35 |
| 前端框架 | Vue 3 + Composition API |
| 构建工具 | Vite + electron-vite |
| 语言 | TypeScript 5 |
| UI 样式 | SCSS + CSS Variables |
| 状态管理 | Pinia |
| 路由 | Vue Router |

---

## 📦 安装与运行

### 前置要求

- Node.js 20+
- npm 10+
- Windows 10+ / macOS / Linux

### 开发模式

```bash
git clone https://github.com/nnkmn/MCLA.git
cd mcla
npm install
npm run dev
```

### 构建应用

```bash
npm run build
```

构建产物在 `out/` 目录。

---

## 📁 项目结构

```
mcla/
├── electron/                 # Electron 主进程
│   ├── main/               # 主进程入口
│   ├── preload/            # 预加载脚本（IPC 桥接）
│   ├── services/           # 业务服务
│   │   ├── account/        # 账户认证
│   │   ├── java/           # Java 管理
│   │   ├── launch/         # 启动器核心
│   │   └── mod/            # Mod 下载（CurseForge / Modrinth）
│   └── ipc/                # IPC 处理器
├── src/                    # 渲染进程（Vue）
│   ├── components/        # Vue 组件
│   ├── pages/             # 页面
│   ├── stores/            # Pinia 状态
│   ├── styles/            # 样式
│   └── App.vue            # 根组件
├── resources/             # 静态资源（图标等）
└── public/                # 公共资源
```

---

## 🔑 认证流程

MCLA 使用微软官方 Device Code Flow 完成登录，无需在启动器中输入密码：

1. 启动器显示设备码（`https://microsoft.com/devicelogin`）
2. 用户在浏览器中输入码完成登录
3. Xbox Live 认证 → XSTS Token → Minecraft 认证
4. 获取 Minecraft access token 并存储

---

## 📄 协议

本项目基于 MIT 协议开源。

> Minecraft® 为 Microsoft Corporation 的商标。本项目与 Mojang Studios 及 Microsoft 均无关联。

---

## 👤 作者

**nnkmn** — [GitHub](https://github.com/nnkmn)

---

## ⭐ Star History

如果这个项目对你有帮助，欢迎 star ⭐
