/**
 * 跨平台Java管理服务
 * 负责自动检测系统中已安装的所有Java版本，提供全面的Java环境管理功能
 */

import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { getDatabase } from './database'
import { VersionsService } from './versions'
import { logger } from '../utils/logger'
const log = logger.child('JavaService')

/**
 * Java信息接口 - 包含完整的Java环境信息
 */
export interface JavaInfo {
  id: string                    // 唯一标识符
  path: string                 // java可执行文件完整路径
  javaHome: string             // Java安装根目录
  version: string              // 完整版本号（如17.0.9+8）
  majorVersion: number         // 主版本号（8/11/17/21等）
  vendor: string               // 供应商（Oracle/OpenJDK/Eclipse Temurin等）
  arch: '64' | '32'            // 架构类型
  isJdk: boolean               // 是否为JDK（包含javac）
  isJre: boolean               // 是否为JRE
  isInPath: boolean            // 是否在PATH环境变量中
  isJavaHome: boolean          // 是否为当前JAVA_HOME指向的Java
  isDefault: boolean           // 是否为默认Java
  installationPath: string     // 安装路径
  detectedFrom: string         // 检测来源（PATH/Registry/CommonLocation等）
  lastVerified: string         // 最后验证时间
}

/**
 * 检测进度信息接口
 */
export interface DetectionProgress {
  step: number
  totalSteps: number
  currentStep: string
  message: string
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  success: boolean
  javaVersion?: string
  javacVersion?: string
  error?: string
}

// ===== 公共 API =====

/**
 * 全面扫描系统所有Java版本，返回去重列表
 * @param onProgress 进度回调函数
 */
export async function detectAllJava(
  onProgress?: (progress: DetectionProgress) => void
): Promise<JavaInfo[]> {
  log.info('[JavaService] 开始全面Java环境扫描')
  
  const steps = [
    '检查环境变量',
    '扫描常见安装目录',
    '检查系统特定位置',
    '验证检测到的Java'
  ]
  
  const updateProgress = (step: number, message: string) => {
    if (onProgress) {
      onProgress({
        step,
        totalSteps: steps.length,
        currentStep: steps[step - 1],
        message
      })
    }
  }

  updateProgress(1, '正在检查环境变量')
  
  const candidates: string[] = []
  const results: JavaInfo[] = []
  const seen = new Set<string>()

  // 1. 收集所有候选路径
  try {
    // 从环境变量PATH中查找
    const pathCandidates = await findInPath()
    candidates.push(...pathCandidates)
    log.info(`[JavaService] 从PATH中找到 ${pathCandidates.length} 个Java候选`)
    
    updateProgress(2, '正在扫描常见安装目录')
    
    // 根据操作系统收集其他候选
    if (process.platform === 'win32') {
      candidates.push(...await getWindowsCandidates())
    } else if (process.platform === 'darwin') {
      candidates.push(...await getMacCandidates())
    } else {
      candidates.push(...await getLinuxCandidates())
    }
    
    log.info(`[JavaService] 共收集到 ${candidates.length} 个Java候选路径`)
    
    updateProgress(3, '正在检查系统特定位置')
    
    // 2. 去重并验证
    updateProgress(4, '正在验证检测到的Java')
    
    for (let i = 0; i < candidates.length; i++) {
      const javaExe = candidates[i]
      
      if (seen.has(javaExe)) continue
      seen.add(javaExe)
      
      if (!fs.existsSync(javaExe)) {
        continue
      }
      
      log.info(`[JavaService] 正在验证 Java: ${javaExe}`)
      const info = await probeJava(javaExe)
      if (info) {
        results.push(info)
        log.info(`[JavaService] 成功检测到 Java: ${info.vendor} ${info.version}`)
      }
    }
    
  } catch (error) {
    log.error('[JavaService] Java检测过程出错:', error)
  }

  // 3. 标记默认Java
  if (results.length > 0) {
    markDefaultJava(results)
  }

  log.info(`[JavaService] 扫描完成，共找到 ${results.length} 个 Java 版本`)
  return results
}

