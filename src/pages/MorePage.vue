<template>
  <div class="more-page">
    <!-- ========== 关于与鸣谢 ========== -->
    <template v-if="activeCat === 'about'">
      <div class="page-header">
        <h1 class="page-title">关于与鸣谢</h1>
        <p class="page-subtitle">关于 MCLA、开源项目与致谢</p>
      </div>

      <!-- 关于 -->
      <section class="about-section">
        <h2 class="section-title">关于</h2>
        <div class="about-card">
          <!-- 顶部：作者 -->
          <div class="about-author">
            <div class="author-row">
              <div class="author-avatar">
                <img src="/EccenTri-Avatar.png" alt="EccenTri" width="40" height="40" />
              </div>
              <div class="author-info">
                <div class="author-name">EccenTri</div>
                <div class="author-desc">MCLA 的开发者</div>
              </div>
              <a href="https://ifdian.net/a/Eccen" target="_blank" class="author-btn primary">赞助 MCLA</a>
            </div>
          </div>

          <div class="about-divider"></div>

          <!-- 底部：MCLA -->
          <div class="about-app">
            <div class="app-row">
              <div class="app-logo">
                <img src="/LOGO.png" alt="MCLA" width="40" height="40" />
              </div>
              <div class="app-info">
                <div class="app-name">MCLA</div>
                <div class="app-version">当前版本：0.2.0</div>
              </div>
              <a href="https://github.com/nnkmn/MCLA" target="_blank" class="app-btn">查看源代码</a>
            </div>
          </div>
        </div>
      </section>

      <!-- 鸣谢 -->
      <section class="credits-section">
        <h2 class="section-title">鸣谢</h2>
        <div class="credits-list">
          <div class="credit-item" v-for="credit in credits" :key="credit.name">
            <div class="credit-header">
              <img v-if="credit.avatar" :src="credit.avatar" class="credit-avatar" />
              <span class="credit-name">{{ credit.name }}</span>
              <span class="credit-tag">{{ credit.tag }}</span>
            </div>
            <p class="credit-desc">{{ credit.desc }}</p>
          </div>
        </div>
      </section>

      <!-- 开源项目使用 -->
      <section class="oss-section">
        <h2 class="section-title">开源项目使用</h2>
        <div class="oss-list">
          <div class="oss-item" v-for="lib in openSourceLibs" :key="lib.name">
            <div class="oss-left">
              <span class="oss-name">{{ lib.name }}</span>
              <span class="oss-version">{{ lib.version }}</span>
            </div>
            <a :href="lib.url" target="_blank" class="oss-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <span class="oss-license">{{ lib.license }}</span>
          </div>
        </div>
      </section>

      <!-- 版权声明 -->
      <section class="copyright-section">
        <h2 class="section-title">版权声明</h2>
        <div class="copyright-card">
          <p class="copyright-text">
            MCLA 是一个开源的非官方 Minecraft 启动器项目，仅供学习与交流使用。
          </p>
          <p class="copyright-text">
            Minecraft 相关名称、图案及商标归 Mojang Studios 与 Microsoft 所有。
            本项目与 Mojang Studios 及 Microsoft 之间不存在任何关联关系。
          </p>
          <p class="copyright-text">
            MCLA 开源项目及其官方衍生程序均循 GNU General Public License 3.0（GPLv3）协议开源。
          </p>
          <p class="copyright-text copyright-muted">
            Copyright &copy; 2024-2026 MCLA Contributors. MIT License.
          </p>
          <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" class="copyright-link">查看许可证</a>
        </div>
      </section>
    </template>

    <!-- ========== 帮助 ========== -->
    <template v-else-if="activeCat === 'help'">
      <div class="page-header">
        <h1 class="page-title">帮助</h1>
        <p class="page-subtitle">常见问题与使用指南</p>
      </div>

      <section class="faq-section">
        <div class="faq-item" v-for="faq in faqList" :key="faq.q">
          <div class="faq-q">{{ faq.q }}</div>
          <div class="faq-a">{{ faq.a }}</div>
        </div>
      </section>
    </template>

    <!-- ========== 反馈 ========== -->
    <template v-else-if="activeCat === 'feedback'">
      <div class="page-header">
        <h1 class="page-title">反馈</h1>
        <p class="page-subtitle">遇到问题或有建议？告诉我们</p>
      </div>

      <section class="feedback-section">
        <div class="feedback-card">
          <div class="feedback-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4M16 2v4M3 10h18M21 8v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <h3 class="feedback-title">问题反馈</h3>
          <p class="feedback-desc">发现 Bug 或功能缺失？前往 GitHub Issues 提交问题。</p>
          <a href="https://github.com/nnkmn/MCLA/issues" target="_blank" class="feedback-btn">前往 GitHub Issues</a>
        </div>

        <div class="feedback-card disabled">
          <div class="feedback-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>
          </div>
          <h3 class="feedback-title">功能建议</h3>
          <p class="feedback-desc">暂未开放</p>
          <button class="feedback-btn" disabled>暂未开放</button>
        </div>

        <div class="feedback-card">
          <div class="feedback-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h3 class="feedback-title">其他联系</h3>
          <p class="feedback-desc">其他问题或商务合作，可通过邮箱联系我们。</p>
          <button @click="copyEmail" class="feedback-btn">发送邮件</button>
        </div>
      </section>

      <!-- 邮箱复制提示弹窗 -->
      <PxModal
        v-model="showEmailModal"
        title="提示"
        size="sm"
      >
        <p style="color: rgba(255,255,255,0.88); font-size: 14px; margin: 0; text-align: center;">
          邮箱已复制，请前去邮箱发送邮件及内容
        </p>
        <template #footer>
          <button class="modal-btn" @click="showEmailModal = false">确定</button>
        </template>
      </PxModal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import PxModal from '@/components/common/PxModal.vue'

