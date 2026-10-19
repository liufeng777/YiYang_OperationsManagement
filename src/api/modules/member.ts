/**
 * 会员管理（运营后台端-API设计 §4）
 * - §4.1 会员档案 member:view / member:manage
 * - §4.3 会员 Excel 导入
 * - §4.4 标签字典 member:tag-manage
 * - §4.5 会员等级配置（预留） member:level-config
 * - §4.6 用户账号 users（user:view / user:manage）
 * - §4.7 用户绑定会员 user:binding
 */
import type { AxiosResponse } from 'axios'
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* §4.1 会员档案（权限 member:view / member:manage）                     */
/* ------------------------------------------------------------------ */
/** 会员标签片段 */
export interface MemberTagBrief {
  id: number
  tag_name: string
  tag_type: number
}

/** 会员 DTO */
export interface MemberDTO {
  id: number
  name: string
  /** 1-男 2-女 */
  gender: 1 | 2
  /** yyyy-MM-dd */
  birthday: string
  /** 脱敏证件号 */
  id_card: string
  /** 脱敏手机号 */
  phone: string
  institution_id: number | null
  level_id: number
  level: string
  level_code: string
  tags: MemberTagBrief[]
  status: number // 1-未实名 2-已实名 9-禁用
}

/** 会员列表 GET /api/admin/members（swagger：page / page_size / keyword / institution_id / level_id / status） */
export function getMembers(
  params?: ApiPageParams & {
    institution_id?: number
    /** 会员等级 ID */
    level_id?: number
    /** 状态 1-未实名 2-已实名 9-禁用 */
    status?: number
  },
) {
  return http.get<ApiPageResult<MemberDTO>>('/admin/members', { ...params })
}

/** 会员详情 GET /api/admin/members/:id（含地址、标签、关系、风险等级） */
export function getMember(id: number) {
  return http.get<MemberDTO>(`/admin/members/${id}`)
}

/** 会员新增 / 编辑入参（swagger admin.ReqCreateMember：institution_id / name / phone 必填） */
export interface MemberSaveBody {
  institution_id: number
  name: string
  phone: string
  /** 出生日期 yyyy-MM-dd */
  birthday?: string
  emergency_contact?: string
  emergency_phone?: string
  /** 性别 1-男 2-女 */
  gender?: 1 | 2
  id_card?: string
  /** 会员等级 ID */
  level_id?: number
  /** 会员标签 ID 数组 */
  tag_ids?: number[]
}

/** 新增会员 POST /api/admin/members */
export function createMember(data: MemberSaveBody) {
  return http.post<null>('/admin/members', data)
}

/** 编辑会员 PUT /api/admin/members/:id */
export function updateMember(id: number, data: MemberSaveBody) {
  return http.put<null>(`/admin/members/${id}`, data)
}

/** 删除会员 DELETE /api/admin/members/:id（swagger：remark 为 query 选填） */
export function deleteMember(id: number, remark?: string) {
  return http.delete<null>(`/admin/members/${id}`, { remark })
}

/** 会员标签打标 POST /api/admin/members/:id/tags（swagger admin.ReqSetMemberTags） */
export function addMemberTags(id: number, tagIds: number[], note?: string) {
  return http.post<null>(`/admin/members/${id}/tags`, { tag_ids: tagIds, note })
}

/** 会员标签解除 DELETE /api/admin/members/:id/tags/:tagId（swagger：remark 为 query 选填） */
export function removeMemberTag(id: number, tagId: number, remark?: string) {
  return http.delete<null>(`/admin/members/${id}/tags/${tagId}`, { remark })
}

/** 会员批量打标签 POST /api/admin/members/batch-tags（swagger admin.ReqBatchMemberTags：单标签 tag_id） */
export function batchAddMemberTags(memberIds: number[], tagId: number, note?: string) {
  return http.post<BatchResult>('/admin/members/batch-tags', {
    member_ids: memberIds,
    tag_id: tagId,
    note,
  })
}

/** 会员批量解除标签 POST /api/admin/members/batch-untag（swagger admin.ReqRemoveMemberTagBatch：单标签 tag_id） */
export function batchRemoveMemberTags(memberIds: number[], tagId: number) {
  return http.post<BatchResult>('/admin/members/batch-untag', {
    member_ids: memberIds,
    tag_id: tagId,
  })
}

/** 会员启用/禁用 POST /api/admin/members/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateMemberStatus(id: number, status: number, remark?: string) {
  return http.post<null>(`/admin/members/${id}/status`, { status }, { params: { remark } })
}

/** 会员批量启用/禁用 POST /api/admin/members/batch-status（swagger：body {ids,status}，remark 为 query 选填） */
export function batchUpdateMemberStatus(ids: number[], status: CommonStatus, remark?: string) {
  return http.post<BatchResult>('/admin/members/batch-status', { ids, status }, { params: { remark } })
}

/* ------------------------------------------------------------------ */
/* §4.3 会员 Excel 导入                                                 */
/* ------------------------------------------------------------------ */

