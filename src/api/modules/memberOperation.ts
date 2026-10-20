/**
 * 会员运营（注册会员运营视角）
 *
 * 设计稿来源：注册会员管理（导出拉新明细 / 会员详情）
 *
 * 接口对接现状（对照 src/api/swagger.json）：
 * ✅ 已具备：
 *   - 注册用户列表：GET /admin/users（keyword 昵称/手机号模糊、wx_openid、register_source 注册来源、has_order 购买状态）
 *   - 注册用户详情：GET /admin/users/:id（含绑定会员 bound_members 与订单记录 order_records）
 *   - 拉新注册事件：GET /admin/referral-events（event_type=100 注册，start_time/stop_time）
 *   - 导出拉新明细：GET /admin/referral-events/export（CSV，见 reward.ts，入口在推荐与奖励页）
 * ❌ swagger.json 未提供（下方以 ApiPendingError 占位，页面捕获后统一提示「接口未对接」）：
 *   - 注册会员沟通跟进记录的新增 / 列表（沟通要点、推荐服务、下次联系时间）
 */
import type { ApiPageParams, ApiPageResult } from '@/types/api'
import type { UserDTO } from './member'

/* ------------------------------------------------------------------ */
/* 通用：接口未对接错误                                                  */
/* ------------------------------------------------------------------ */

/** 后端接口未在 swagger.json 中提供时抛出的错误（页面捕获后提示，不经过拦截器） */
export class ApiPendingError extends Error {
  constructor(feature: string) {
    super(`「${feature}」的后端接口尚未在 swagger.json 中提供`)
    this.name = 'ApiPendingError'
  }
}

/** 判断是否为接口未对接错误 */
export function isApiPendingError(error: unknown): error is ApiPendingError {
  return error instanceof ApiPendingError
}

/* ------------------------------------------------------------------ */
/* 注册会员（注册用户）列表行                                            */
/* ------------------------------------------------------------------ */

/**
 * 注册会员列表行：GET /admin/users 返回的 UserDTO
 * 注册来源 / OpenID 筛选已对接（register_source / wx_openid）；
 * 运营归属字段接口未返回，在此以可选字段预留（FollowupDrawer 展示用）
 */
export interface RegisteredUserRow extends UserDTO {
  /** 负责运营人员 ID / 姓名（接口未返回，预留） */
  operator_id?: number | null
  operator_name?: string | null
}

/** 注册来源 → 文案（swagger 筛选字典：1-员工邀请 2-会员邀请 3-客服邀请 4-无邀请归因） */
export const REGISTER_SOURCE_TEXT: Record<number, string> = {
  1: '员工邀请',
  2: '会员邀请',
  3: '客服邀请',
  4: '无邀请归因',
}

/** 列表行注册来源展示：register_source 为后端文案直接展示；若为数字字符串则按字典映射 */
export function registerSourceText(row: RegisteredUserRow): string {
  const raw = row.register_source
  if (!raw) return '—'
  const asNumber = Number(raw)
  if (!Number.isNaN(asNumber) && REGISTER_SOURCE_TEXT[asNumber]) {
    return REGISTER_SOURCE_TEXT[asNumber]
  }
  return raw
}

/* ------------------------------------------------------------------ */
/* 导出拉新明细                                                          */
/* ------------------------------------------------------------------ */

/* 已对接真实接口：rewardApi.exportReferralEvents（GET /admin/referral-events/export，CSV），
 * 入口在「会员管理 - 推荐与奖励」页（pages/member/referral/ExportRecruitModal.tsx）。 */

/* ------------------------------------------------------------------ */
/* 沟通跟进（❌ swagger 未提供注册会员跟进接口；线索跟进接口不适用于注册会员） */
/* ------------------------------------------------------------------ */

/** 记录沟通跟进入参（按设计稿四项信息） */
export interface MemberFollowupBody {
  /** 沟通要点，必填 */
  content: string
  /** 推荐服务 ID 数组（选填，多选，来自 GET /admin/services） */
  service_ids?: number[]
  /** 下次联系时间（UTC 秒，选填） */
  next_contact_at?: number
}

/** 沟通跟进记录（按设计稿跟进历史列：时间 / 跟进人·来源 / 沟通内容 / 推荐服务·下次联系） */
export interface MemberFollowupRecord {
  id: number
  /** 跟进时间（UTC 秒） */
  created_at: number
  /** 跟进人姓名 */
  operator_name: string
  /** 来源，如 会员跟进 / 健管师转交 */
  source_text?: string
  /** 沟通内容 */
  content: string
  /** 推荐服务名称列表 */
  service_names?: string[]
  /** 下次联系时间（UTC 秒） */
  next_contact_at?: number | null
}

/**
 * 新增沟通跟进
 * TODO(接口缺失)：预期形如 POST /admin/members/:id/followups（线索的 POST /admin/leads/:id/followup 不适用于注册会员）。
 */
export function addMemberFollowup(_memberId: number, _data: MemberFollowupBody): Promise<never> {
  return Promise.reject(new ApiPendingError('记录沟通跟进'))
}

/**
 * 跟进历史列表
 * TODO(接口缺失)：预期形如 GET /admin/members/:id/followups。
 */
export function getMemberFollowups(
  _memberId: number,
  _params?: ApiPageParams,
): Promise<ApiPageResult<MemberFollowupRecord>> {
  return Promise.reject(new ApiPendingError('跟进历史'))
}
