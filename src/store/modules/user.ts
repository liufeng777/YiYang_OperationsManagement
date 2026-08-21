import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useNavigationStore } from './navigation'

/** 用户信息 */
export interface UserInfo {
  id: number | string
  username: string
  nickname: string
  avatar?: string
  roles: string[]
}

interface UserState {
  token: string
  userInfo: UserInfo | null
  setToken: (token: string) => void
  setUserInfo: (userInfo: UserInfo) => void
  /** 登录（当前为 mock 实现，接入真实后端后替换为调用登录接口） */
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
        // TODO: 接入真实登录接口后替换为：
        // const res = await authApi.login(params)
        // set({ token: res.token, userInfo: res.userInfo })
        void params
        set({
          token: `mock-token-${Date.now()}`,
          userInfo: {
            id: 1,
            username: params.username,
            nickname: params.username,
            roles: ['admin'],
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
