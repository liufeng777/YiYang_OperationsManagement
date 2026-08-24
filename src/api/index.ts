/**
 * API 模块统一出口
 * 页面中请按需从 @/api 引入，避免全量引入
 *
 * 模块与《运营后台端-API设计》章节对应关系：
 * - auth        §1 认证与会话
 * - system      §2 系统与权限（管理员/角色/权限/操作日志）
 * - institution §3.1 机构 + §5.4 机构服务关联
 * - staff       §3.2~3.5 人员/资质/岗位/排班
 * - member      §4 会员/标签/等级/用户账号/绑定
 * - service     §5.1 服务 + §5.3 服务-耗材关联
 * - consumable  §5.2 耗材包
 * - order       §6.1 订单
 * - refund      §6.2 退款审核
 * - finance     §6.2~6.4 支付渠道/渠道流水/对账
 * - workorder   §7 工单
 * - activity    §8.1~8.2 活动/报名
 * - lead        §8.3 线索/咨询/预约
 * - message     §9 消息/模板/短信/公告
 * - cms         §10 内容/分类/轮播
 * - dashboard   §11 数据看板
 * - settings    §12 全局参数
 * - upload      共通 §7 上传契约
 * - content     页面展示类型（mock，无文档接口，见模块内说明）
 */
export * as authApi from './modules/auth'
export * as dashboardApi from './modules/dashboard'
export * as institutionApi from './modules/institution'
export * as staffApi from './modules/staff'
export * as memberApi from './modules/member'
export * as serviceApi from './modules/service'
export * as consumableApi from './modules/consumable'
export * as activityApi from './modules/activity'
export * as leadApi from './modules/lead'
export * as orderApi from './modules/order'
export * as refundApi from './modules/refund'
export * as financeApi from './modules/finance'
export * as workorderApi from './modules/workorder'
export * as contentApi from './modules/content'
export * as cmsApi from './modules/cms'
export * as messageApi from './modules/message'
export * as systemApi from './modules/system'
export * as settingsApi from './modules/settings'
export * as uploadApi from './modules/upload'