/**
 * 获取默认Java（读取用户预设 + 根据游戏版本智能选择）
 */
export async function getDefaultJava(mcVersion?: string): Promise<JavaInfo | null> {
  const db = getDatabase()
  const versionSvc = new VersionsService(getDatabase())

  // 读取用户预设
  const presetRow = db.prepare("SELECT value FROM configs WHERE key = 'java_preset'").get() as
    | { value: string }
    | undefined
  const preset = presetRow?.value || 'auto'

  // 读取自定义路径
  const customPathRow = db
    .prepare("SELECT value FROM configs WHERE key = 'java_custom_path'")
    .get() as { value: string } | undefined
  const customPath = customPathRow?.value || ''

  log.info(`[JavaService] getDefaultJava - preset: ${preset}, customPath: ${customPath}`)

  // 1. custom 模式：直接用用户指定路径
  if (preset === 'custom') {
    if (customPath && fs.existsSync(customPath)) {
      const info = await probeJava(customPath)
      if (info) {
        log.info(`[JavaService] 使用自定义 Java: ${info.vendor} ${info.version}`)
        return info
      }
    }
    log.warn('[JavaService] custom 模式路径无效，降级到自动检测')
  }

  // 2. 扫描所有 Java
  const all = await detectAllJava()
  if (all.length === 0) {
    return null
  }

  // 3. 按预设过滤
  let candidates: JavaInfo[] = [...all]

  if (preset === 'java8') {
    candidates = all.filter((j) => j.majorVersion === 8)
  } else if (preset === 'java17') {
    candidates = all.filter((j) => j.majorVersion === 17)
  } else if (preset === 'java21') {
    candidates = all.filter((j) => j.majorVersion === 21)
  } else if (preset === 'auto' && mcVersion) {
    // 自动模式：根据游戏版本来推荐
    const { recommended } = versionSvc.getRecommendedJavaVersion(mcVersion)
    const targetMajor = parseInt(recommended)
    candidates = all.filter((j) => j.majorVersion >= targetMajor)
    // 按推荐程度排序：优先匹配推荐版本，其次更高版本
    candidates.sort((a, b) => {
      if (a.majorVersion === targetMajor && b.majorVersion !== targetMajor) return -1
      if (b.majorVersion === targetMajor && a.majorVersion !== targetMajor) return 1
      return b.majorVersion - a.majorVersion
    })
  } else {
    // 默认按最新版本优先排序
    candidates.sort((a, b) => b.majorVersion - a.majorVersion)
  }

  if (candidates.length === 0) {
    // 该版本没有，降级到所有版本里找
    log.warn(`[JavaService] 未找到 ${preset}，降级到可用版本`)
    candidates = [...all]
    candidates.sort((a, b) => b.majorVersion - a.majorVersion)
  }

  const chosen = candidates[0]
  log.info(
    `[JavaService] 自动检测到 ${all.length} 个 Java（预设: ${preset}，MC: ${mcVersion || '?'}，选中: ${chosen?.vendor} ${chosen?.version}）`
  )
  return chosen
}

/**
 * 设置默认Java路径
 */
export function setDefaultJava(javaPath: string): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.prepare(
    `
    INSERT INTO configs (key, value, type, updated_at)
    VALUES ('default_java', ?, 'string', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `
  ).run(javaPath, now)
  log.info(`[JavaService] 设置默认 Java 路径: ${javaPath}`)
}

/**
 * 验证指定Java路径是否有效
 */
