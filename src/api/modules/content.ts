/**
 * 内容配置 - 页面展示类型（当前页面使用本地 mock 数据）
 *
 * 说明：本模块仅保留患者端首页配置 / 科普内容 / 专业人员展示页面的展示类型。
 * 文档对齐的内容管理接口请使用 `@/api/modules/cms`（§10 cms_content / banners）。
 * ⚠️ 以下页面交互在 API 文档中暂无对应接口（详见 WORKLOG 缺口清单）：
 * - 患者端首页配置的整体获取 / 发布（轮播之外的快捷入口、推荐位）
 * - 专业人员展示设置（visible / recommended / 患者端简介）
 */

/** 首页轮播图 */
export interface BannerItem {
  id: string
  title: string
  /** 分类标签，如 康养活动 */
  tag: string
  imageUrl: string
  /** 跳转目标展示，如 活动详情 */
  linkTarget: string
  sort: number
  enabled: boolean
}

/** 首页快捷入口（固定入口，仅调整显示与排序） */
export interface HomeEntryItem {
  id: string
  icon: string
  name: string
  visible: boolean
  sort: number
}

/** 首页推荐内容（已上架服务 / 已发布活动） */
export interface HomeRecommendItem {
  id: string
  icon: string
  name: string
  /** 备注，如 6 家机构可预约 */
  note: string
  /** 价格展示，如 ¥168 / 次 */
  price: string
  type: 'service' | 'activity'
  sort: number
}

/** 科普文章 */
export interface ArticleItem {
  id: string
  title: string
  category: string
  source: string
  author: string
  updatedAt: string
  /** 是否首页推荐 */
  recommended: boolean
  status: 'published' | 'draft' | 'offline'
}

/** 专业人员 */
export interface StaffItem {
  id: string
  name: string
  institutionName: string
  /** 职业 / 职称，如 主任医师 */
  title: string
  /** 擅长领域，如 心脑血管、慢病管理 */
  specialty: string
  /** 同步时间展示，如 08-10 15:30 */
  syncedAt: string
  /** 执业资质是否已同步 */
  qualified: boolean
  /** 患者端是否展示 */
  visible: boolean
  /** 是否首页推荐 */
  recommended: boolean
  /** 推荐顺序 */
  recommendSort?: number
  /** 患者端展示简介 */
  intro?: string
}
