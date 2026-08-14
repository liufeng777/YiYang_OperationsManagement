/**
 * 机构管理 - 机构审核（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function InstitutionAudit() {
  return (
    <PageContainer title="机构审核" description="处理机构入驻审核申请">
      <Card bordered={false}>审核列表（预留，使用 institutionApi.getInstitutionList + auditInstitution）</Card>
    </PageContainer>
  )
}
