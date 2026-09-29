/**
 * 系统设置 - 支付配置（当前未挂载路由）
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据；
 * 接口就绪后接入 financeApi 支付渠道配置（§6.2）并恢复配置表单与操作日志
 */
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import './payment.less'

export default function PaymentSettings() {
  return (
    <PageContainer
      title="支付配置"
      description="维护支付渠道商户参数与回调配置，查看渠道操作日志"
    >
      <ApiPendingAlert feature="支付配置" />
    </PageContainer>
  )
}
