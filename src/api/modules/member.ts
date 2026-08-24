/**
 * 会员管理（运营后台端-API设计 §4）
 * - §4.1 会员档案 member:view / member:manage
 * - §4.3 会员 Excel 导入
 * - §4.4 标签字典 member:tag-manage
 * - §4.5 会员等级配置（预留） member:level-config
 * - §4.6 用户账号 users（user:view / user:manage）
 * - §4.7 用户绑定会员 user:binding
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* §4.1 会员档案（权限 member:view / member:manage）                     */
/* ------------------------------------------------------------------ */

/** 会员状态：1-未实名 2-已实名 9-禁用 */
export type MemberStatus = 1 | 2 | 9

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
  nursing_home_id: number | null
  station_id: number | null
  level_id: number
  level_name: string
  level_code: string
  tags: MemberTagBrief[]
  status: MemberStatus
  created_at: number
}

/** 会员列表 GET /api/admin/members（按名称/手机/机构/标签/风险等级筛选） */
export function getMembers(
  params?: ApiPageParams & {
    phone?: string
    institution_id?: number
    tag_id?: number
    risk_level?: number
    status?: MemberStatus
  },
) {
  return http.get<ApiPageResult<MemberDTO>>('/admin/members', { ...params })
}

/** 会员详情 GET /api/admin/members/:id（含地址、标签、关系、风险等级） */
export function getMember(id: number) {
  return http.get<MemberDTO>(`/admin/members/${id}`)
}

/** 新增会员 POST /api/admin/members */
export function createMember(data: Partial<MemberDTO>) {
  return http.post<null>('/admin/members', data)
}

/** 编辑会员 PUT /api/admin/members/:id */
export function updateMember(id: number, data: Partial<MemberDTO>) {
  return http.put<null>(`/admin/members/${id}`, data)
}

/** 会员标签打标 POST /api/admin/members/:id/tags（仅会员经营标签） */
export function addMemberTags(id: number, tagIds: number[], note?: string) {
  return http.post<null>(`/admin/members/${id}/tags`, { tag_ids: tagIds, note })
}

/** 会员标签解除 DELETE /api/admin/members/:id/tags/:tagId */
export function removeMemberTag(id: number, tagId: number) {
  return http.delete<null>(`/admin/members/${id}/tags/${tagId}`)
}

/** 会员批量打标签 POST /api/admin/members/batch-tags */
export function batchAddMemberTags(memberIds: number[], tagIds: number[], note?: string) {
  return http.post<BatchResult>('/admin/members/batch-tags', {
    member_ids: memberIds,
    tag_ids: tagIds,
    note,
  })
}

/** 会员批量解除标签 POST /api/admin/members/batch-untag */
export function batchRemoveMemberTags(memberIds: number[], tagIds: number[]) {
  return http.post<BatchResult>('/admin/members/batch-untag', {
    member_ids: memberIds,
    tag_ids: tagIds,
  })
}

/** 会员禁用 POST /api/admin/members/:id/status */
export function updateMemberStatus(id: number, status: MemberStatus) {
  return http.post<null>(`/admin/members/${id}/status`, { status })
}

