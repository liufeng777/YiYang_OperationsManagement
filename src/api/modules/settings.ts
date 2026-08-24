/**
 * 运营配置 - 全局参数（运营后台端-API设计 §12）
 * 权限码 system:config
 */
import { http } from '@/utils/request'

/** 全局参数项 */
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
