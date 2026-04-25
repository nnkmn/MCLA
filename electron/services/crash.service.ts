import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * 崩溃报告结构
 */
export interface CrashReport {
  id: string;
  instanceId: string;
  time: Date;
  minecraftVersion: string;
  javaVersion: string;
  operatingSystem: string;
  
  // 崩溃原因
  crashCause: {
    exception: string;
    message: string;
    stackTrace: string[];
  };
  
  // 附加信息
  description: string;
  possibleCauses: string[];
  suggestedSolutions: string[];
  
  // 原始数据
  rawContent: string;
}

/**
 * 已知崩溃模式
 */
interface CrashPattern {
  pattern: RegExp;
  title: string;
  description: string;
  causes: string[];
  solutions: string[];
}

// 已知崩溃模式库
const CRASH_PATTERNS: CrashPattern[] = [
  {
    // OutOfMemoryError - Java堆内存不足
    pattern: /OutOfMemoryError:\s*Java heap space/i,
    title: 'Java 堆内存不足',
    description: '游戏分配到的内存不足以加载所有内容',
    causes: [
      '分配的内存过少（建议 4GB 以上）',
      '同时加载过多 Mod',
      '使用了过大的资源包',
      '使用了不兼容的高分辨率材质包'
    ],
    solutions: [
      '增加最大内存分配：在启动器设置中调高 -Xmx 值（建议 4G-8G）',
      '减少 Mod 数量，移除不必要的 Mod',
      '减小资源包分辨率或移除大型资源包',
      '更新显卡驱动',
      '使用 64 位 Java'
    ]
  },
  {
    // OutOfMemoryError - GC overhead
    pattern: /OutOfMemoryError:\s*GC overhead limit exceeded/i,
    title: 'GC 开销超限',
    description: '垃圾回收占用了过多 CPU 时间',
    causes: [
      'Java 堆内存设置不当',
      'Mod 导致内存泄漏',
      '内存碎片化严重'
    ],
    solutions: [
      '增加最大内存分配',
      '添加 JVM 参数 -XX:-UseGCOverheadLimit',
      '更新所有 Mod 到最新版本',
      '清理并重新安装 Mod'
    ]
  },
  {
    // 显卡/渲染崩溃
    pattern: /LWJGL Exception|lwjgl|OpenGL/i,
    title: '显卡/渲染崩溃',
    description: '游戏在初始化 OpenGL 或渲染时崩溃',
    causes: [
      '显卡驱动过旧或损坏',
      '显卡不支持所需的 OpenGL 版本',
      'OptiFine 与其他 Mod 冲突',
      'Java 与显卡驱动不兼容'
    ],
    solutions: [
      '更新显卡驱动到最新版本',
      '在启动器设置中启用兼容模式',
      '移除或更新 OptiFine',
      '尝试使用不同的 Java 版本',
      '在启动参数中添加 -Dsun.java2d.opengl=true'
    ]
  },
  {
    // Mixin 注入失败
    pattern: /Mixin|[mM]ixin.*failed|failed.*[mM]ixin/i,
    title: 'Mixin 注入失败',
    description: 'Mod 使用 Mixin 框架时注入失败',
    causes: [
      'Mixin 版本不兼容',
      'Mod 版本与 Minecraft 版本不匹配',
      '多个 Mod 使用冲突的 Mixin',
      'Mod 加载顺序问题'
    ],
    solutions: [
      '确保所有使用 Mixin 的 Mod 都更新到最新版本',
      '检查 Mod 版本兼容性',
      '使用 Mod 冲突检测工具',
      '移除最近添加的 Mod 进行排查'
    ]
  },
  {
    // 类加载异常
    pattern: /NoClassDefFoundError|ClassNotFoundException/i,
    title: '类加载失败',
    description: '游戏无法找到所需的 Java 类',
    causes: [
      'Mod 缺失依赖',
      'Mod 版本不兼容',
      'jar 文件损坏'
    ],
    solutions: [
      '检查 Mod 所需的前置 Mod 并安装',
      '更新所有 Mod 到兼容版本',
      '重新下载并安装相关 Mod'
    ]
  },
  {
    // 网络相关
    pattern: /SocketException|ConnectionException|HttpRequestException/i,
    title: '网络连接错误',
    description: '游戏在连接服务器或下载资源时出错',
    causes: [
      '网络不稳定',
      '防火墙阻止连接',
      '服务器不可用'
    ],
    solutions: [
      '检查网络连接',
      '关闭防火墙或添加例外',
      '尝试使用 VPN',
      '等待服务器恢复'
    ]
  },
  {
    // 文件系统
    pattern: /IOException|FileNotFoundException|AccessDeniedException/i,
    title: '文件访问错误',
    description: '游戏无法读取或写入文件',
    causes: [
      '游戏目录权限不足',
      '文件路径包含特殊字符',
      '磁盘空间不足',
      '文件被其他程序占用'
    ],
    solutions: [
      '以管理员身份运行启动器',
      '检查游戏目录权限',
      '确保路径不包含中文或特殊字符',
      '清理磁盘空间'
    ]
  },
  {
    // Mod 冲突 - 常见 mod id 冲突
    pattern: /DuplicateModIdException|mod id.*already been loaded/i,
    title: 'Mod ID 冲突',
    description: '两个 Mod 使用了相同的 ID',
    causes: [
      '安装了重复的 Mod',
      'Mod 包中包含重复文件',
      'Mod 更新后 ID 变更'
    ],
    solutions: [
      '检查并移除重复的 Mod',
      '解压 modpack 并检查',
      '更新所有 Mod 到最新版本'
    ]
  },
  {
    // Forge 初始化失败
    pattern: /Failed to load forge|ForgeMod.*error/i,
    title: 'Forge 加载失败',
    description: 'Forge Mod Loader 初始化失败',
    causes: [
      'Forge 版本与 Minecraft 版本不匹配',
      'Forge 安装不完整',
      '与其他 Mod 冲突'
    ],
    solutions: [
      '重新下载并安装对应版本的 Forge',
      '移除最近添加的 Mod',
      '清理并重新安装游戏'
    ]
  },
  {
    // Fabric 初始化失败
    pattern: /FabricLoader.*error|failed to start fabric/i,
    title: 'Fabric 加载失败',
    description: 'Fabric Mod Loader 初始化失败',
    causes: [
      'Fabric 版本与 Minecraft 版本不匹配',
      '缺少 Fabric API',
      '与其他 Mod 冲突'
    ],
    solutions: [
      '确保安装的 Fabric 版本与 Minecraft 匹配',
      '安装 Fabric API mod',
      '更新所有 Mod 到兼容版本'
    ]
  }
];

