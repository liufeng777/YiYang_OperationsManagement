/**
 * 系统设置 - 操作日志（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function SystemLog() {
  return (
    <PageContainer title="操作日志" description="查看系统操作记录">
      <Card bordered={false}>操作日志列表（预留，使用 systemApi.getLogList）</Card>
    </PageContainer>
  )
}
