/**
 * 系统设置 - 账号管理（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function SystemAccount() {
  return (
    <PageContainer title="账号管理" description="管理后台账号">
      <Card bordered={false}>账号列表（预留，使用 systemApi.getAccountList）</Card>
    </PageContainer>
  )
}
