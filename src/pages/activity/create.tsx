/**
 * 活动管理 - 创建活动（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function ActivityCreate() {
  return (
    <PageContainer title="创建活动" description="新建营销活动">
      <Card bordered={false}>活动表单（预留，使用 activityApi.saveActivity）</Card>
    </PageContainer>
  )
}
