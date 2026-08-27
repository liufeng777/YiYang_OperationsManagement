/**
 * 会员运营（会员管理一级导航）
 * - 会员列表：注册会员、运营跟进记录与订单转化状态
 * - 积分明细：会员积分余额与获得、扣减及后台调整记录（一期不支持积分兑换）
 * - 实名审核：C端提交的健康服务对象姓名与身份证信息审核
 *
 * 说明：当前为设计稿驱动的页面展示类型（mock），后端接口文档就绪后
 * 在此模块补充对应 http 方法，页面再从 @/api 引入替换 mock 数据。
 */

/* ------------------------------------------------------------------ */
/* 会员列表（运营跟进）                                                  */
/* ------------------------------------------------------------------ */

/** 跟进状态：uncontacted-待首次联系 following-跟进中 no_intent-暂无意向 */
export type MemberFollowStatus = 'uncontacted' | 'following' | 'no_intent'

/** 转化状态：pending-待转化 converted-已转化 */
export type MemberConvertStatus = 'pending' | 'converted'

/** 会员运营列表项 */
export interface MemberOpsItem {
  id: string
  name: string
  /** 脱敏手机号 */
  phone: string
  /** 运营跟进人；null 表示未关联 */
  operator: string | null
  /** 最近跟进描述（如「08-25 电话联系」「尚未联系」） */
  lastFollow: string
  convertStatus: MemberConvertStatus
  followStatus: MemberFollowStatus
  /** 最近订单时间；null 表示暂无订单 */
  lastOrder: string | null
  /** 注册时间 yyyy-MM-dd */
  registerTime: string
}

/* ------------------------------------------------------------------ */
/* 积分明细                                                             */
/* ------------------------------------------------------------------ */

/** 变动类型：earn-获得 deduct-扣减 manual_add-后台增加 manual_deduct-后台扣减 */
export type PointsChangeType = 'earn' | 'deduct' | 'manual_add' | 'manual_deduct'

/** 关联业务类型：order-订单 refund-退款 null-无关联 */
export type PointsBizType = 'order' | 'refund' | null

/** 积分变动记录 */
export interface PointsRecord {
  id: string
  /** 变动时间 MM-dd HH:mm */
  time: string
  memberName: string
  changeType: PointsChangeType
  /** 变动积分（正数为增加，负数为扣减） */
  points: number
  /** 变动后余额 */
  balance: number
  bizType: PointsBizType
  /** 关联业务单号 */
  bizNo: string | null
  /** 变动原因 */
  reason: string
  /** 操作来源（系统自动 / 运营人员） */
  source: string
}

/* ------------------------------------------------------------------ */
/* 健康服务对象实名审核                                                  */
/* ------------------------------------------------------------------ */

/** 审核状态：pending-待审核 approved-已通过 rejected-已驳回 */
export type VerifyStatus = 'pending' | 'approved' | 'rejected'

/** 提交来源：add-C端添加对象 self-C端本人认证 */
export type VerifySource = 'add' | 'self'

/** 实名认证审核记录 */
export interface VerifyRecord {
  id: string
  /** 申请编号（如 RN202608250038） */
  applyNo: string
  /** 服务对象姓名 */
  targetName: string
  /** 提交人（如「张女士 · 138****2368」） */
  submitter: string
  /** 与提交人关系（父亲/母亲/配偶/本人…） */
  relation: string
  /** 脱敏身份证号 */
  idCard: string
  source: VerifySource
  status: VerifyStatus
  /** 提交时间 */
  submitTime: string
  /** 审核人；null 表示未审核 */
  auditor: string | null
  /** 审核备注 */
  remark?: string
}
