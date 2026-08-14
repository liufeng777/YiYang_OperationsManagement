/**
 * 机构管理 - 机构列表（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function InstitutionList() {
  return (
    <PageContainer title="机构列表" description="管理合作机构的入驻信息">
      <Card bordered={false}>机构列表表格（预留，使用 Table + institutionApi.getInstitutionList）</Card>
    </PageContainer>
  )
}
