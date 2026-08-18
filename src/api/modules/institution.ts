import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

/** 同步状态：synced=已同步 updating=更新中 */
export type SyncStatus = 'synced' | 'updating'

/** 经营状态：normal=正常经营 pending=资料待完善 paused=暂停经营 */
export type OperationStatus = 'normal' | 'pending' | 'paused'

/** 机构列表项 */
export interface InstitutionItem {
  id: string
  /** 机构编码：JG0001 */
  code: string
  name: string
  /** 机构类型：健康驿站 / 护理院 */
  type: string
  /** 机构来源 */
  source: string
  /** 所在区域：拱墅区 */
  region: string
  /** 所在街道：申花街道 */
  street: string
  /** 详细地址 */
  address: string
  contactPhone: string
  /** 已配服务数 */
  serviceCount: number
  /** 商品数 */
  productCount: number
  /** 服务数 */
  serviceTotal: number
  syncStatus: SyncStatus
  operationStatus: OperationStatus
}

/** 机构已添加服务 */
export interface InstitutionService {
  id: string
  /** 服务编码：FW0001 */
  code: string
  name: string
  category: string
  /** 服务方式：上门 / 到店 */
  mode: '上门' | '到店'
  /** 集团定价（元/次） */
  price: number
  /** 配置来源 */
  configSource: '机构默认' | '单项调整'
  /** 线上履约范围 */
  range: string
  status: '可预约' | '已下架'
}

/** 集团服务池项目 */
export interface ServicePoolItem {
  id: string
  code: string
  name: string
  category: string
  mode: '上门' | '到店'
  price: number
}

/** 患者端介绍 */
export interface InstitutionIntro {
  displayTitle: string
  description: string
  tags: string[]
  visible: boolean
  coverUrl?: string
  photos: string[]
}

/** 机构详情 */
export interface InstitutionDetail extends InstitutionItem {
  lastSyncTime: string
  onlineRange: string
  intro: InstitutionIntro
}

/** 机构分页列表 */
export function getInstitutionList(params: PageParams) {
  return http.get<PageResult<InstitutionItem>>('/institution/list', { ...params })
}

/** 机构详情 */
export function getInstitutionDetail(id: string) {
  return http.get<InstitutionDetail>(`/institution/${id}`)
}

/** 机构已添加服务 */
export function getInstitutionServices(id: string) {
  return http.get<InstitutionService[]>(`/institution/${id}/services`)
}

/** 集团服务池 */
export function getServicePool(params?: { keyword?: string; category?: string }) {
  return http.get<ServicePoolItem[]>('/institution/service-pool', { ...params })
}

/** 添加机构服务 */
export function addInstitutionServices(id: string, serviceIds: string[]) {
  return http.post<null>(`/institution/${id}/services`, { serviceIds })
}

/** 删除机构服务 */
export function removeInstitutionService(id: string, serviceId: string) {
  return http.delete<null>(`/institution/${id}/services/${serviceId}`)
}

/** 保存患者端介绍 */
export function saveInstitutionIntro(id: string, intro: InstitutionIntro) {
  return http.post<null>(`/institution/${id}/intro`, intro)
}

/** 同步机构 */
export function syncInstitutions() {
  return http.post<null>('/institution/sync')
}

/** 机构审核（预留） */
export function auditInstitution(id: string, approved: boolean, remark?: string) {
  return http.post<null>(`/institution/${id}/audit`, { approved, remark })
}

/** 机构上下架（预留） */
export function toggleInstitution(id: string, enabled: boolean) {
  return http.post<null>(`/institution/${id}/toggle`, { enabled })
}
