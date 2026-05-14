# MCLA 开发状态总结报告

> 更新时间：2026-05-14
> 基于代码扫描 + 文档对比
> 
> **v0.4.0 已完成并发布**（2026-05-14）
> - ✅ `isVersionInstalled()` 修复（继承版本正确识别）
> - ✅ `modloader.ipc.ts` 重写，接入真实 `ModLoaderService`
> - ✅ 皮肤系统完整接入前端
> - ✅ `MorePage.vue` 版本号动态获取（`app:get-version` IPC）
> - ✅ 打包发布 `MCLA Setup 0.4.0.exe`
> - ✅ `launcher.ts` 旧代码已在 v0.3.0 commit 中删除

---

## 一、已完成的（✅）

### 1. 基础设施

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据库 | `electron/services/database.ts` | SQLite 6张表，WAL模式 |
| 配置持久化 | `electron/services/config.ts` | 键值对，自动类型推断 |
| 分级日志 | `electron/utils/logger.ts` | DEBUG/INFO/WARN/ERROR，文件输出 |
| 安全存储 | `electron/utils/crypto.ts` | safeStorage 加解密 |
| 文件哈希 | `electron/utils/hash.ts` | SHA1/MD5 流式校验 |
| 跨平台路径 | `electron/utils/platform.ts` | Win/Mac/Linux 三平台 |
| IPC 类型 | `electron/types/ipc.types.ts` | 30+ 通道完整类型 |
| 数据库类型 | `electron/types/database.types.ts` | 6 张表 Row 类型 |
| 图标系统 | `resources/icons/` | PNG + ICO + ICNS，多尺寸 |
| 打包配置 | `electron-builder.yml` | NSIS 安装包，Win+Mac |

### 2. 账户系统（完全实现）

| 文件 | 行数 | 功能 |
|------|------|------|
| `microsoft.auth.ts` | 250+ | 完整 Device Code Flow → Xbox → XSTS → Minecraft Bearer 6步认证链 |
| `accounts.ts` | 122 | CRUD，Token 刷新，xuid 自动回填 |
| `account.ipc.ts` | — | IPC 通道，支持进度推送（IPC to Renderer）、取消登录、静默刷新 |
| `AccountPage.vue` | — | Device Flow 弹窗（设备码展示 + 进度状态机 + 错误处理） |
| `accounts.store.ts` | — | Pinia store，适配 `{ok, data, error}` 格式 |

### 3. 游戏启动（完全实现）

| 文件 | 行数 | 功能 |
|------|------|------|
| `game.launcher.service.ts` | **989** | 完整游戏启动：参数构建→Java检测→进程管理→崩溃检测→文件补全 |
| `launch.config.service.ts` | **252** | JVM/MC参数构建，账户处理，GC策略 |
| `watcher.service.ts` | 354 | 进程监控，日志收集，崩溃关键词检测 |
| `crash.service.ts` | 418 | 10种崩溃模式匹配，诊断报告生成 |
| `java.management.service.ts` | 348 | Java自动检测/验证/版本推荐 |
| `launcher.ts` | — | ✅ 已在 v0.3.0 删除，旧代码已清理 |

### 4. 版本与下载

| 文件 | 行数 | 功能 |
|------|------|------|
| `download.service.ts` | 184 | 真实下载，32线程并发，进度回调 |
| `download.config.ts` | 73 | 下载配置常量 |
| `curseforge.service.ts` | 115 | CF API 搜索/详情/文件列表 |
| `modrinth.service.ts` | 118 | Modrinth API 搜索/版本/下载 |
| `content.service.ts` | 421 | CurseForge + Modrinth 统一接口 |
| `content.ipc.ts` | 31 | 内容服务单例管理 |
| `versions.ts` | 266 | ✅ `isVersionInstalled()` 已修复（v0.4.0） |
| `DownloadsPage.vue` | — | ✅ 接入 BMCLAPI，本地版本判断 |

### 5. 实例与 Mod 管理

| 文件 | 行数 | 功能 |
|------|------|------|
| `instances.ts` | 93 | 实例 CRUD |
| `instance.enhanced.service.ts` | 230 | 完整版：目录初始化，Mod 扫描，CRUD |
| `mod.service.ts` | 324 | Mod 扫描/安装/启用/禁用/兼容性检查 |
| `modloader.config.ts` | 148 | 版本映射（Forge/Fabric/Quilt/NeoForge） |
| `modloader.service.ts` | 442 | Fabric 完整；Forge/NeoForge/Quilt `downloadInstaller()` 仍是 stub |
| `skin.service.ts` | 88 | ✅ 皮肤系统已完整接入前端（v0.4.0 确认） |
| `InstancesPage.vue` | — | 实例卡片网格 + 列表视图 |
| `InstanceDetail.vue` | — | Mod管理，版本信息 |

