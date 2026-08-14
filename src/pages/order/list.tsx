/**
 * 订单中心 - 订单列表（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function OrderList() {
  return (
    <PageContainer title="订单列表" description="查询与管理平台订单">
      <Card bordered={false}>订单列表表格（预留，使用 orderApi.getOrderList + exportOrder）</Card>
    </PageContainer>
  )
}
