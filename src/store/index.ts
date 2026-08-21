/**
 * 全局状态管理（zustand）统一出口
 * 新增 store 模块时在 store/modules 下创建，并在下方导出
 */
export { useUserStore } from './modules/user'
export type { UserInfo } from './modules/user'
export { useAppStore } from './modules/app'
export { useNavigationStore } from './modules/navigation'
