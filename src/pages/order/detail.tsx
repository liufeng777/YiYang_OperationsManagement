/**
 * 订单中心 - 订单详情（预留）
 */
import { useParams } from 'react-router-dom'
import { Card, Descriptions } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function OrderDetail() {
  const { id } = useParams()
  return (
    <PageContainer title="订单详情" description={`订单 ID：${id}`}>
      <Card bordered={false}>
        <Descriptions column={2} title="订单信息">
          <Descriptions.Item label="订单号">-</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  )
}