/** 会员批量启用/禁用 POST /api/admin/members/batch-status */
export function batchUpdateMemberStatus(ids: number[], status: CommonStatus) {
  return http.post<BatchResult>('/admin/members/batch-status', { ids, status })
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

/** 模板下载 GET /api/admin/members/import-template */
export function getMemberImportTemplate() {
  return http.get<Blob>('/admin/members/import-template', undefined, { responseType: 'blob' })
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

/** 标签列表 GET /api/admin/tag-dicts（按机构/类型过滤） */
export function getTagDicts(params?: { institution_id?: number; tag_type?: number }) {
  return http.get<TagDictDTO[]>('/admin/tag-dicts', { ...params })
}

/** 新增标签 POST /api/admin/tag-dicts */
export function createTagDict(data: Omit<TagDictDTO, 'id'>) {
  return http.post<null>('/admin/tag-dicts', data)
}

/** 编辑标签 PUT /api/admin/tag-dicts/:id */
export function updateTagDict(id: number, data: Partial<Omit<TagDictDTO, 'id'>>) {
  return http.put<null>(`/admin/tag-dicts/${id}`, data)
}

/** 启停标签 POST /api/admin/tag-dicts/:id/status */
export function updateTagDictStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/tag-dicts/${id}/status`, { status })
}

/** 删除标签 DELETE /api/admin/tag-dicts/:id */
export function deleteTagDict(id: number) {
  return http.delete<null>(`/admin/tag-dicts/${id}`)
}

/* ------------------------------------------------------------------ */
/* §4.5 会员等级配置（预留，权限 member:level-config）                    */
/* ------------------------------------------------------------------ */

/** 会员等级 DTO（积分字段属二期，一期不体现） */
export interface MemberLevelDTO {
  id: number
  level_name: string
  level_code: string
  benefits: unknown[]
  status: CommonStatus
}

/** 等级列表 GET /api/admin/member-levels */
export function getMemberLevels() {
  return http.get<MemberLevelDTO[]>('/admin/member-levels')
}

/** 新增等级 POST /api/admin/member-levels */
export function createMemberLevel(data: Omit<MemberLevelDTO, 'id'>) {
  return http.post<null>('/admin/member-levels', data)
}

/** 编辑等级 PUT /api/admin/member-levels/:id */
export function updateMemberLevel(id: number, data: Partial<Omit<MemberLevelDTO, 'id'>>) {
  return http.put<null>(`/admin/member-levels/${id}`, data)
}

/** 启用/停用等级 POST /api/admin/member-levels/:id/status */
export function updateMemberLevelStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/member-levels/${id}/status`, { status })
}

/* ------------------------------------------------------------------ */
/* §4.6 用户账号 users（权限 user:view / user:manage）                   */
/* ------------------------------------------------------------------ */

/** 用户绑定会员片段 */
export interface BindMemberBrief {
  relation_id: number
  member_id: number
  member_name: string
  member_phone: string
  /** 1-子女 2-配偶 3-兄弟姐妹 4-其他 */
  relation: 1 | 2 | 3 | 4
  relation_name: string
  /** 1-默认 0-非默认 */
  is_default: 0 | 1
}

/** 用户 DTO */
export interface UserDTO {
  id: number
  wx_openid: string
  wx_unionid: string | null
  app_openid: string | null
  nickname: string
  avatar_url: string | null
  /** 脱敏手机号 */
  phone: string
  /** 1-正常 2-禁用 */
  status: 1 | 2
  last_login_at: number | null
  login_ip: string | null
  bind_members: BindMemberBrief[]
  created_at: number
}

/** 用户列表 GET /api/admin/users（按昵称/手机号/OpenID/状态） */
export function getUsers(
  params?: ApiPageParams & { nickname?: string; phone?: string; wx_openid?: string; status?: 1 | 2 },
) {
  return http.get<ApiPageResult<UserDTO>>('/admin/users', { ...params })
}

/** 用户详情 GET /api/admin/users/:id（含绑定会员列表） */
export function getUser(id: number) {
  return http.get<UserDTO>(`/admin/users/${id}`)
}

/** 用户启用/禁用 POST /api/admin/users/:id/status */
export function updateUserStatus(id: number, status: 1 | 2) {
  return http.post<null>(`/admin/users/${id}/status`, { status })
}

/* ------------------------------------------------------------------ */
/* §4.7 用户绑定会员管理（权限 user:binding）                            */
/* ------------------------------------------------------------------ */

/** 绑定列表 GET /api/admin/users/:id/bindings */
export function getUserBindings(userId: number) {
  return http.get<BindMemberBrief[]>(`/admin/users/${userId}/bindings`)
}

/** 用户绑定会员 POST /api/admin/users/:id/bindings */
export function bindMember(
  userId: number,
  data: { member_id: number; relation: 1 | 2 | 3 | 4; is_default: 0 | 1 },
) {
  return http.post<null>(`/admin/users/${userId}/bindings`, data)
}

/** 调整关系/设置默认 PUT /api/admin/bindings/:relationId */
export function updateBinding(
  relationId: number,
  data: { relation?: 1 | 2 | 3 | 4; is_default?: 0 | 1 },
) {
  return http.put<null>(`/admin/bindings/${relationId}`, data)
}

/** 解绑 DELETE /api/admin/users/:id/bindings/:relationId */
export function unbindMember(userId: number, relationId: number) {
  return http.delete<null>(`/admin/users/${userId}/bindings/${relationId}`)
}
