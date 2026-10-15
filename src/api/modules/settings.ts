/**
 * 运营配置 - 全局参数（swagger：运营后台-运营配置）
 * 权限码 system:config
 * 说明：swagger 仅收录 全局参数列表 / 更新全局参数 两个接口；
 *       微信支付渠道配置接口未收录（页面为 ApiPendingAlert 占位），已移除。
 */
import { http } from '@/utils/request'

/** 全局参数项 */
export interface SettingItem {
  key: string
  value: string
  /** 值类型：number / string / bool 等 */
  type: string
  description?: string
}

/** 全局参数列表 GET /api/admin/settings（swagger：key 按参数键筛选，选填） */
export function getSettings(params?: { key?: string }) {
  return http.get<SettingItem[]>('/admin/settings', { ...params })
}

/** 更新全局参数 PUT /api/admin/settings（swagger admin.ReqUpdateSetting：key / type / value 必填，单条更新） */
export function updateSetting(data: SettingItem) {
  return http.put<null>('/admin/settings', data)
}
