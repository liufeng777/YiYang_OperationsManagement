import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  /** 侧边栏是否折叠 */
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    {
      name: 'yiyang_app',
    },
  ),
)
