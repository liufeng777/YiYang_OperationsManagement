/**
 * 会员管理 —— 推荐与奖励
 * 推荐事件列表 GET /admin/referral-events
 * 注意：接口返回标准分页结构 { list, total }，服务端分页；
 *       记录字段按后端实测返回渲染（见 ReferralItem）。
 *
 * 另含会员运营 mock 页面（积分明细 / 实名审核）的展示类型：
 * pages/member/points.tsx、verify.tsx、VerifyDrawer.tsx 目前使用本地 mock 数据，
 * 后端接口就绪后在此补充对应 API 方法（页面注释已预留替换点）。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 推荐事件（GET /admin/referral-events）                               */
/* ------------------------------------------------------------------ */

/** 推荐事件列表筛选入参（不传或传 0 表示全部） */
export interface ReferralListParams extends ApiPageParams {
  /** 状态：1-pending / 2-valid / 9-invalid */
  status?: number
  /** 事件类型：100-注册 / 200-报名 / 300-订单支付 */
  event_type?: number
  /** 业务类型：1-用户 / 2-活动 / 3-订单 */
  biz_type?: number
  /** 奖励状态：1-未奖励 / 2-已奖励 / 3-已过期 / 9-作废 */
  reward_status?: number
}

/** 推荐事件记录（按后端实测返回对齐） */
export interface ReferralItem {
  id?: number
  /** 状态：1-pending / 2-valid / 9-invalid */
  status: number
  /** 事件类型：100-注册 / 200-报名 / 300-订单支付等 */
  event_type: number
  /** 关联业务 ID */
  biz_id: number
  /** 业务类型：1-用户 / 2-活动 / 3-订单 */
  biz_type: number
  /** 关联业务名称 */
  biz_name: string
  /** 奖励状态：1-未奖励 / 2-已奖励 / 3-已过期 / 9-作废 */
  reward_status: number
  /** 推荐码 */
  referral_code: string
  /** 用户姓名 */
  user_name: string
  /** 用户 ID */
  user_id: number
  /** 创建时间（UTC 秒） */
  created_at?: number
}

/** 推荐事件列表 GET /api/admin/referral-events */
export function getReferralList(params?: ReferralListParams) {
  return http.get<ApiPageResult<ReferralItem>>('/admin/referral-events', { ...params })
}

/* ------------------------------------------------------------------ */
/* 会员运营 mock 页面展示类型（积分明细 / 实名审核，接口待后端就绪）      */
/* ------------------------------------------------------------------ */

/** 积分变动类型：earn 获得 / deduct 扣减 / manual_add 后台增加 / manual_deduct 后台扣减 */
export type PointsChangeType = 'earn' | 'deduct' | 'manual_add' | 'manual_deduct'

/** 积分明细记录 */
export interface PointsRecord {
  id: string
  /** 变动时间（展示字符串，如 '08-25 14:35'） */
  time: string
  /** 会员姓名 */
  memberName: string
  changeType: PointsChangeType
  /** 变动积分（正为获得，负为扣减） */
  points: number
  /** 变动后余额 */
  balance: number
  /** 关联业务类型 */
  bizType: 'order' | 'refund' | null
  /** 关联业务单号 */
  bizNo: string | null
  /** 变动原因 */
  reason: string
  /** 操作来源（系统自动 / 操作人昵称） */
  source: string
}

/** 实名审核状态：pending 待审核 / approved 已通过 / rejected 已驳回 */
export type VerifyStatus = 'pending' | 'approved' | 'rejected'

/** 实名审核提交来源：add C端添加对象 / self C端本人认证 */
export type VerifySource = 'add' | 'self'

/** 健康服务对象实名审核记录 */
export interface VerifyRecord {
  id: string
  /** 申请编号 */
  applyNo: string
  /** 服务对象姓名 */
  targetName: string
  /** 提交人（姓名 · 手机号 展示字符串） */
  submitter: string
  /** 与提交人关系 */
  relation: string
  /** 身份证号（脱敏展示） */
  idCard: string
  source: VerifySource
  status: VerifyStatus
  /** 提交时间（展示字符串） */
  submitTime: string
  /** 审核人（未审核为 null） */
  auditor: string | null
  /** 审核备注 */
  remark?: string
}
