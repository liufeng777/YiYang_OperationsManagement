/**
 * 运营配置 - 全局参数（swagger：运营后台-运营配置）
 * 权限码 system:config
 * 说明：swagger 仅收录 全局参数列表 / 更新全局参数 两个接口；
 *       微信支付渠道配置接口未收录（页面为 ApiPendingAlert 占位），已移除。
 * 实测约定（swagger 未体现）：
 * - 列表项 / 更新入参均携带 settings_id，更新时必传；
 * - PUT 不传 settings_id 视为新增参数（key + type + value 必填）。
 */
import { http } from '@/utils/request'

/** 全局参数项 */
export interface SettingItem {
  /** 参数 ID：更新时必传；新增时不传 */
  settings_id?: number
  key: string
  value: string
  /** 值类型：number / string / bool 等 */
  type: string
  description?: string
}

/** 全局参数列表 GET /api/admin/settings（swagger：key 按参数键筛选，选填） */
export function getSettings(params?: { key?: string }) {
  return http.get<{ list: SettingItem[] }>('/admin/settings', { ...params })
}

/**
 * 更新 / 新增全局参数 PUT /api/admin/settings
 * - 更新：携带 settings_id + key / type / value（description 选填）
 * - 新增：不传 settings_id，key / type / value 必填（swagger admin.ReqUpdateSetting）
 */
export function updateSetting(data: SettingItem) {
  return http.put<null>('/admin/settings', data)
}
