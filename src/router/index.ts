import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/HomePage.vue'),
      meta: { title: '启动' },
    },
    {
      path: '/instances',
      name: 'instances',
      component: () => import('../pages/InstancesPage.vue'),
      meta: { title: '实例' },
    },
    {
      path: '/downloads',
      name: 'downloads',
      component: () => import('../pages/DownloadsPage.vue'),
      meta: { title: '下载' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('../pages/AccountPage.vue'),
      meta: { title: '账户管理' },
    },
    {
      path: '/versions',
      name: 'versions',
      component: () => import('../pages/VersionsPage.vue'),
      meta: { title: '版本管理' },
    },
    {
      path: '/instance/:id',
      name: 'instance-detail',
      component: () => import('../pages/InstanceDetail.vue'),
      meta: { title: '实例详情' },
    },
    {
      path: '/launch',
      name: 'launch',
      component: () => import('../pages/LaunchPage.vue'),
      meta: { title: '启动' },
    },
    {
      path: '/more',
      name: 'more',
      component: () => import('../pages/MorePage.vue'),
      meta: { title: '更多' },
    },
  ],
})

// 路由守卫：更新窗口标题
router.beforeEach((to) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - MCLA`
  }
})

export default router
