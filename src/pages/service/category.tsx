/**
 * 服务项目 - 项目分类（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function ServiceCategory() {
  return (
    <PageContainer title="项目分类" description="维护服务项目的分类结构">
      <Card bordered={false}>分类管理（预留，使用 serviceApi.getServiceCategoryList）</Card>
    </PageContainer>
  )
}
