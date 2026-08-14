/**
 * 内容配置 - Banner 配置（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function ContentBanner() {
  return (
    <PageContainer title="Banner 配置" description="管理首页轮播 Banner">
      <Card bordered={false}>Banner 配置（预留，使用 contentApi.getBannerList + saveBanner）</Card>
    </PageContainer>
  )
}
