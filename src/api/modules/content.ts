import { http } from '@/utils/request'

export interface BannerItem {
  id: number
  title: string
  imageUrl: string
  linkUrl: string
  sort: number
  enabled: boolean
}

/** 获取 Banner 配置列表 */
export function getBannerList() {
  return http.get<BannerItem[]>('/content/banner/list')
}

/** 保存 Banner 配置 */
export function saveBanner(data: Partial<BannerItem>) {
  return data.id
    ? http.put<null>('/content/banner/update', data)
    : http.post<null>('/content/banner/create', data)
}

/** 保存文案配置 */
export function saveCopyContent(data: Record<string, string>) {
  return http.post<null>('/content/copy/save', data)
}
