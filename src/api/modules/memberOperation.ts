/**
 * 会员运营（注册会员运营视角）
 *
 * 设计稿来源：注册会员管理（导出拉新明细 / 记录沟通跟进 / 我的会员 / 会员详情）
 *
 * 接口对接现状（对照 src/api/swagger.json）：
 * ✅ 已具备：
 *   - 推荐服务候选：GET /admin/services（status 过滤）
 *   - 会员订单记录：GET /admin/orders（member_id 过滤）
 *   - 拉新注册事件：GET /admin/referral-events（event_type=100 注册，start_time/stop_time）
 * ❌ swagger.json 未提供（下方以 ApiPendingError 占位，页面捕获后统一提示「接口未对接」）：
 *   - 导出拉新明细（按注册时间导出邀请来源明细）
 *   - 注册会员沟通跟进记录的新增 / 列表（沟通要点、推荐服务、下次联系时间）
 *   - 会员列表的运营归属字段与筛选（分配状态 / 购买状态 / 最近联系 / 下次联系 / 有效订单数 / 实付金额）
 *   - 我的会员（按当前登录运营归属过滤）
 *   - 会员详情关联家属的健康会员接入状态
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'
import type { MemberDTO } from './member'

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
/* 注册会员列表行（MemberDTO + 运营归属扩展字段，后端尚未返回，先做兼容渲染） */
/* ------------------------------------------------------------------ */

/** 注册会员列表行：swagger MemberDTO 之上预留的运营字段（未返回时页面展示「—」/「未分配」） */
export interface RegisteredMemberRow extends MemberDTO {
  /** 负责运营人员 ID（swagger 未返回） */
  operator_id?: number | null
  /** 负责运营人员姓名（swagger 未返回） */
  operator_name?: string | null
  /** 注册来源文案，如 员工邀请 / 会员邀请 / 无邀请归因（swagger 未返回） */
  source_text?: string | null
  /** 邀请人姓名（swagger 未返回） */
  inviter_name?: string | null
  /** 邀请人编号（swagger 未返回） */
  inviter_code?: string | null
  /** 最近联系时间（UTC 秒，swagger 未返回） */
  last_contact_at?: number | null
  /** 下次联系时间（UTC 秒，swagger 未返回） */
  next_contact_at?: number | null
  /** 有效订单数（swagger 未返回） */
  valid_order_count?: number | null
  /** 实付金额合计（分，swagger 未返回） */
  paid_amount_total?: number | null
  /** 注册时间（UTC 秒，swagger 未返回） */
  registered_at?: number | null
}

/* ------------------------------------------------------------------ */
/* 导出拉新明细（❌ swagger 未提供导出接口）                              */
/* ------------------------------------------------------------------ */

/** 导出拉新明细筛选入参（按设计稿：注册日期 / 邀请来源 / 邀请人） */
export interface RecruitExportParams {
  /** 注册起始时间（UTC 秒） */
  start_time?: number
  /** 注册截止时间（UTC 秒） */
  stop_time?: number
  /** 邀请来源（字典待后端定义，如 1-员工邀请 2-会员邀请 3-无邀请归因） */
  source_type?: number
  /** 邀请人 ID（支持姓名 / 编号检索，候选接口缺失） */
  inviter_id?: number
}

/**
 * 导出拉新明细
 * TODO(接口缺失)：swagger.json 无该导出端点；预期形如 GET /admin/members/recruit-export。
 * 当前仅能通过 GET /admin/referral-events（event_type=100 注册 + 起止时间）查到注册类推荐事件列表，
 * 但缺少导出字段（脱敏手机号 / 邀请人编号 / 推广机构）与文件导出能力。
 */
export function exportRecruitDetail(_params: RecruitExportParams): Promise<never> {
  return Promise.reject(new ApiPendingError('导出拉新明细'))
}

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

/* ------------------------------------------------------------------ */
/* 我的会员（❌ 列表接口缺少运营归属过滤）                                 */
/* ------------------------------------------------------------------ */

/**
 * 我的会员列表入参：在会员列表参数上预留 owner_id（当前登录运营）
 * TODO(接口缺失)：GET /admin/members 尚无 owner_id / 分配状态 / 购买状态 / 注册来源等过滤参数，
 * 当前传参会被后端忽略，页面已加提示。
 */
export interface MyMemberListParams extends ApiPageParams {
  keyword?: string
  /** 当前登录运营人员 ID（swagger 未支持，预留） */
  owner_id?: number
  status?: number
}

/** 我的会员列表：复用 GET /admin/members，owner_id 待后端支持后生效 */
export function getMyMembers(params?: MyMemberListParams) {
  return http.get<ApiPageResult<RegisteredMemberRow>>('/admin/members', { ...params })
}
