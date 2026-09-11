/**
 * 活动管理 - 活动详情（预留）
 */
import { useParams } from 'react-router-dom'
import { Card, Descriptions } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function ActivityDetail() {
  const { id } = useParams()
  return (
    <PageContainer title="活动详情" description={`活动 ID：${id}`}>
      <Card bordered={false}>
        <Descriptions column={2} title="活动信息">
          <Descriptions.Item label="活动标题">-</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  )
}
