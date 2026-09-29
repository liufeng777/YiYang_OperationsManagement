/**
 * 接口未对接提示
 * 用于后端接口尚未就绪的页面 / 区块：统一以 Alert 警示条告知「接口未对接」，
 * 页面不展示 mock 业务数据，功能在接口对接完成后开放。
 */
import { Alert } from 'antd'
import './index.less'

interface ApiPendingAlertProps {
  /** 功能名称，如「科普内容管理」；缺省为「本页面」 */
  feature?: string
}

export default function ApiPendingAlert({ feature }: ApiPendingAlertProps) {
  return (
    <Alert
      className="api-pending-alert"
      type="warning"
      showIcon
      message="接口未对接"
      description={`${feature ?? '本页面'}的后端接口尚未就绪，当前不展示业务数据；页面功能将在接口对接完成后开放。`}
    />
  )
}
