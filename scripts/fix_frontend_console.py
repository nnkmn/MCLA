#!/usr/bin/env python3
"""
批量清理前端 src/ 目录下的 console.log/warn/error
策略：
  - console.log(...) 整行删除
  - console.warn(...) / console.error(...) 整行删除（前端无持久日志，生产不需要）
仅处理非注释行
"""

import re
import os

FILES = [
    'src/App.vue',
    'src/components/download/ModDetailModal.vue',
    'src/components/ModManager.vue',
    'src/components/VersionSelect.vue',
    'src/components/VersionSettings.vue',
    'src/pages/AccountPage.vue',
    'src/pages/DownloadsPage.vue',
    'src/pages/InstancesPage.vue',
    'src/pages/LaunchPage.vue',
    'src/pages/SettingsPage.vue',
    'src/pages/VersionsPage.vue',
    'src/stores/download.store.ts',
    'src/stores/versions.store.ts',
]

# 匹配整行是 console.xxx(...) 的模式（允许前置空格，行尾可有分号）
CONSOLE_LINE_RE = re.compile(r'^(\s*)console\.(log|warn|error|debug)\(')

def process_file(filepath: str):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    removed = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()

        # 跳过注释行
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            new_lines.append(line)
            i += 1
            continue

        if CONSOLE_LINE_RE.match(line):
            # 如果行内括号没有闭合，需要跳过多行（比较罕见）
            # 简单处理：统计括号
            text = line.rstrip('\n')
            open_p = text.count('(') - text.count(')')
            while open_p > 0 and i + 1 < len(lines):
                i += 1
                text = lines[i].rstrip('\n')
                open_p += text.count('(') - text.count(')')
            removed += 1
            i += 1
            continue

        new_lines.append(line)
        i += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"✓ {filepath} (removed {removed} console lines)")


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for rel_path in FILES:
        filepath = os.path.join(base, rel_path)
        if os.path.exists(filepath):
            process_file(filepath)
        else:
            print(f"✗ NOT FOUND: {filepath}")


if __name__ == '__main__':
    main()
