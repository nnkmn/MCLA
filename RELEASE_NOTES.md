# MCLA v0.2.0 - Mod下载 + 崩溃监控

> Minecraft 启动器第二个版本，重点增强 Mod 下载和系统稳定性

---

## 核心功能

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
| Windows | `MCLA Setup 0.2.0.exe` | ~94 MB |

---

## 已知问题

- 首次启动需要等待版本列表加载
- 部分杀毒软件可能误报（Electron 应用常见）

---

## Changelog

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