const moreActive = inject('moreActive') as any
const activeCat = computed(() => moreActive?.value || 'about')

const showEmailModal = ref(false)

const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText('sksadfg@163.com')
  } catch {
    // fallback
    const input = document.createElement('input')
    input.value = 'sksadfg@163.com'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
  }
  showEmailModal.value = true
}

const credits = [
  { name: '龙腾猫跃', tag: '参考项目', desc: 'PCL2 作者。MCLA 参考了其部分内容和实现思路。', avatar: '/hex-dragon-avatar.png' },
  { name: 'StarLight.Core', tag: '核心参考', desc: '星光核心。MCLA 参考了其模块化架构设计理念和部分功能实现。', avatar: '/starlight-logo.png' },
  { name: 'Mojang Studios', tag: '游戏开发', desc: 'Minecraft 游戏的创造者，提供了这个令人惊叹的沙盒世界。' },
  { name: 'Vue.js', tag: '前端框架', desc: '渐进式 JavaScript 框架，让构建现代化 Web 应用变得简单。' },
  { name: 'Anthony Fu', tag: '开源贡献', desc: 'Vue / Vite / Iconify 等众多优质开源项目的作者。' },
  { name: 'Electron', tag: '桌面框架', desc: '使用 Web 技术构建跨平台桌面应用的框架。' },
]

const openSourceLibs = [
  { name: 'Vue', version: '3.5.x', license: 'MIT', url: 'https://github.com/vuejs/core' },
  { name: 'Electron', version: '33.x', license: 'MIT', url: 'https://github.com/electron/electron' },
  { name: 'Pinia', version: '2.2.x', license: 'MIT', url: 'https://github.com/vuejs/pinia' },
  { name: 'Vue Router', version: '4.4.x', license: 'MIT', url: 'https://github.com/vuejs/router' },
  { name: 'Iconify', version: '5.x', license: 'MIT', url: 'https://github.com/iconify' },
  { name: 'Better SQLite3', version: '11.x', license: 'MIT', url: 'https://github.com/WiseLibs/better-sqlite3' },
  { name: 'Axios', version: '1.7.x', license: 'MIT', url: 'https://github.com/axios/axios' },
  { name: 'Electron Vite', version: '2.3.x', license: 'MIT', url: 'https://github.com/alex8088/electron-vite' },
  { name: 'Electron Log', version: '5.x', license: 'MIT', url: 'https://github.com/megahertz/electron-log' },
  { name: 'StarLight.Core', version: 'Latest', license: 'MIT', url: 'https://github.com/Ink-Marks/StarLight.Core' },
]

