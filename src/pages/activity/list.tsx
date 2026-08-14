/**
 * 活动管理 - 活动列表（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function ActivityList() {
  return (
    <PageContainer title="活动列表" description="管理营销活动">
      <Card bordered={false}>活动列表表格（预留，使用 activityApi.getActivityList）</Card>
    </PageContainer>
  )
}
