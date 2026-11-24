/** 支付渠道：1-微信 2-支付宝，保留其他渠道的兼容展示。 */
export const CHANNEL_TYPE_TEXT: Record<number, string> = {
  1: '微信支付',
  2: '支付宝',
  3: '银联',
  9: '其他',
}

/** 流水状态：沿用现有交易状态契约，未知值回显原始状态码。 */
export const CHANNEL_LOG_STATUS_TEXT: Record<number, string> = {
  1: '交易成功',
  2: '已退款',
  3: '交易失败',
}

export const CHANNEL_LOG_STATUS_TONE: Record<number, string> = {
  1: 'success',
  2: 'info',
  3: 'danger',
}

export const ORDER_TYPE_TEXT: Record<number, string> = {
  1: '服务订单',
}

export const MATCH_STATUS_TEXT: Record<number, string> = {
  0: '未匹配',
  1: '已匹配',
}
