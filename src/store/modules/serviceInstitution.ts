/**
 * 机构服务上下架页 - 上次选中的机构（按机构记忆）
 * - 持久化到 localStorage（key: yiyang_service_institution）
 * - 用于从 sidebar 切走再回到「机构服务上下架」时仍定位到上次操作的机构
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ServiceInstitutionState {
  /** 上次选中的机构 id（useServiceInstitutionPage 的机构 mock id，如 'i1'） */
  selectedServiceInstitutionId?: string
  setSelectedServiceInstitutionId: (id: string) => void
}

export const useServiceInstitutionStore = create<ServiceInstitutionState>()(
  persist(
    (set) => ({
      selectedServiceInstitutionId: undefined,
      setSelectedServiceInstitutionId: (id) => set({ selectedServiceInstitutionId: id }),
    }),
    {
      name: 'yiyang_service_institution',
    },
  ),
)
