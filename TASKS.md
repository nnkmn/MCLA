# MCLA 项目任务看板

> 更新时间：2026-05-14
> 当前版本：v0.4.0（已发布）
> 下个版本：v0.5.0
> 项目路径：`e:/TEST/mcl`

---

## ✅ 已完成（v0.1.0 ~ v0.4.0）

### v0.1.0（2026-04-24）— 初始版本
- 基础启动器框架
- 微软登录、版本管理、ModLoader 安装（stub）
- 打包问题修复：黑屏、图标、按钮无响应

### v0.2.0（2026-04-26）— 账户 + Mod 下载
- 账户系统：完整 Microsoft OAuth Device Flow
- Mod 下载：CurseForge + Modrinth 双平台
- 崩溃监控：自动捕获与分析
- 皮肤管理：下载并缓存玩家皮肤
- 基础设施：日志、加密、类型定义完善

### v0.3.0（2026-04-28）— 版本设置 + 游戏启动
- 版本设置：补全文件（BMCLAPI）、修改名称/描述/收藏夹
- 快捷方式：一键打开版本/存档/Mod 文件夹
- 游戏启动：真实 IPC 流程、版本持久化、进度推送
- 自定义 .minecraft 路径持久化
- DownloadsPage 接入 BMCLAPI 真实数据
- PxModal / PxProgress / PxBadge 组件

### v0.4.0（2026-05-14）— Bug 修复 + 动态版本号
- ✅ 修复 `isVersionInstalled()` 对 ModLoader 版本误判（继承版本现在正确识别）
- ✅ 新增 `versions:is-installed` IPC 通道
- ✅ `modloader.ipc.ts` 重写，接入真实 `ModLoaderService`
- ✅ 皮肤系统确认完整接入前端（`AccountPage.vue` 渲染皮肤头像）
- ✅ `MorePage.vue` 版本号改为动态获取（`app:get-version` IPC）
- ✅ git commit v0.3.0 全部改动（86 files，commit `7d591bc`）
- ✅ 打包发布 `MCLA Setup 0.4.0.exe`

---

## 🔴 P1 — 重要功能（v0.5.0）

> 影响核心体验，优先完成

| 状态 | 任务 | 说明 |
|------|------|------|
| ⬜ | Forge 安装完整实现 | `modloader.service.ts` 中 `downloadInstaller()` 仍是 stub |
| ⬜ | NeoForge 安装完整实现 | 同上 |
| ⬜ | Quilt 安装完整实现 | 同上 |
| ⬜ | 启动器自身热更新（auto-updater） | 检查 GitHub Release，自动下载安装包 |
| ⬜ | 下载源优化 | 多线程加速、断点续传、BMCLAPI 镜像切换 |

---

## 🟢 P2 — 体验完善（v0.5.0）

| 状态 | 任务 | 说明 |
|------|------|------|
| ⬜ | Mod 自动更新检测 | 比对本地版本与远程最新版本 |
| ⬜ | 整合包创建工具 | 打包 Mod + 资源包 |
| ⬜ | 快捷键系统 | 全局快捷键启动游戏 |
| ⬜ | 背景自定义 | 上传自定义背景图 |
| ⬜ | 主题自定义（色盘） | 用户自定义主题颜色 |
| ⬜ | 数据备份/迁移 | 导出/导入配置和实例 |

---

## ⚪ 长期规划

| 版本 | 功能 |
|------|------|
| v0.5.0 | P1 + P2 功能完成，稳定版本 |
| v1.0.0 | 服务器管理、光影包、云同步、插件系统、适配器架构 |
| v2.0.0 | 多游戏支持（适配器模式，扩展至其他游戏） |

---

## ⚠️ 已知问题

| 问题 | 状态 | 说明 |
|------|------|------|
| Sass legacy JS API 警告 | ⚠️ 已知 | 构建时 82 个弃用警告，需迁移到 dart-sass |
| 热重载兼容 | ⚠️ 已知 | `electron-vite dev` 模式 IPC handlers 不注册，需改用 build 模式运行 |
| 首次启动版本列表慢 | ⚠️ 已知 | BMCLAPI 网络请求慢，可加 loading 状态 |
| Windows 图标缓存 | ⚠️ 已知 | 每次重建 ICO 后需 `ie4uinit.exe -show` 清理缓存 |
| `launcher.ts` 旧代码残留 | ✅ 已删除 | v0.4.0 清理完毕 |

---

## 📁 相关文件

- 项目根目录：`e:/TEST/mcl`
- 开发总结：`e:/TEST/mcl/DEVELOPMENT_SUMMARY.md`（已过时，需更新）
- 发布说明：`e:/TEST/mcl/RELEASE_NOTES.md`（需追加 v0.4.0）
- UI 库：`e:/TEST/UIKTD/ui-library/`
- 图标资源：`e:/TEST/mcl/resources/icons/`
- 打包输出：`e:/TEST/mcl/build/`

---

## 📅 推荐开发顺序（v0.5.0）

```
第1-2天 → P1：Forge/NeoForge/Quilt 安装完整实现
第3天   → P1：启动器 auto-updater
第4天   → P2：Mod 自动更新检测 + 数据备份
第5天   → P2：快捷键系统 + 背景自定义
第6天   → 修复已知问题（Sass 警告等）
第7天   → 测试 + 更新文档
发布     → v0.5.0
```
