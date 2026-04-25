/**
 * Accounts Store - 账户管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Account } from '../types/account'

export const useAccountsStore = defineStore('accounts', () => {
  // ====== 状态 ======
  const accounts = ref<Account[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ====== 计算属性 ======

  /** 当前活跃账户 */
  const activeAccount = computed(() =>
    accounts.value.find(a => a.isActive === 1) ?? null
  )

  /** 是否已登录 */
  const isLoggedIn = computed(() => activeAccount.value !== null)

  /** 显示名称 */
  const displayName = computed(() => {
    if (!activeAccount.value) return ''
    return activeAccount.value.name || '未知用户'
  })

  // ====== 操作 ======

  /** 加载账户列表 */
  async function fetchAccounts() {
    loading.value = true
    error.value = null
    try {
      const rawList = await window.electronAPI?.account.list()
      accounts.value = (rawList || []).map(mapRawToAccount)
    } catch (e: any) {
      error.value = e.message || '加载账户失败'
    } finally {
      loading.value = false
    }
  }

  /** 微软 OAuth 登录（通过 AccountPage 弹窗完成，此处仅作兜底） */
  async function loginMicrosoft() {
    try {
      const result = await window.electronAPI?.account.loginMicrosoft()
      if (result?.ok) {
        await fetchAccounts()
        return true
      }
      if (result?.error === 'LOGIN_CANCELLED') return false
      error.value = result?.error || '微软登录失败'
      return false
    } catch (e: any) {
      error.value = e.message || '微软登录失败'
      return false
    }
  }

  /** 离线登录（创建离线账户） */
  async function loginOffline(username: string) {
    try {
      const result = await window.electronAPI?.account.loginOffline(username)
      if (result?.ok) {
        await fetchAccounts()
        return true
      }
      error.value = result?.error || '离线登录失败'
      return false
    } catch (e: any) {
      error.value = e.message || '离线登录失败'
      return false
    }
  }

  /** 切换活跃账户 */
  async function setActive(id: string) {
    await window.electronAPI?.account.setActive(id)
    await fetchAccounts()
  }

  /** 删除账户 */
  async function deleteAccount(id: string) {
    await window.electronAPI?.account.delete(id)
    accounts.value = accounts.value.filter(a => a.id !== id)
  }

  return {
    accounts,
    loading,
    error,
    activeAccount,
    isLoggedIn,
    displayName,
    fetchAccounts,
    loginMicrosoft,
    loginOffline,
    setActive,
    deleteAccount,
  }
})

// snake_case -> camelCase 映射
function mapRawToAccount(raw: any): Account {
  return {
    id: raw.id,
    type: raw.type,
    name: raw.name,
    uuid: raw.uuid,
    accessToken: raw.access_token ?? null,
    refreshToken: raw.refresh_token ?? null,
    expiresAt: raw.expires_at ?? null,
    isActive: raw.is_active,
    skin_url: raw.skin_url ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}
