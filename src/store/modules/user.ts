import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/api'
import { useNavigationStore } from './navigation'

/** 用户信息（登录出参 admin 映射而来） */
export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
  phone?: string | null
  email?: string | null
  roles: string[]
  /** 权限码数组，如 ["order:view","order:manage"] */
  permissions: string[]
}

interface UserState {
  token: string
  userInfo: UserInfo | null
  setToken: (token: string) => void
  setUserInfo: (userInfo: UserInfo) => void
  /** 登录：调用 POST /api/admin/auth/login */
  login: (params: { username: string; password: string }) => Promise<void>
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: '',
      userInfo: null,
      setToken: (token) => set({ token }),
      setUserInfo: (userInfo) => set({ userInfo }),
      login: async (params) => {
        const res = await authApi.login(params)
        const { admin } = res
        set({
          token: res.token,
          userInfo: {
            id: admin.id,
            username: admin.username,
            nickname: admin.nickname,
            avatar: admin.avatar_url ?? undefined,
            phone: admin.phone ?? null,
            email: admin.email ?? null,
            roles: admin.roles ?? [],
            // 登录出参可能不返回权限码，兜底为空数组（菜单暂不依赖权限过滤）
            permissions: admin.permissions ?? [],
          },
        })
      },
      logout: () => {
        set({ token: '', userInfo: null })
        // 登出时清空各一级导航的浏览位置记忆
        useNavigationStore.getState().clearLastVisited()
      },
    }),
    {
      name: 'yiyang_user',
    },
  ),
)
