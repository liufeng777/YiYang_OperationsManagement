/**
 * 退款详情 - 退款申请（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function RefundList() {
  return (
    <PageContainer title="退款申请" description="处理用户退款申请">
      <Card bordered={false}>退款申请列表（预留，使用 refundApi.getRefundList）</Card>
    </PageContainer>
  )
}
