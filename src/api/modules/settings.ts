/**
 * 运营配置 - 全局参数（运营后台端-API设计 §12）
 * 权限码 system:config
 */
import { http } from '@/utils/request'

/** 微信支付配置 DTO */
export interface WechatPayConfig {
  /** 支付渠道：wechat */
  channel: string
  /** 渠道名称 */
  channel_name: string
  /** 渠道描述 */
  channel_desc: string
  /** 微信商户号 */
  mch_id: string
  /** 商户号持有方 */
  mch_holder: string
  /** 小程序 AppID */
  app_id: string
  /** AppID 描述 */
  app_id_desc: string
  /** API V3 密钥是否已配置 */
  api_v3_key_configured: boolean
  /** API V3 密钥更新时间 */
  api_v3_key_updated_at: string
  /** 商户私钥文件名 */
  private_key_file: string
  /** 商户私钥是否已加密保存 */
  private_key_encrypted: boolean
  /** 商户证书序列号 */
  cert_serial_no: string
  /** 商户证书是否有效 */
  cert_valid: boolean
  /** 商户证书是否自动更新 */
  cert_auto_update: boolean
  /** 支付结果通知 URL */
  notify_url: string
  /** 支付通知 URL 是否已验证 */
  notify_url_verified: boolean
  /** 退款结果通知 URL */
  refund_notify_url: string
  /** 退款通知 URL 是否已验证 */
  refund_notify_url_verified: boolean
  /** 渠道启用状态：1-启用 9-停用 */
  status: number
  /** 配置是否完整 */
  config_complete: boolean
}

/** 操作日志项 */
export interface PaymentOperationLog {
  id: number
  /** 操作时间 */
  created_at: string
  /** 操作类型 */
  action: string
  /** 操作结果 */
  result?: string
  /** 操作人 */
  operator: string
  /** 详情 */
  detail?: string
}

/** 连接测试结果 */
export interface PaymentConnectionTestResult {
  success: boolean
  message: string
  tested_at: string
}

/** 获取微信支付配置 GET /api/admin/payment/wechat/config */
export function getWechatPayConfig() {
  return http.get<WechatPayConfig>('/admin/payment/wechat/config')
}

/** 更新微信支付配置 PUT /api/admin/payment/wechat/config */
export function updateWechatPayConfig(data: Partial<WechatPayConfig>) {
  return http.put<null>('/admin/payment/wechat/config', data)
}

/** 测试微信支付连接 POST /api/admin/payment/wechat/test */
export function testWechatPayConnection() {
  return http.post<PaymentConnectionTestResult>('/admin/payment/wechat/test')
}

/** 获取支付操作日志 GET /api/admin/payment/logs */
export function getPaymentLogs(params?: { page?: number; page_size?: number }) {
  return http.get<{ list: PaymentOperationLog[]; total: number }>('/admin/payment/logs', { ...params })
}
export interface SettingItem {
  key: string
  value: string
  /** 值类型：number / string / boolean / json */
  type: string
  description?: string
}

/** 全局参数列表 GET /api/admin/settings */
export function getSettings() {
  return http.get<SettingItem[]>('/admin/settings')
}

/** 更新全局参数 PUT /api/admin/settings */
export function updateSettings(data: SettingItem[]) {
  return http.put<null>('/admin/settings', data)
}
