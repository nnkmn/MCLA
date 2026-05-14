# MCLA v0.4.0 - Bug 修复 + 动态版本号

> Minecraft 启动器第四个版本，修复版本判断 Bug + 动态版本显示

---

## 核心修复

### isVersionInstalled() 修复
- ✅ **ModLoader 版本误判修复**：原函数同时检查 jar 和 json，ModLoader 版本没有独立 jar（继承基版本）导致永远返回 false
- ✅ **继承版本检测**：jar 不存在时检查 `inheritsFrom`，正确识别 Fabric/Forge/NeoForge/Quilt 安装状态
- ✅ **新增 IPC 通道**：`versions:is-installed`，供前端调用

### ModLoader IPC 重写
- ✅ **`modloader.ipc.ts` 重写**：接入真实 `ModLoaderService`，返回实际安装状态和进度
- ✅ **删除旧 stub**：`electron/services/modloader.ts` 已在 v0.3.0 清理

### 皮肤系统确认
- ✅ **主进程 → 前端完整接通**：`account:get-skin-data-url` IPC + `preload.ts` 暴露 + `AccountPage.vue` 渲染皮肤头像

### 动态版本号
- ✅ **新增 `app:get-version` IPC**：从 `package.json` 读取版本号，不再写死
- ✅ **`MorePage.vue` 动态显示**：`onMounted` 调用 `app.getVersion()`，模板用 `{{ appVersion }}`

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

### v0.3.0 (2026-04-28)
- 版本设置：补全文件（BMCLAPI 自动修复）、修改名称/描述/收藏夹
- 快捷方式：一键打开版本/存档/Mod 文件夹
- 导出启动脚本：生成 .bat 批处理
- 删除版本：双重确认安全删除
- Mod管理：从文件批量安装、全选切换
- 游戏启动：真实 IPC 流程替换 stub、版本持久化恢复
- 修复：Electron 不兼容 prompt() → 自定义弹窗
- 新增：shell:open-path IPC、实例单字段更新 API

### v0.2.0 (2026-04-26)
- 账户系统：完整 Microsoft OAuth Device Flow
- Mod下载：CurseForge + Modrinth 双平台
- 崩溃监控：自动捕获与分析
- 皮肤管理：下载并缓存玩家皮肤
- 基础设施：日志、加密、类型定义完善
- 资源：macOS ICNS 图标、字体、StarLight Logo
- UI优化：设置页、更多页响应式布局修复

### v0.1.0 (2026-04-24)
- 初始版本：基础启动器框架
- 微软登录、版本管理、ModLoader 安装

---

## 已知问题

- Sass legacy JS API 警告（构建时 82 个弃用警告）
- `electron-vite dev` 热重载 IPC handlers 不注册，需改用 build 模式运行
- 首次启动版本列表加载慢（BMCLAPI 网络请求慢）
- Windows 图标缓存需 `ie4uinit.exe -show` 清理

---

# MCLA v0.3.0 - 版本设置完善 + 游戏启动

> Minecraft 启动器第三个版本，完善版本设置交互与真实游戏启动

---

## 核心功能

### 版本设置
- ✅ **补全文件**：检测缺失 library/client jar，自动从 BMCLAPI 下载修复
- ✅ **个性化**：修改版本名称、版本描述、收藏夹切换
- ✅ **快捷方式**：一键打开版本文件夹 / 存档文件夹 / Mod 文件夹（shell.openPath）
- ✅ **导出启动脚本**：生成 .bat 批处理文件到本地
- ✅ **删除版本**：双重确认后删除实例及其文件夹
- ✅ **自定义输入弹窗**：替代 Electron 不兼容的 prompt()，Enter 确认 Esc 取消

### Mod 管理
- ✅ 一键打开 Mod 文件夹
- ✅ 从本地文件批量安装 Mod（input file 多选）
- ✅ 跳转下载页获取新 Mod
- ✅ 全选 / 取消全选

### 游戏启动
- ✅ 真实 IPC 连接游戏启动流程（替换 stub）
- ✅ 版本选择持久化（localStorage 恢复 + 文件系统真实版本名）
- ✅ 启动前账号检测（未登录引导）
- ✅ 启动进度实时推送（game:progress IPC）

### 账户系统
- ✅ 完整 Microsoft OAuth Device Flow 认证链（设备码 → Xbox → XSTS → Minecraft）
- ✅ 登录进度实时推送（IPC to Renderer）
- ✅ 取消登录 & 静默刷新 Token
- ✅ 微软账户信息显示（头像 + 用户名）

### Mod 下载平台
- ✅ CurseForge 集成（搜索 + Mod 信息 + 文件下载）
- ✅ Modrinth 集成（搜索 + Mod 信息 + 文件下载）
- ✅ Mod/整合包搜索与浏览
- ✅ 下载队列管理

### 崩溃监控
- ✅ 崩溃日志自动捕获
- ✅ JVM 错误分析
- ✅ 崩溃报告生成

### 皮肤管理
- ✅ 下载并缓存 Minecraft 玩家皮肤
- ✅ 本地皮肤文件管理

### 基础设施
- ✅ 分级日志系统（DEBUG/INFO/WARN/ERROR + 文件持久化）
- ✅ 安全存储（Electron safeStorage 加解密）
- ✅ SHA1/MD5 文件校验
- ✅ 跨平台 Java 探测
- ✅ 完整类型定义（IPC 通道、数据库表）
- ✅ `shell:open-path` IPC（跨平台打开任意文件夹，不存在自动创建）
- ✅ 实例单字段快捷更新 API

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
| Windows | `MCLA Setup 0.3.0.exe` | ~94 MB |

---

## 已知问题

- 首次启动需要等待版本列表加载
- 部分杀毒软件可能误报（Electron 应用常见）

---

## Changelog

### v0.3.0 (2026-04-28)
- 版本设置：补全文件（BMCLAPI 自动修复）、修改名称/描述/收藏夹
- 快捷方式：一键打开版本/存档/Mod 文件夹
- 导出启动脚本：生成 .bat 批处理
- 删除版本：双重确认安全删除
- Mod管理：从文件批量安装、全选切换
- 游戏启动：真实 IPC 流程替换 stub、版本持久化恢复
- 修复：Electron 不兼容 prompt() → 自定义弹窗
- 新增：shell:open-path IPC、实例单字段更新 API

### v0.2.0 (2026-04-26)
- 账户系统：完整 Microsoft OAuth Device Flow
- Mod下载：CurseForge + Modrinth 双平台
- 崩溃监控：自动捕获与分析
- 皮肤管理：下载并缓存玩家皮肤
- 基础设施：日志、加密、类型定义完善
- 资源：macOS ICNS 图标、字体、StarLight Logo
- UI优化：设置页、更多页响应式布局修复

### v0.1.0 (2026-04-24)
- 初始版本：基础启动器框架
- 微软登录、版本管理、ModLoader 安装