/**
 * 崩溃分析服务
 */
export class CrashService {
  
  /**
   * 解析崩溃日志
   */
  async parseCrashLog(logPath: string, instanceId: string): Promise<CrashReport | null> {
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      return this.parseCrashContent(content, instanceId, logPath);
    } catch (error) {
      console.error('[CrashService] 读取崩溃日志失败:', error);
      return null;
    }
  }
  
  /**
   * 解析崩溃内容
   */
  parseCrashContent(content: string, instanceId: string, logPath: string): CrashReport {
    const crashCause = this.extractCrashCause(content);
    const matchedPattern = this.matchCrashPattern(content);
    
    // 提取基本信息
    const minecraftVersion = this.extractInfo(content, /minecraft Version.*?:\s*(.+)/i) || 'Unknown';
    const javaVersion = this.extractInfo(content, /java Version.*?:\s*(.+)/i) || 'Unknown';
    const operatingSystem = this.extractInfo(content, /Operating System.*?:\s*(.+)/i) || 'Unknown';
    
    // 生成时间戳
    const timeMatch = content.match(/Time:\s*(.+)/i);
    const time = timeMatch ? new Date(timeMatch[1]) : new Date();
    
    const report: CrashReport = {
      id: this.generateId(logPath),
      instanceId,
      time,
      minecraftVersion,
      javaVersion,
      operatingSystem,
      crashCause,
      description: matchedPattern?.description || '未知原因的崩溃',
      possibleCauses: matchedPattern?.causes || ['请查看完整崩溃报告'],
      suggestedSolutions: matchedPattern?.solutions || ['尝试更新所有 Mod'],
      rawContent: content
    };
    
    return report;
  }
  
  /**
   * 提取崩溃原因
   */
  private extractCrashCause(content: string): { exception: string; message: string; stackTrace: string[] } {
    // 提取异常类型
    const exceptionMatch = content.match(/((?:java\.)?(?:\w+Exception|\w+Error)):\s*(.+)/m);
    const exception = exceptionMatch?.[1] || 'Unknown Exception';
    const message = exceptionMatch?.[2]?.trim() || '';
    
    // 提取堆栈跟踪
    const stackTrace: string[] = [];
    const stackMatch = content.match(/--- Stack Trace ---\n([\s\S]*?)(?=\n---|$)/i);
    if (stackMatch) {
      const lines = stackMatch[1].split('\n').filter(line => line.trim());
      stackTrace.push(...lines.slice(0, 20)); // 限制前20行
    }
    
    // 如果没有标准堆栈，尝试提取 Caused by
    if (stackTrace.length === 0) {
      const causedByMatch = content.match(/Caused by:\s*([\s\S]*?)(?=\n\s*(?:Caused by:|at |\n\n)|$)/i);
      if (causedByMatch) {
        const causedLines = causedByMatch[1].split('\n').filter(line => line.trim());
        stackTrace.push(...causedLines.slice(0, 10));
      }
    }
    
    return { exception, message, stackTrace };
  }
  
  /**
   * 匹配已知崩溃模式
   */
  private matchCrashPattern(content: string): CrashPattern | null {
    for (const pattern of CRASH_PATTERNS) {
      if (pattern.pattern.test(content)) {
        return pattern;
      }
    }
    return null;
  }
  
  /**
   * 提取信息
   */
  private extractInfo(content: string, regex: RegExp): string | null {
    const match = content.match(regex);
    return match?.[1]?.trim() || null;
  }
  
  /**
   * 生成唯一 ID
   */
  private generateId(logPath: string): string {
    const timestamp = Date.now();
    const hash = logPath.split(/[/\\]/).pop() || '';
    return `crash_${hash}_${timestamp}`;
  }
  
  /**
   * 获取崩溃报告目录
   */
  getCrashReportDir(gameDir: string): string {
    return path.join(gameDir, 'crash-reports');
  }
  
  /**
   * 列出所有崩溃报告
   */
  async listCrashReports(gameDir: string): Promise<string[]> {
    const crashDir = this.getCrashReportDir(gameDir);
    
    try {
      const files = await fs.readdir(crashDir);
      return files
        .filter(f => f.startsWith('crash-') && f.endsWith('.txt'))
        .map(f => path.join(crashDir, f))
        .sort()
        .reverse(); // 最新优先
    } catch {
      return [];
    }
  }
  
  /**
   * 获取最新崩溃报告
   */
  async getLatestCrashReport(gameDir: string): Promise<CrashReport | null> {
    const reports = await this.listCrashReports(gameDir);
    if (reports.length === 0) return null;
    
    return this.parseCrashLog(reports[0], '');
  }
  
  /**
   * 生成用户友好的诊断报告
   */
  generateDiagnosisReport(report: CrashReport): string {
    let output = `╔══════════════════════════════════════════╗\n`;
    output += `║           游戏崩溃诊断报告              ║\n`;
    output += `╚══════════════════════════════════════════╝\n\n`;
    
    output += `📋 基本信息\n`;
    output += `─────────────────────────────────────────\n`;
    output += `时间: ${report.time.toLocaleString()}\n`;
    output += `游戏版本: ${report.minecraftVersion}\n`;
    output += `Java 版本: ${report.javaVersion}\n`;
    output += `操作系统: ${report.operatingSystem}\n\n`;
    
    output += `❌ 崩溃原因\n`;
    output += `─────────────────────────────────────────\n`;
    output += `类型: ${report.crashCause.exception}\n`;
    if (report.crashCause.message) {
      output += `信息: ${report.crashCause.message}\n`;
    }
    output += `\n`;
    
    if (report.possibleCauses.length > 0) {
      output += `🔍 可能原因\n`;
      output += `─────────────────────────────────────────\n`;
      report.possibleCauses.forEach((cause, i) => {
        output += `${i + 1}. ${cause}\n`;
      });
      output += `\n`;
    }
    
    if (report.suggestedSolutions.length > 0) {
      output += `💡 建议解决方案\n`;
      output += `─────────────────────────────────────────\n`;
      report.suggestedSolutions.forEach((solution, i) => {
        output += `${i + 1}. ${solution}\n`;
      });
      output += `\n`;
    }
    
    if (report.crashCause.stackTrace.length > 0) {
      output += `📜 堆栈跟踪 (前 ${report.crashCause.stackTrace.length} 行)\n`;
      output += `─────────────────────────────────────────\n`;
      report.crashCause.stackTrace.forEach(line => {
        output += `${line}\n`;
      });
      output += `\n`;
    }
    
    output += `─────────────────────────────────────────\n`;
    output += `完整日志请查看崩溃报告文件\n`;
    
    return output;
  }
}
