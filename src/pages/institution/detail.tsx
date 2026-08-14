/**
 * 机构管理 - 机构详情（预留）
 */
import { useParams } from 'react-router-dom'
import { Card, Descriptions } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function InstitutionDetail() {
  const { id } = useParams()
  return (
    <PageContainer title="机构详情" description={`机构 ID：${id}`}>
      <Card bordered={false}>
        <Descriptions column={2} title="基本信息">
          <Descriptions.Item label="机构名称">-</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  )
}
