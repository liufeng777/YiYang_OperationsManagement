/**
 * 订单中心公共常量与状态判断（列表 / 详情共用）
 * 订单状态：1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款 7-退款中 8-退款待审批
 */

export const ORDER_STATUS_TEXT: Record<number, string> = {
  1: '待支付',
  2: '待确认',
  3: '生效中',
  4: '已完成',
  5: '已取消',
  6: '已退款',
  7: '退款中',
  8: '退款待审批',
}

/** 可取消状态：待支付 / 待确认 */
const CANCELLABLE_STATUS = [1, 2]
/** 可发起退款状态：生效中 / 已完成（退款中、退款待审批、已退款不可重复发起） */
const REFUNDABLE_STATUS = [3, 4]

export const canCancelOrder = (status?: number) =>
  status != null && CANCELLABLE_STATUS.includes(status)

export const canRefundOrder = (status?: number) =>
  status != null && REFUNDABLE_STATUS.includes(status)