export async function validateJava(javaPath: string): Promise<ValidationResult> {
  try {
    if (!fs.existsSync(javaPath)) {
      return {
        success: false,
        error: 'Java可执行文件不存在'
      }
    }

    const result: ValidationResult = {
      success: true
    }

    // 验证java命令
    try {
      const javaOutput = execSync(`"${javaPath}" -version 2>&1`, {
        timeout: 5000,
        encoding: 'utf-8'
      })
      result.javaVersion = extractVersionString(javaOutput)
    } catch (error) {
      result.success = false
      result.error = '无法执行java命令'
      return result
    }

    // 检查是否有javac（判断是否为JDK）
    const javacPath = path.join(path.dirname(javaPath), process.platform === 'win32' ? 'javac.exe' : 'javac')
    if (fs.existsSync(javacPath)) {
      try {
        const javacOutput = execSync(`"${javacPath}" -version 2>&1`, {
          timeout: 5000,
          encoding: 'utf-8'
        })
        result.javacVersion = extractVersionString(javacOutput)
      } catch (error) {
        // javac验证失败不影响整体结果，只记录javac版本为undefined
      }
    }

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 推荐适合指定MC版本的Java主版本
 */
export function recommendedJavaMajor(mcVersion: string): number {
  // MC 1.20.5+ 需要 Java 21
  if (compareVersions(mcVersion, '1.20.5') >= 0) return 21
  // MC 1.17+ 需要 Java 17
  if (compareVersions(mcVersion, '1.17') >= 0) return 17
  // 1.16 及以下 Java 8 即可
  return 8
}

/**
 * 查找最佳Java版本（兼容旧版接口）
 */
export async function findBestJava(mcVersion?: string): Promise<JavaInfo | null> {
  return getDefaultJava(mcVersion)
}

// ===== 内部实现 =====

/**
 * 从环境变量PATH中查找Java
 */
async function findInPath(): Promise<string[]> {
  const candidates: string[] = []
  
  try {
    const pathEnv = process.env.PATH || ''
    const pathDirs = pathEnv.split(process.platform === 'win32' ? ';' : ':')
    
    for (const dir of pathDirs) {
      if (!dir.trim()) continue
      
      const javaExe = process.platform === 'win32' 
        ? path.join(dir, 'java.exe')
        : path.join(dir, 'java')
      
      if (fs.existsSync(javaExe)) {
        candidates.push(javaExe)
      }
    }
    
    // 尝试使用系统命令查找
    try {
      const cmd = process.platform === 'win32' ? 'where java' : 'which -a java'
      const output = execSync(cmd, { timeout: 3000 }).toString().trim()
      
      if (output) {
        const paths = output.split('\n').map(p => p.trim()).filter(p => p)
        for (const p of paths) {
          if (fs.existsSync(p) && !candidates.includes(p)) {
            candidates.push(p)
          }
        }
      }
    } catch {}
    
  } catch (error) {
    log.warn('[JavaService] 从PATH查找Java失败:', error)
  }
  
  return candidates
}

/**
 * Windows平台的Java候选路径收集
 */
async function getWindowsCandidates(): Promise<string[]> {
  const candidates: string[] = []
  
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files'
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const local = process.env['LOCALAPPDATA'] || ''
  const appData = process.env['APPDATA'] || ''

  const roots = [
    pf,
    pf86,
    local,
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    `${appData}\\Local\\Programs`,
    'C:\\Program Files\\Java',
    'C:\\Program Files (x86)\\Java',
    'C:\\Program Files\\Amazon Corretto',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files\\Azul',
    'C:\\Program Files\\GraalVM'
  ]

  const vendors = [
    'Java',
    'Eclipse Adoptium',
    'Eclipse Foundation',
    'AdoptOpenJDK',
    'OpenJDK',
    'BellSoft',
    'Azul',
    'Zulu',
    'Microsoft',
    'Amazon Corretto',
    'GraalVM CE',
    'GraalVM',
    'Semeru',
    'IBM'
  ]

  const versions = [
    'jdk-24', 'jdk-23', 'jdk-22', 'jdk-21', 'jdk-20', 'jdk-19', 'jdk-18', 'jdk-17',
    'jdk-16', 'jdk-15', 'jdk-14', 'jdk-13', 'jdk-12', 'jdk-11',
    'jdk-10', 'jdk-9', 'jdk-8', 'jre-8', 'jdk1.8.0',
    'jre-11', 'jre-17', 'jre-21', 'jre-22', 'jre-23',
    'jre'
  ]

  // 检查常见目录结构
  for (const root of roots) {
    for (const vendor of vendors) {
      for (const ver of versions) {
        const javaPath = path.join(root, vendor, ver, 'bin', 'java.exe')
        candidates.push(javaPath)
        candidates.push(path.join(root, vendor, ver + '-hotspot', 'bin', 'java.exe'))
        candidates.push(path.join(root, vendor, ver + '-jre', 'bin', 'java.exe'))
      }

      // 检查 vendor 目录下的所有子目录（通配查找）
      try {
        const vendorPath = path.join(root, vendor)
        if (fs.existsSync(vendorPath)) {
          const dirs = fs.readdirSync(vendorPath)
          for (const dir of dirs) {
            const javaPath = path.join(vendorPath, dir, 'bin', 'java.exe')
            if (fs.existsSync(javaPath)) {
              candidates.push(javaPath)
            }
          }
        }
      } catch {}
    }
    
    // 检查根目录下的所有可能的JDK/JRE目录
    try {
      if (fs.existsSync(root)) {
        const dirs = fs.readdirSync(root)
        for (const dir of dirs) {
          if (dir.toLowerCase().includes('jdk') || dir.toLowerCase().includes('jre') || 
              dir.toLowerCase().includes('java')) {
            const javaPath = path.join(root, dir, 'bin', 'java.exe')
            if (fs.existsSync(javaPath)) {
              candidates.push(javaPath)
            }
          }
        }
      }
    } catch {}
  }

  // JAVA_HOME
  if (process.env['JAVA_HOME']) {
    candidates.push(path.join(process.env['JAVA_HOME'], 'bin', 'java.exe'))
  }

  // Oracle Java PATH 常见位置
  candidates.push(
    'C:\\Program Files\\Common Files\\Oracle\\Java\\javapath\\java.exe',
    'C:\\Program Files (x86)\\Common Files\\Oracle\\Java\\java8path\\java.exe',
    path.join(pf, 'Oracle\\Java\\javapath', 'java.exe')
  )

  // Windows注册表检查
  try {
    const registryJavas = await getWindowsRegistryJavaPaths()
    candidates.push(...registryJavas)
  } catch (error) {
    log.warn('[JavaService] 从注册表读取Java路径失败:', error)
  }

  // Minecraft 官方启动器自带 JRE
  const mcJre = path.join(
    local,
    'Packages',
    'Microsoft.4297127D64EC6_8wekyb3d8bbwe',
    'LocalCache',
    'Local',
    'runtime'
  )
  if (fs.existsSync(mcJre)) {
    try {
      for (const dir of fs.readdirSync(mcJre)) {
        const javaExe = path.join(mcJre, dir, 'windows-x64', dir, 'bin', 'java.exe')
        if (fs.existsSync(javaExe)) candidates.push(javaExe)
      }
    } catch {}
  }

  return candidates
}

/**
 * 从Windows注册表获取Java路径
 */
async function getWindowsRegistryJavaPaths(): Promise<string[]> {
  const candidates: string[] = []
  
  try {
    // 使用reg query命令查询注册表
    const registryPaths = [
      'HKLM\\SOFTWARE\\JavaSoft\\Java Runtime Environment',
      'HKLM\\SOFTWARE\\JavaSoft\\JDK',
      'HKLM\\SOFTWARE\\Eclipse Adoptium\\JDK',
      'HKLM\\SOFTWARE\\Microsoft\\JDK',
      'HKLM\\SOFTWARE\\Azul Systems\\Zulu',
      'HKLM\\SOFTWARE\\BellSoft\\Liberica',
      // 32位注册表
      'HKLM\\SOFTWARE\\WOW6432Node\\JavaSoft\\Java Runtime Environment',
      'HKLM\\SOFTWARE\\WOW6432Node\\JavaSoft\\JDK'
    ]
    
    for (const regPath of registryPaths) {
      try {
        const output = execSync(`reg query "${regPath}" /s /f "JavaHome" /t REG_SZ 2>nul`, { 
          encoding: 'utf-8',
          timeout: 5000
        })
        
        if (output) {
          // 解析JavaHome路径
          const lines = output.split('\n')
          for (const line of lines) {
            if (line.includes('JavaHome') && line.includes('REG_SZ')) {
              const match = line.match(/REG_SZ\s+(.+)$/)
              if (match && match[1]) {
                const javaHome = match[1].trim()
                const javaExe = path.join(javaHome, 'bin', 'java.exe')
                if (fs.existsSync(javaExe) && !candidates.includes(javaExe)) {
                  candidates.push(javaExe)
                }
              }
            }
          }
        }
      } catch {}
    }
  } catch (error) {
    log.warn('[JavaService] 注册表查询失败:', error)
  }
  
  return candidates
}

/**
 * macOS平台的Java候选路径收集
 */
async function getMacCandidates(): Promise<string[]> {
  const candidates: string[] = []
  
  // 标准Java安装目录
  const standardPaths = [
    '/Library/Java/JavaVirtualMachines',
    '/System/Library/Java/JavaVirtualMachines',
    '/opt/homebrew/opt',
    '/usr/local/opt',
    '/opt/homebrew/Cellar',
    '/usr/local/Cellar'
  ]
  
  for (const basePath of standardPaths) {
    if (!fs.existsSync(basePath)) continue
    
    try {
      const dirs = fs.readdirSync(basePath)
      for (const dir of dirs) {
        if (dir.toLowerCase().includes('java') || 
            dir.toLowerCase().includes('jdk') || 
            dir.toLowerCase().includes('jre') ||
            dir.toLowerCase().includes('temurin') ||
            dir.toLowerCase().includes('openjdk') ||
            dir.toLowerCase().includes('zulu')) {
          
          // 尝试不同的路径结构
          const possiblePaths = [
            path.join(basePath, dir, 'Contents', 'Home', 'bin', 'java'),
            path.join(basePath, dir, 'bin', 'java'),
            path.join(basePath, dir, 'libexec', 'openjdk.jdk', 'Contents', 'Home', 'bin', 'java')
          ]
          
          for (const javaPath of possiblePaths) {
            if (fs.existsSync(javaPath) && !candidates.includes(javaPath)) {
              candidates.push(javaPath)
            }
          }
        }
      }
    } catch {}
  }
  
  // Homebrew检查
  try {
    const brewOutput = execSync('brew list --formula 2>/dev/null | grep -i java', { 
      encoding: 'utf-8',
      timeout: 3000
    })
    if (brewOutput) {
      const formulae = brewOutput.split('\n').filter(f => f.trim())
      for (const formula of formulae) {
        try {
          const prefixOutput = execSync(`brew --prefix ${formula} 2>/dev/null`, { 
            encoding: 'utf-8',
            timeout: 3000
          })
          const prefix = prefixOutput.trim()
          const javaPath = path.join(prefix, 'bin', 'java')
          if (fs.existsSync(javaPath) && !candidates.includes(javaPath)) {
            candidates.push(javaPath)
          }
        } catch {}
      }
    }
  } catch {}
  
  // JAVA_HOME
  if (process.env['JAVA_HOME']) {
    candidates.push(path.join(process.env['JAVA_HOME'], 'bin', 'java'))
  }
  
  return candidates
}

/**
 * Linux平台的Java候选路径收集
 */
async function getLinuxCandidates(): Promise<string[]> {
  const candidates: string[] = []
  
  // 标准Java安装目录
  const jvmBasePaths = [
    '/usr/lib/jvm',
    '/usr/java',
    '/opt/java',
    '/usr/local/java',
    '/opt'
  ]
  
  for (const basePath of jvmBasePaths) {
    if (!fs.existsSync(basePath)) continue
    
    try {
      const dirs = fs.readdirSync(basePath)
      for (const dir of dirs) {
        if (dir.toLowerCase().includes('java') || 
            dir.toLowerCase().includes('jdk') || 
            dir.toLowerCase().includes('jre') ||
            dir.toLowerCase().includes('temurin') ||
            dir.toLowerCase().includes('openjdk') ||
            dir.toLowerCase().includes('zulu') ||
            dir.toLowerCase().includes('graalvm')) {
          
          const javaPath = path.join(basePath, dir, 'bin', 'java')
          if (fs.existsSync(javaPath) && !candidates.includes(javaPath)) {
            candidates.push(javaPath)
          }
        }
      }
    } catch {}
  }
  
  // update-alternatives检查
  try {
    const alternativesOutput = execSync('update-alternatives --list java 2>/dev/null', { 
      encoding: 'utf-8',
      timeout: 3000
    })
    if (alternativesOutput) {
      const paths = alternativesOutput.split('\n').map(p => p.trim()).filter(p => p)
      for (const javaPath of paths) {
        if (fs.existsSync(javaPath) && !candidates.includes(javaPath)) {
          candidates.push(javaPath)
        }
      }
    }
  } catch {}
  
  // 常见位置
  candidates.push('/usr/bin/java', '/usr/local/bin/java')
  
  // JAVA_HOME
  if (process.env['JAVA_HOME']) {
    candidates.push(path.join(process.env['JAVA_HOME'], 'bin', 'java'))
  }
  
  return candidates
}

/**
 * 探测单个java可执行文件，返回完整的JavaInfo
 */
export async function probeJava(javaExe: string): Promise<JavaInfo | null> {
  try {
    log.info(`[JavaService] 正在探测 Java: ${javaExe}`)
    
    // 执行java -version命令
    const output = execSync(`"${javaExe}" -version 2>&1`, {
      timeout: 5000,
      encoding: 'utf-8'
    })

    const info = parseJavaInfo(javaExe, output)
    if (info) {
      log.info(`[JavaService] Java 探测成功: ${info.vendor} ${info.version} (${info.majorVersion})`)
    }
    return info
  } catch (e: any) {
    // 某些Java实现可能会抛异常，尝试从stderr获取输出
    log.warn(`[JavaService] Java 探测异常: ${javaExe}`, e.message)
    const output = (e.stderr || '').toString()
    if (!output) {
      return null
    }
    return parseJavaInfo(javaExe, output)
  }
}

/**
 * 解析java -version输出，构建完整的JavaInfo对象
 */
function parseJavaInfo(javaExe: string, output: string): JavaInfo | null {
  log.debug(`[JavaService] parseJavaInfo output:`, output)

  // 版本提取：支持多种格式
  const versionMatch = output.match(/version\s+"([\d._+\-a-zA-Z]+)"/)
  if (!versionMatch) {
    log.warn(`[JavaService] 无法解析 Java 版本: ${output}`)
    return null
  }

  const rawVersion = versionMatch[1]
  let version = rawVersion
  let majorVersion = 8

  // 处理不同版本格式
  if (rawVersion.startsWith('1.')) {
    // Java 8及以下格式: 1.8.0_392
    majorVersion = parseInt(rawVersion.split('.')[1]) || 8
    version = rawVersion
  } else {
    // Java 9+格式: 17.0.9, 21.0.1+12
    majorVersion = parseInt(rawVersion.split('.')[0]) || 8
    version = rawVersion
  }

  // 供应商识别
  let vendor = 'Unknown'
  if (output.includes('Eclipse Adoptium') || output.includes('Temurin')) vendor = 'Eclipse Temurin'
  else if (output.includes('IBM') || output.includes('Semeru')) vendor = 'IBM Semeru'
  else if (output.includes('OpenJDK')) vendor = 'OpenJDK'
  else if (output.includes('Oracle')) vendor = 'Oracle'
  else if (output.includes('Azul') || output.includes('Zulu')) vendor = 'Azul Zulu'
  else if (output.includes('BellSoft') || output.includes('Liberica')) vendor = 'BellSoft Liberica'
  else if (output.includes('Microsoft')) vendor = 'Microsoft'
  else if (output.includes('GraalVM')) vendor = 'GraalVM'
  else if (output.includes('Amazon') || output.includes('Corretto')) vendor = 'Amazon Corretto'
  else if (output.includes('Red Hat')) vendor = 'Red Hat'

  // 架构识别
  const arch: '64' | '32' = output.includes('64-Bit') || output.includes('64-bit') || 
                             output.includes('amd64') || output.includes('x86_64') || 
                             output.includes('aarch64') ? '64' : '32'

  // 计算Java安装根目录
  const javaBinDir = path.dirname(javaExe)
  const javaHome = path.dirname(javaBinDir)
  
  // 检查是否为JDK（是否有javac）
  const javacExe = process.platform === 'win32' ? 'javac.exe' : 'javac'
  const isJdk = fs.existsSync(path.join(javaBinDir, javacExe))
  
  // 确定是否在PATH中
  const isInPath = checkIfInPath(javaExe)
  
  // 确定是否为当前JAVA_HOME
  let isJavaHome = false
  if (process.env['JAVA_HOME']) {
    const normalizedJavaHome = path.resolve(process.env['JAVA_HOME'])
    const normalizedCandidateHome = path.resolve(javaHome)
    isJavaHome = normalizedJavaHome === normalizedCandidateHome
  }

  // 生成稳定 ID（路径 hash）
  const id = `java_${Buffer.from(javaExe)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 12)}`

  return {
    id,
    path: javaExe,
    javaHome,
    version,
    majorVersion,
    vendor,
    arch,
    isJdk,
    isJre: !isJdk,
    isInPath,
    isJavaHome,
    installationPath: javaHome,
    detectedFrom: detectJavaSource(javaExe),
    lastVerified: new Date().toISOString(),
    isDefault: false
  }
}

/**
 * 检查Java是否在PATH环境变量中
 */
function checkIfInPath(javaExe: string): boolean {
  try {
    const pathEnv = process.env.PATH || ''
    const javaDir = path.dirname(javaExe)
    
    const pathDirs = pathEnv.split(process.platform === 'win32' ? ';' : ':')
    return pathDirs.some(dir => {
      try {
        return path.resolve(dir.trim()) === path.resolve(javaDir)
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

/**
 * 检测Java的安装来源类型
 */
function detectJavaSource(javaExe: string): string {
  const lowerPath = javaExe.toLowerCase()
  
  if (process.env['JAVA_HOME'] && lowerPath.includes(process.env['JAVA_HOME'].toLowerCase())) {
    return 'JAVA_HOME'
  }
  
  if (lowerPath.includes('registry') || lowerPath.includes('reg_')) {
    return 'Registry'
  }
  
  if (checkIfInPath(javaExe)) {
    return 'PATH'
  }
  
  if (lowerPath.includes('program files')) {
    return 'CommonLocation'
  }
  
  if (lowerPath.includes('library/java') || lowerPath.includes('homebrew')) {
    return 'SystemLocation'
  }
  
  if (lowerPath.includes('usr/lib/jvm') || lowerPath.includes('update-alternatives')) {
    return 'SystemLocation'
  }
  
  return 'Other'
}

/**
 * 标记默认Java版本
 */
function markDefaultJava(javaList: JavaInfo[]): void {
  // 首先查找JAVA_HOME指向的Java
  const javaHomeMatch = javaList.find(j => j.isJavaHome)
  if (javaHomeMatch) {
    javaHomeMatch.isDefault = true
    return
  }
  
  // 其次查找PATH中的Java
  const pathMatch = javaList.find(j => j.isInPath)
  if (pathMatch) {
    pathMatch.isDefault = true
    return
  }
  
  // 最后选择最新版本
  if (javaList.length > 0) {
    const sorted = [...javaList].sort((a, b) => b.majorVersion - a.majorVersion)
    sorted[0].isDefault = true
  }
}

/**
 * 从输出中提取版本字符串
 */
function extractVersionString(output: string): string {
  const versionMatch = output.match(/version\s+"([\d._+\-a-zA-Z]+)"/)
  return versionMatch ? versionMatch[1] : 'unknown'
}

/**
 * 版本比较函数
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}