const faqList = [
  { q: '如何添加 Minecraft 账户？', a: '前往「账户」页面，点击「添加账户」，选择 Microsoft 账号登录或离线模式输入用户名即可。' },
  { q: '下载速度很慢怎么办？', a: '在「设置」→「其他」中，将下载源切换为 BMCLAPI（推荐），或调整最大下载线程数。' },
  { q: '如何安装 Mod？', a: '进入「下载」页面，选择 Mod 分类，搜索并下载所需的 Mod。下载完成后会自动安装到对应版本。' },
  { q: '启动游戏时闪退怎么办？', a: '检查是否正确配置了 Java 路径，在「设置」→「启动」中调整内存分配，或查看日志文件排查原因。' },
  { q: '如何创建游戏实例？', a: '在「实例」页面点击「新建实例」，选择游戏版本和 Mod loader，点击确认即可创建。' },
]
</script>

<style lang="scss" scoped>
.more-page {
  padding: 24px 48px 48px;
  min-height: 100%;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 28px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  padding-bottom: 16px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
  margin: 0 0 4px;
  font-family: 'Courier New', monospace;
}

.page-subtitle {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  margin: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,255,255,0.88);
  margin: 0 0 14px;
  font-family: 'Courier New', monospace;
  border-left: 3px solid var(--mcla-primary, #6366f1);
  padding-left: 10px;
}

/* ===== 关于 ===== */
.about-section {
  margin-bottom: 32px;
}

.about-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 20px;
  background: var(--mcla-surface-2, #1e1e2e);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
}

.about-author {
  padding-bottom: 16px;
}

.about-app {
  padding-top: 16px;
}

.author-row,
.app-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar,
.app-logo {
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.author-name {
  font-size: 15px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
}

.author-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  margin-top: 2px;
}

.author-info {
  flex: 1;
}

.about-divider {
  height: 1px;
  background: rgba(255,255,255,0.08);
}

.author-btn,
.app-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s;
  flex-shrink: 0;
}

.author-btn.primary {
  background: rgba(99,102,241,0.25);
  color: #a5b4fc;
  border: 1px solid rgba(99,102,241,0.35);
  &:hover { background: rgba(99,102,241,0.35); }
}

.app-btn {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.1);
  &:hover { background: rgba(255,255,255,0.1); color: #fff; }
}

.app-name {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
}

.app-version {
  font-size: 12px;
  color: rgba(99,102,241,0.9);
  margin-top: 2px;
  font-weight: 600;
}

.app-info {
  flex: 1;
}

/* ===== 画廊 ===== */
.gallery-section { margin-bottom: 32px; }

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 700px) { .gallery-grid { grid-template-columns: repeat(2, 1fr); } }