### 6. 前端 UI（9个页面全部完成）

| 页面 | 状态 | 说明 |
|------|------|------|
| HomePage | ✅ | 启动入口，账户切换，快速操作 |
| AccountPage | ✅ | Device Flow 弹窗，离线登录，皮肤渲染 |
| InstancesPage | ✅ | 卡片网格，搜索，CRUD |
| InstanceDetail | ✅ | Mod 管理，启动配置 |
| DownloadsPage | ✅ | BMCLAPI 原版，CF+Modrinth 社区 |
| VersionsPage | ✅ | 版本列表，分类过滤 |
| LaunchPage | ✅ | 真实游戏启动，进度推送 |
| SettingsPage | ✅ | 主题个性化，下载配置，Java选择 |
| MorePage | ✅ | 关于，鸣谢，反馈，动态版本号 |

### 7. Px UI 组件库

| 组件 | 功能 |
|------|------|
| `PxModal.vue` | Teleport + 背景锁 + Esc 关闭 |
| `PxProgress.vue` | 动画条 + 文字 |
| `PxBadge.vue` | dot/pulse/渐变/描边 变体 |
| `pixel-ui.css` | 49KB 完整像素风设计系统 |

### 8. IPC 层

- **12 个 IPC 文件**：account / config / content / crash / dialog / download / game / instance / java / mod / modloader / window
- **30+ 通道**，完整类型安全
- preload.ts 暴露 API 全部接入
- **新增（v0.4.0）**：`app:get-version`、`versions:is-installed`

---

## 二、没做的（❌）

### 1. 架构层面 — 游戏适配器模式

**原始规格（`.plan-original.md`）规划了可扩展适配器架构：**

```
adapters/
├── types.ts              # IGameAdapter 接口
├── minecraft.adapter.ts  # Minecraft 实现
└── registry.ts           # 适配器注册中心
```

**实际情况：没有完全实现 `adapters/` 目录。** 游戏管理部分硬编码在各 service 里，无法便捷地接入其他游戏。

### 2. 功能层面

| 功能 | 文档位置 | 状态 |
|------|---------|------|
| **实例导入/导出** | TASKS.md | ✅ 已完成（`instance.export.ts`） |
| **Mod 配置编辑 UI** | TASKS.md | ✅ 已完成（InstanceDetail.vue） |
| **Mod 自动更新检测** | TASKS.md | ✅ 已完成（v0.3.0） |
| **Forge/NeoForge/Quilt 完整安装** | TASKS.md | ❌ `downloadInstaller()` 仍是 stub |
| **启动器自身热更新** | TASKS.md | ❌ 未做 |
| **服务器管理（多人游戏）** | TASKS.md | ❌ 未做 |
| **光影包管理** | TASKS.md | ❌ 未做 |
| **资源包云同步** | TASKS.md | ❌ 未做 |
| **全局下载进度弹窗** | TASKS.md | ✅ 已完成（DownloadFloat.vue） |
| **通知系统** | TASKS.md | ✅ 已完成（PxNotification.vue） |
| **全局快捷键** | TASKS.md | ❌ 未做 |
| **主题自定义（色盘）** | TASKS.md | ❌ 未做 |
| **背景自定义（上传图片）** | TASKS.md | ❌ 未做 |
| **单元测试** | TASKS.md | ❌ 未做 |
| **CI/CD（GitHub Actions）** | TASKS.md | ❌ 未做 |

---

## 三、做了但有问题（⚠️）

### 1. `versions.ts` — `isVersionInstalled()` 已修复

```typescript
// electron/services/versions.ts — v0.4.0 已修复
isVersionInstalled(id: string): boolean {
  // json 存在即算安装；jar 不存在时检查 inheritsFrom
  const versionDir = path.join(this.versionsPath, id)
  if (!fs.existsSync(path.join(versionDir, `${id}.json`))) return false
  // 检查 jar 或 inheritsFrom...
}
```

**状态：✅ 已在 v0.4.0 修复。**

---

### 2. `launcher.ts` — 已删除

- 已在 v0.3.0 commit (`7d591bc`) 中删除
- 所有 IPC 调用已迁移到 `game.*`
- **状态：✅ 已清理，无残留。**

---

### 3. ModLoader — Forge/NeoForge/Quilt 下载未实现

```typescript
// electron/services/modloader.service.ts 第 333 行
async downloadInstaller(type: 'forge'|'neoforge'|'quilt'): Promise<string> {
  // 只返回拼接路径，没实际下载
  return path.join(installerDir, `${mcVersion}-${type}.jar`);
}
```

