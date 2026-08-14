/**
 * 服务项目 - 项目列表（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function ServiceList() {
  return (
    <PageContainer title="项目列表" description="管理平台服务项目">
      <Card bordered={false}>项目列表表格（预留，使用 serviceApi.getServiceList）</Card>
    </PageContainer>
  )
}
