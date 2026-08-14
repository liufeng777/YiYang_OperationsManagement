/**
 * 退款详情 - 退款处理（预留）
 */
import { useParams } from 'react-router-dom'
import { Card, Descriptions } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function RefundDetail() {
  const { id } = useParams()
  return (
    <PageContainer title="退款处理" description={`退款 ID：${id}`}>
      <Card bordered={false}>
        <Descriptions column={2} title="退款信息">
          <Descriptions.Item label="退款金额">-</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  )
}
