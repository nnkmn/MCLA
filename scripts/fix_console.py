#!/usr/bin/env python3
"""
批量将 electron/ 目录下 TS 文件的 console.log/warn/error 替换为 logger 调用
"""

import re
import os

# 需要处理的文件及对应的模块名
FILES = {
    'electron/adapters/minecraft-java.adapter.ts': 'MC-Adapter',
    'electron/adapters/registry.ts': 'AdapterRegistry',
    'electron/ipc/account.ipc.ts': 'Account-IPC',
    'electron/ipc/dialog.ipc.ts': 'Dialog-IPC',
    'electron/ipc/game.ipc.ts': 'Game-IPC',
    'electron/ipc/index.ts': 'IPC',
    'electron/main.ts': 'Main',
    'electron/services/config.ts': 'Config',
    'electron/services/content.service.ts': 'ContentService',
    'electron/services/crash.service.ts': 'CrashService',
    'electron/services/database.ts': 'DB',
    'electron/services/game.launcher.service.ts': 'GameLauncher',
    'electron/services/instance.enhanced.service.ts': 'InstanceEnhanced',
    'electron/services/java.management.service.ts': 'JavaService',
    'electron/services/microsoft.auth.ts': 'OAuth',
    'electron/services/mod.service.ts': 'ModService',
    'electron/services/modloader.service.ts': 'ModLoaderService',
    'electron/services/modloader.ts': 'ModLoader',
    'electron/services/notification.ts': 'Notification',
    'electron/services/versions.ts': 'VersionsService',
    'electron/services/watcher.service.ts': 'WatcherService',
}

# 相对 electron/ 目录，各文件到 utils/logger 的导入路径
IMPORT_PATHS = {
    'electron/adapters/minecraft-java.adapter.ts': '../utils/logger',
    'electron/adapters/registry.ts': '../utils/logger',
    'electron/ipc/account.ipc.ts': '../utils/logger',
    'electron/ipc/dialog.ipc.ts': '../utils/logger',
    'electron/ipc/game.ipc.ts': '../utils/logger',
    'electron/ipc/index.ts': '../utils/logger',
    'electron/main.ts': './utils/logger',
    'electron/services/config.ts': '../utils/logger',
    'electron/services/content.service.ts': '../utils/logger',
    'electron/services/crash.service.ts': '../utils/logger',
    'electron/services/database.ts': '../utils/logger',
    'electron/services/game.launcher.service.ts': '../utils/logger',
    'electron/services/instance.enhanced.service.ts': '../utils/logger',
    'electron/services/java.management.service.ts': '../utils/logger',
    'electron/services/microsoft.auth.ts': '../utils/logger',
    'electron/services/mod.service.ts': '../utils/logger',
    'electron/services/modloader.service.ts': '../utils/logger',
    'electron/services/modloader.ts': '../utils/logger',
    'electron/services/notification.ts': '../utils/logger',
    'electron/services/versions.ts': '../utils/logger',
    'electron/services/watcher.service.ts': '../utils/logger',
}

def process_file(filepath: str, module_name: str, import_path: str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 跳过 logger.ts 本身
    if filepath.endswith('logger.ts'):
        return

    # 计算相对 import
    logger_import = f"import {{ logger }} from '{import_path}'\n"
    child_logger = f"const log = logger.child('{module_name}')\n"

    # 检查是否已有 import
    has_logger_import = "from '../utils/logger'" in content or "from './utils/logger'" in content

    # 替换 console.log -> log.info
    # 替换 console.warn -> log.warn
    # 替换 console.error -> log.error

    # 先把注释掉的 console 行保留不动（以 // 开头的行）
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith('//'):
            new_lines.append(line)
            continue
        # 替换 console.log( -> log.info(
        line = re.sub(r'\bconsole\.log\(', 'log.info(', line)
        # 替换 console.warn( -> log.warn(
        line = re.sub(r'\bconsole\.warn\(', 'log.warn(', line)
        # 替换 console.error( -> log.error(
        line = re.sub(r'\bconsole\.error\(', 'log.error(', line)
        # 替换 console.debug( -> log.debug(
        line = re.sub(r'\bconsole\.debug\(', 'log.debug(', line)
        new_lines.append(line)

    new_content = '\n'.join(new_lines)

    # 如果没有 logger import，在第一个 import 行之前（或文件开头，跳过注释块）添加
    if not has_logger_import and ('log.info(' in new_content or 'log.warn(' in new_content or 'log.error(' in new_content or 'log.debug(' in new_content):
        # 找到最后一个 import 语句后面插入
        import_lines = []
        other_lines = new_content.split('\n')
        last_import_idx = -1
        for i, ln in enumerate(other_lines):
            if ln.startswith('import ') or ln.startswith("import{"):
                last_import_idx = i

        if last_import_idx >= 0:
            insert_after = last_import_idx
            new_lines2 = other_lines[:insert_after+1] + [logger_import.rstrip(), child_logger.rstrip()] + other_lines[insert_after+1:]
            new_content = '\n'.join(new_lines2)
        else:
            # 文件没有 import，插入开头（跳过注释块）
            new_content = logger_import + child_logger + new_content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"✓ {filepath}")


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for rel_path, module_name in FILES.items():
        filepath = os.path.join(base, rel_path)
        import_path = IMPORT_PATHS[rel_path]
        if os.path.exists(filepath):
            process_file(filepath, module_name, import_path)
        else:
            print(f"✗ NOT FOUND: {filepath}")


if __name__ == '__main__':
    main()
