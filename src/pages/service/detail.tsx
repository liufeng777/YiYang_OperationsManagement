/**
 * 服务项目 - 项目详情（预留）
 */
import { useParams } from 'react-router-dom'
import { Card, Descriptions } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function ServiceDetail() {
  const { id } = useParams()
  return (
    <PageContainer title="项目详情" description={`项目 ID：${id}`}>
      <Card bordered={false}>
        <Descriptions column={2} title="项目信息">
          <Descriptions.Item label="项目名称">-</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  )
}