| ModLoader | 安装状态 |
|-----------|---------|
| Fabric | ✅ 完全实现（下载→安装→验证） |
| Forge | ⚠️ stub（`downloadInstaller()` 未实现） |
| NeoForge | ⚠️ stub（同上） |
| Quilt | ⚠️ stub（同上） |

---

### 4. Sass legacy JS API 警告

构建时 82 个弃用警告：
```
DEPREGATION WARNING [legacy-js-api]: legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.
```

**原因：** Vite 使用了旧的 Sass 实现。
**修复：** 改用 `sass` 包（dart-sass）替代 `node-sass`。
**状态：⚠️ 已知，未修复。**

---

## 四、架构偏差汇总

| `.plan-original.md` 规划 | 实际实现 | 偏差 |
|------------------------|---------|------|
| `core/services/` | `electron/services/` | ✅ 目录名调整 |
| `src/views/` | `src/pages/` | ✅ 目录名调整 |
| **IGameAdapter 适配器模式** | 部分实现 | 🔴 不完整 |
| `auth.service.ts`（合并） | 拆分为 `accounts.ts` + `microsoft.auth.ts` | ✅ 更好 |
| `game.service.ts`（合并） | 拆分为 `game.launcher.service.ts` + `launch.config.service.ts` | ✅ 更好 |
| 10 个服务 | 25 个服务（更丰富） | ✅ 超额完成 |

---

## 五、后续开发计划

### 🔴 P1 — 必须完成（v0.5.0）

| 优先级 | 任务 | 影响 | 状态 |
|--------|------|------|------|
| P1-1 | Forge 安装完整实现（`downloadInstaller`） | Forge 用户无法安装 | ⬜ 待做 |
| P1-2 | NeoForge 安装完整实现 | NeoForge 用户无法安装 | ⬜ 待做 |
| P1-3 | Quilt 安装完整实现 | Quilt 用户无法安装 | ⬜ 待做 |
| P1-4 | 启动器自身热更新（auto-updater） | 用户需手动下载更新 | ⬜ 待做 |
| P1-5 | 下载源优化（多线程、断点续传） | 下载体验 | ⬜ 待做 |

### 🟢 P2 — 体验完善（v0.5.0）

| 任务 | 说明 | 状态 |
|------|------|------|
| Mod 自动更新检测 | ✅ 已完成（v0.3.0） |
| 整合包创建工具 | 打包 Mod + 资源包 | ⬜ 待做 |
| 快捷键系统 | 全局快捷键启动游戏 | ⬜ 待做 |
| 背景自定义 | 上传自定义背景图 | ⬜ 待做 |
| 主题自定义（色盘） | 用户自定义主题颜色 | ⬜ 待做 |
| 数据备份/迁移 | 导出/导入配置和实例 | ⬜ 待做 |

---

## 六、推荐开发顺序

```
第1-2天 → P1：Forge/NeoForge/Quilt 安装完整实现
第3天   → P1：启动器 auto-updater
第4天   → P2：Mod 自动更新检测 + 数据备份
第5天   → P2：快捷键系统 + 背景自定义
第6天   → 修复已知问题（Sass 警告等）
第7天   → 测试 + 更新文档
发布     → v0.5.0
```

---

## 七、已知未解决问题

| 问题 | 状态 | 说明 |
|------|------|------|
| Sass legacy JS API 警告 | ⚠️ 已知 | 构建时 82 个弃用警告，需迁移到 dart-sass |
| 热重载兼容 | ⚠️ 已知 | `electron-vite dev` 模式 IPC handlers 不注册，需改用 build 模式运行 |
| 首次启动版本列表慢 | ⚠️ 已知 | BMCLAPI 网络请求慢，可加 loading 状态 |
| Windows 图标缓存 | ⚠️ 已知 | 每次重建 ICO 后需 `ie4uinit.exe -show` 清理缓存 |
| `launcher.ts` 旧代码残留 | ✅ 已删除 | v0.4.0 清理完毕 |

---

## 八、文档状态

| 文档 | 准确性 | 问题 |
|------|--------|------|
| `README.md` | ⚠️ 部分 | 版本号需更新 |
| `TASKS.md` | ✅ 最新 | v0.4.0 已发布 |
| `RELEASE_NOTES.md` | ✅ 最新 | v0.4.0 已追加 |
| `DEVELOPMENT_PLAN.md` | ✅ 已更新 | Phase 4 已完成 |
| `DEVELOPMENT_SUMMARY.md` | ✅ 已更新 | 本文档（v0.4.0） |
| `build-log.txt` | ⚠️ 过期 | 记录 v0.1.0 构建，非当前版本 |