.gallery-item {
  border-radius: 8px;
  overflow: hidden;
  background: var(--mcla-surface, #f5f5f5);
  border: 1px solid var(--mcla-border, #e0e0e0);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.15); }
}

.gallery-img-wrap {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #1a1a2e;
}

.gallery-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.gallery-item:hover .gallery-img { transform: scale(1.05); }

.gallery-overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 8px 10px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  opacity: 0;
  transition: opacity 0.2s;
}
.gallery-item:hover .gallery-overlay { opacity: 1; }

.gallery-title { font-size: 12px; color: #fff; font-weight: 600; }
.gallery-desc { font-size: 11px; color: var(--mcla-text-muted, #888); margin: 0; padding: 6px 10px; text-align: center; }

/* ===== 鸣谢 ===== */
.credits-section { margin-bottom: 32px; }

.credits-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }

.credit-item {
  padding: 14px 16px;
  background: var(--mcla-surface-2, #1e1e2e);
  border: 1px solid var(--mcla-border-2, rgba(255,255,255,0.08));
  border-radius: 8px;
  transition: border-color 0.2s;
  &:hover { border-color: rgba(99,102,241,0.4); }
}

.credit-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.credit-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}
.credit-name { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.9); }
.credit-tag {
  font-size: 10px; padding: 1px 6px;
  background: rgba(99,102,241,0.25); color: #a5b4fc;
  border-radius: 4px; font-weight: 600;
}
.credit-desc { font-size: 12px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.6; }

/* ===== 开源项目 ===== */
.oss-section { margin-bottom: 32px; }

.oss-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}

.oss-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--mcla-surface-2, #1e1e2e);
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.04); }
}

.oss-left { flex: 1; display: flex; align-items: center; gap: 8px; }
.oss-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); }
.oss-version {
  font-size: 11px; color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px;
}

.oss-link { color: rgba(99,102,241,0.8); opacity: 0.8; transition: opacity 0.15s; &:hover { opacity: 1; } }
.oss-icon { width: 16px; height: 16px; }

.oss-license {
  font-size: 11px; padding: 1px 8px;
  background: rgba(99,102,241,0.12); border-radius: 4px;
  color: #a5b4fc; font-weight: 600;
  min-width: 42px; text-align: center;
}

/* ===== 版权 ===== */
.copyright-section { margin-bottom: 60px; }

.copyright-card {
  padding: 20px 24px;
  background: rgba(99,102,241,0.06);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 10px;
}

.copyright-text {
  font-size: 12px; color: rgba(255,255,255,0.45);
  line-height: 1.8; margin: 0 0 10px;
  &:last-child { margin-bottom: 0; }
}
.copyright-muted { color: rgba(255,255,255,0.3); font-size: 11px; }

.copyright-link {
  display: inline-block;
  margin-top: 10px;
  color: #818cf8;
  font-size: 13px;
  text-decoration: none;
  &:hover { color: #a5b4fc; text-decoration: underline; }
}

/* ===== 帮助 ===== */
.faq-section { display: flex; flex-direction: column; gap: 12px; }

.faq-item {
  padding: 16px 20px;
  background: var(--mcla-surface-2, #1e1e2e);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
}

.faq-q {
  font-size: 14px; font-weight: 600;
  color: rgba(255,255,255,0.9);
  margin-bottom: 8px;
}

.faq-a {
  font-size: 13px; color: rgba(255,255,255,0.5);
  line-height: 1.7;
}

/* ===== 反馈 ===== */
.feedback-section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

@media (max-width: 700px) { .feedback-section { grid-template-columns: 1fr; } }

.feedback-card {
  padding: 24px 20px;
  background: var(--mcla-surface-2, #1e1e2e);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: rgba(99,102,241,0.4);
    box-shadow: 0 4px 16px rgba(99,102,241,0.08);
  }
}

.feedback-icon {
  width: 44px; height: 44px;
  background: rgba(99,102,241,0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feedback-icon svg { color: #818cf8; }

.feedback-title {
  font-size: 15px; font-weight: 700;
  color: rgba(255,255,255,0.9);
  margin: 0;
}

.feedback-desc {
  font-size: 12px; color: rgba(255,255,255,0.45);
  line-height: 1.7; margin: 0;
}

.feedback-btn {
  display: inline-block;
  padding: 7px 18px;
  background: rgba(99,102,241,0.2);
  color: #a5b4fc;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid rgba(99,102,241,0.3);
  transition: background 0.2s, transform 0.15s;

  &:hover { background: rgba(99,102,241,0.3); transform: translateY(-1px); }
}

.modal-btn {
  padding: 8px 24px;
  background: rgba(99,102,241,0.25);
  color: #a5b4fc;
  border: 1px solid rgba(99,102,241,0.35);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(99,102,241,0.35);
  }
}
</style>
