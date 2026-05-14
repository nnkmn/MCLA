# MCLA v0.4.0 - Bug 修复 + 动态版本号

> Minecraft 启动器第四个版本，修复版本判断 Bug + 动态版本显示

---

## 核心修复

### isVersionInstalled() 修复
- **ModLoader 版本误判修复**：原函数同时检查 jar 和 json，ModLoader 版本没有独立 jar（继承基版本）导致永远返回 false
- **继承版本检测**：jar 不存在时检查 `inheritsFrom`，正确识别 Fabric/Forge/NeoForge/Quilt 安装状态
- **新增 IPC 通道**：`versions:is-installed`，供前端调用

### ModLoader IPC 重写
- **`modloader.ipc.ts` 重写**：接入真实 `ModLoaderService`，返回实际安装状态和进度
- **删除旧 stub**：`electron/services/modloader.ts` 已在 v0.3.0 清理

### 皮肤系统确认
- **主进程 → 前端完整接通**：`account:get-skin-data-url` IPC + `preload.ts` 暴露 + `AccountPage.vue` 渲染皮肤头像

### 动态版本号
- **新增 `app:get-version` IPC**：从 `package.json` 读取版本号，不再写死
- **`MorePage.vue` 动态显示**：`onMounted` 调用 `app.getVersion()`，模板用 `{{ appVersion }}`

---

## 技术栈

- **框架**: Electron 33.4.11 + Vite + Vue 3
- **UI**: 像素风设计系统（Press Start 2P 字体）
- **数据库**: SQLite (better-sqlite3)
- **构建**: electron-builder 25.x

---

## 安装包

| 平台 | 文件 | 大小 |
|------|------|------|
| Windows | `MCLA Setup 0.4.0.exe` | ~94 MB |

---

## Changelog

### v0.4.0 (2026-05-14)
- 修复 `isVersionInstalled()` 对 ModLoader 版本误判（继承版本正确识别）
- 新增 `versions:is-installed` IPC 通道
- `modloader.ipc.ts` 重写，接入真实 `ModLoaderService`
- 皮肤系统确认完整接入前端
- `MorePage.vue` 版本号改为动态获取（`app:get-version` IPC）
- git commit v0.3.0 全部改动（86 files，commit `7d591bc`）
- 打包发布 `MCLA Setup 0.4.0.exe`

---

## 已知问题

- 首次启动可能需等待资源加载
- 深色主题切换需重启生效
