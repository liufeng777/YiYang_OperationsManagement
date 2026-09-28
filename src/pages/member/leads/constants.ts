/**
 * 线索管理 - 枚举文案（列表页 / 详情 Drawer 共用）
 * 权威口径：《线索-前端对接与测试指南》§2（common/models/leads.go）
 */

/** 线索状态（指南 §2.1）：1-待跟进 2-跟进中 3-已转化 4-转化失败 9-流失；3/9 为终态，6 已废弃禁用 */
export const LEAD_STATUS_TEXT: Record<number, string> = {
  1: '待跟进',
  2: '跟进中',
  3: '已转化',
  4: '转化失败',
  9: '流失',
}

/** 来源类型（指南 §2.2） */
export const LEAD_SOURCE_TEXT: Record<number, string> = {
  1: '活动',
  2: '咨询',
  3: '预约',
  4: '线下新客户',
  5: '线下老客户',
  11: '自主注册',
  12: '朋友分享',
  13: '健管师引导',
  14: '客服引导',
  21: '从未活跃客户',
  22: '久未活跃客户',
}

/** 任务类型（指南 §2.3，转化条件由服务端按 task_type 自动判定） */
export const LEAD_TASK_TYPE_TEXT: Record<number, string> = {
  1: '未注册客户',
  2: '未绑定健康对象',
  3: '无健管师客户',
  4: '非活跃客户',
}

/** 跟进方式（指南 §2.4，跟进记录 action） */
export const LEAD_FOLLOWUP_TYPE_TEXT: Record<number, string> = {
  1: '语音',
  2: '文字',
  3: '视频',
  4: '在店',
  5: '上门',
}
