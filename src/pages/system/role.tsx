/**
 * 系统设置 - 角色权限（预留）
 */
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'

export default function SystemRole() {
  return (
    <PageContainer title="角色权限" description="配置角色与权限">
      <Card bordered={false}>角色权限（预留，使用 systemApi.getRoleList + saveRole）</Card>
    </PageContainer>
  )
}
