import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

export interface InstitutionItem {
  id: number
  name: string
  contactName: string
  contactPhone: string
  status: number // 0 待审核 1 已通过 2 已驳回
  createdAt: string
}

export interface InstitutionDetail extends InstitutionItem {
  address: string
  description: string
  businessLicenseUrl: string
}

/** 机构分页列表 */
export function getInstitutionList(params: PageParams) {
  return http.get<PageResult<InstitutionItem>>('/institution/list', { ...params })
}

/** 机构详情 */
export function getInstitutionDetail(id: number) {
  return http.get<InstitutionDetail>(`/institution/${id}`)
}

/** 机构审核 */
export function auditInstitution(id: number, approved: boolean, remark?: string) {
  return http.post<null>(`/institution/${id}/audit`, { approved, remark })
}

/** 机构上下架 */
export function toggleInstitution(id: number, enabled: boolean) {
  return http.post<null>(`/institution/${id}/toggle`, { enabled })
}
