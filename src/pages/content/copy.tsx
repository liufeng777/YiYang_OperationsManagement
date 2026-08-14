/**
 * 内容配置 - 文案配置（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function ContentCopy() {
  return (
    <PageContainer title="文案配置" description="管理页面文案内容">
      <Card bordered={false}>文案配置（预留，使用 contentApi.saveCopyContent）</Card>
    </PageContainer>
  )
}
