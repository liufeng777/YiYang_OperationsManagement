import { create } from 'zustand'

/**
 * 导航记忆：记录各一级导航下最近访问的完整路径（含查询参数）
 * 用于侧边栏点击一级导航时恢复上次浏览位置（如机构管理 -> 机构详情）
 *
 * 仅存内存（不做 persist）：刷新 / 重启项目后清空，
 * 避免「重启后点订单中心直接落到上次的详情页」这类问题；登出时由 user store 的 logout 清空
 */
interface NavigationState {
  /** key 为一级导航路径（如 /institution），value 为完整路径（含 search） */
  lastVisited: Record<string, string>
  remember: (section: string, fullPath: string) => void
  clearLastVisited: () => void
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  lastVisited: {},
  remember: (section, fullPath) =>
    set((state) =>
      state.lastVisited[section] === fullPath
        ? state
        : { lastVisited: { ...state.lastVisited, [section]: fullPath } },
    ),
  clearLastVisited: () => set({ lastVisited: {} }),
}))