/** 导入结果 */
export interface ImportResult {
  success_count: number
  fail_count: number
  fail_list: Array<{ row: number; reason: string }>
}

/** 模板下载 GET /api/admin/members/import-template（responseType=blob 时拦截器返回完整 AxiosResponse） */
export function getMemberImportTemplate(): Promise<AxiosResponse<Blob>> {
  return http.get<AxiosResponse<Blob>>('/admin/members/import-template', undefined, { responseType: 'blob' })
}

/** Excel 导入 POST /api/admin/members/import（multipart/form-data） */
export function importMembers(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<ImportResult>('/admin/members/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/* ------------------------------------------------------------------ */
/* §4.4 标签字典管理（权限 member:tag-manage）                           */
/* ------------------------------------------------------------------ */

/** 标签字典 DTO */
export interface TagDictDTO {
  id: number
  institution_id: number | null
  /** 标签类型：1-会员经营标签 2-自定义标签（风险标签由医护端维护） */
  tag_type: number
  tag_name: string
  tag_color?: string
  sort_order: number
  status: CommonStatus
}

/** 标签字典新增 / 编辑入参（swagger admin.ReqCreateTagDict：tag_name / tag_type 必填） */
export interface TagDictSaveBody {
  tag_name: string
  tag_type: number
  /** 机构 ID（0 为全局） */
  institution_id?: number
  tag_color?: string
  sort_order?: number
  status?: CommonStatus
}

/** 标签列表 GET /api/admin/tag-dicts（swagger：page / page_size / institution_id / tag_type） */
export function getTagDicts(params?: ApiPageParams & { institution_id?: number; tag_type?: number }) {
  return http.get<ApiPageResult<TagDictDTO>>('/admin/tag-dicts', { ...params })
}

/** 新增标签 POST /api/admin/tag-dicts */
export function createTagDict(data: TagDictSaveBody) {
  return http.post<null>('/admin/tag-dicts', data)
}

/** 编辑标签 PUT /api/admin/tag-dicts/:id */
export function updateTagDict(id: number, data: Partial<TagDictSaveBody>) {
  return http.put<null>(`/admin/tag-dicts/${id}`, data)
}

/** 启停标签 POST /api/admin/tag-dicts/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateTagDictStatus(id: number, status: CommonStatus, remark?: string) {
  return http.post<null>(`/admin/tag-dicts/${id}/status`, { status }, { params: { remark } })
}

/** 删除标签 DELETE /api/admin/tag-dicts/:id（swagger：remark 为 query 选填） */
export function deleteTagDict(id: number, remark?: string) {
  return http.delete<null>(`/admin/tag-dicts/${id}`, { remark })
}

/* ------------------------------------------------------------------ */
/* §4.5 会员等级配置（预留，权限 member:level-config）                    */
/* ------------------------------------------------------------------ */

/** 会员等级 DTO（积分/折扣字段属二期，一期不体现） */
export interface MemberLevelDTO {
  id: number
  level_name: string
  level_code: string
  benefits: unknown[]
  status: CommonStatus
}

/** 会员等级新增 / 编辑入参（swagger admin.ReqCreateMemberLevel：level_code / level_name 必填） */
export interface MemberLevelSaveBody {
  level_code: string
  level_name: string
  /** 权益列表 */
  benefits?: unknown[]
  /** 折扣率（二期） */
  discount_rate?: number
  /** 升级所需积分（二期） */
  min_points?: number
  status?: CommonStatus
}

/** 等级列表 GET /api/admin/member-levels */
export function getMemberLevels() {
  return http.get<MemberLevelDTO[]>('/admin/member-levels')
}

/** 新增等级 POST /api/admin/member-levels */
export function createMemberLevel(data: MemberLevelSaveBody) {
  return http.post<null>('/admin/member-levels', data)
}

/** 编辑等级 PUT /api/admin/member-levels/:id */
export function updateMemberLevel(id: number, data: Partial<MemberLevelSaveBody>) {
  return http.put<null>(`/admin/member-levels/${id}`, data)
}

/** 启用/停用等级 POST /api/admin/member-levels/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateMemberLevelStatus(id: number, status: CommonStatus, remark?: string) {
  return http.post<null>(`/admin/member-levels/${id}/status`, { status }, { params: { remark } })
}

/* ------------------------------------------------------------------ */
/* 会员绑定医护人员 member-staff-relations（swagger：会员管理-健管师绑定） */
/* ------------------------------------------------------------------ */

/** 会员绑定医护人员入参（swagger admin.ReqMemberStaffRelation） */
export interface MemberStaffRelationSaveBody {
  /** 会员 ID，必填 */
  member_id: number
  /** 医护人员（健管师）ID，必填 */
  staff_id: number
  /** 绑定来源：1-用户指定 2-医护人员指定 3-运营人员指定，默认 1 */
  bind_type?: 1 | 2 | 3
  /** 绑定时间（UTC 秒），0=当前时间 */
  bound_at?: number
  /** 绑定/解绑备注 */
  comment?: string
  /** 医护岗位编码（Doctor/HealthMgr/Caregiver 等） */
  staff_position_code?: string
}

/** 会员绑定医护人员记录 */
export interface MemberStaffRelationDTO extends MemberStaffRelationSaveBody {
  id: number
  member_name?: string
  staff_name?: string
  /** 解绑时间（UTC 秒），0/空=未解绑 */
  unbound_at?: number
}

/** 绑定列表 GET /api/admin/member-staff-relations
 *  swagger：page / page_size / member_id / staff_id / staff_position_code / active_only(1-只看未解绑) */
export function getMemberStaffRelations(
  params?: ApiPageParams & {
    member_id?: number
    staff_id?: number
    staff_position_code?: string
    active_only?: 0 | 1
  },
) {
  return http.get<ApiPageResult<MemberStaffRelationDTO>>('/admin/member-staff-relations', { ...params })
}

/** 新增绑定 POST /api/admin/member-staff-relations */
export function createMemberStaffRelation(data: MemberStaffRelationSaveBody) {
  return http.post<null>('/admin/member-staff-relations', data)
}

/** 绑定详情 GET /api/admin/member-staff-relations/:id */
export function getMemberStaffRelation(id: number) {
  return http.get<MemberStaffRelationDTO>(`/admin/member-staff-relations/${id}`)
}

/** 更新绑定 PUT /api/admin/member-staff-relations/:id */
export function updateMemberStaffRelation(id: number, data: MemberStaffRelationSaveBody) {
  return http.put<null>(`/admin/member-staff-relations/${id}`, data)
}

/** 解除绑定 DELETE /api/admin/member-staff-relations/:id（swagger：remark 为 query 选填） */
export function deleteMemberStaffRelation(id: number, remark?: string) {
  return http.delete<null>(`/admin/member-staff-relations/${id}`, { remark })
}

/* ------------------------------------------------------------------ */
/* §4.6 注册用户 users（权限 user:view / user:manage）                   */
/* ------------------------------------------------------------------ */

/** 用户绑定会员片段 */
export interface BindMemberBrief {
  age: number
  gender: number
  /** 健康会员接入状态文案 */
  health_access_status: string
  member_id: number
  name: string
  phone: string
  /** 关系 1-子女 2-配偶 3-兄弟姐妹 4-其他 */
  relation: number
  relation_text: string
}

/** 订单记录片段 */
export interface OrderRecordBrief {
  created_at: number
  /** 优惠金额（元，字符串） */
  discount_amount: string
  id: number
  institution_name: string
  /** 是否使用耗材 0 | 1 */
  is_use_consumables: number
  member_id: number
  member_name: string
  order_no: string
  /** 订单状态 1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款 */
  order_status: number
  /** 实付金额（元，字符串） */
  paid_amount: string
  paid_at: number
  /** 服务次数 */
  service_count: number
  service_name: string
  /** 订单总金额（元，字符串） */
  total_amount: string
}

/** 用户 DTO（GET /admin/users 列表 / 详情实测返回） */
export interface UserDTO {
  id: number
  openid: string
  avatar: string | null
  created_at: number
  /** 邀请人姓名 */
  inviter_name?: string | null
  nickname: string
  /** 实付金额（元，字符串） */
  paid_amount: string
  phone: string
  referral_code: string
  /** 注册来源文案（筛选时按 register_source 1-员工邀请 2-会员邀请 3-客服邀请 4-无邀请归因 下推） */
  register_source: string
  /** 1-正常 9-禁用 */
  status: number
  /** 有效订单数 */
  valid_order_count: number
  /** 绑定会员列表（本人关联家属） */
  bound_members: BindMemberBrief[]
  /** 订单记录（详情返回） */
  order_records: OrderRecordBrief[]
}

/**
 * 用户列表 GET /api/admin/users（swagger：会员管理-注册用户）
 * 参数：page / page_size / keyword（昵称或手机号模糊）/ nickname / phone / wx_openid / status
 *      / register_source（1-员工邀请 2-会员邀请 3-客服邀请 4-无邀请归因）
 *      / has_order（0-无有效订单 1-有有效订单，传 0 需显式传 has_order=0）
 */
export function getUsers(
  params?: ApiPageParams & {
    keyword?: string
    nickname?: string
    phone?: string
    wx_openid?: string
    status?: 1 | 9
    register_source?: number
    has_order?: number
  },
) {
  return http.get<ApiPageResult<UserDTO>>('/admin/users', { ...params })
}

/** 用户详情 GET /api/admin/users/:id（含绑定会员 bound_members 与订单记录 order_records） */
export function getUser(id: number) {
  return http.get<UserDTO>(`/admin/users/${id}`)
}

/** 用户启用/禁用 POST /api/admin/users/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateUserStatus(id: number, status: 1 | 9, remark?: string) {
  return http.post<null>(`/admin/users/${id}/status`, { status }, { params: { remark } })
}
