# MCLA v0.1.0 - 首个测试版

> Minecraft 启动器首个可用版本

---

## 核心功能

### 账户系统
- ✅ 微软 OAuth 设备码登录
- ✅ 离线账户支持
- ✅ 多账户切换
- ✅ Token 自动刷新

### 实例管理
- ✅ 创建/删除/编辑游戏实例
- ✅ 实例配置持久化（SQLite）
- ✅ 游戏目录自动管理

### 版本管理
- ✅ 官方版本列表（BMCLAPI）
- ✅ 版本缓存机制
- ✅ Java 版本自动推荐

### ModLoader 支持
- ✅ Fabric 安装器
- ✅ Forge/NeoForge 架构准备
- ✅ 安装进度回调

### 游戏启动
- ✅ 完整启动参数构建
- ✅ 账户认证注入
- ✅ 进程状态监控

### 下载系统
- ✅ 多线程并发下载
- ✅ 断点续传
- ✅ BMCLAPI 镜像加速

### 内容平台
- ✅ CurseForge 集成
- ✅ Modrinth 集成
- ✅ Mod/整合包搜索

### Java 管理
- ✅ 自动检测系统 Java
- ✅ 多版本 Java 管理

---

## 技术栈

- **框架**: Electron + Vite + Vue 3
- **UI**: 像素风设计系统（Press Start 2P 字体）
- **数据库**: SQLite (better-sqlite3)
- **构建**: electron-builder

---

## 安装包

| 平台 | 文件 | 大小 |
|------|------|------|
| Windows | `MCLA Setup 0.1.0.exe` | ~94 MB |

---

## 已知问题

- 首次启动可能需要等待版本列表加载
- 部分杀毒软件可能误报（Electron 应用常见）

---

## 后续计划

- [ ] 崩溃日志自动分析
- [ ] Mod 本地管理
- [ ] 游戏安装向导
- [ ] 整合包一键安装

---

**Full Changelog**: 初始版本
