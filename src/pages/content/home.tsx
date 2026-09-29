/**
 * 内容配置 - 患者端首页配置
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据；
 * 接口就绪后接入 contentApi.getHomeConfig / publishHomeConfig 并恢复配置表单与患者端预览
 */
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import './home.less'

export default function ContentHome() {
  return (
    <PageContainer
      title="患者端首页配置"
      description="配置轮播图、快捷入口与推荐内容，右侧实时查看患者端展示效果"
    >
      <ApiPendingAlert feature="患者端首页配置" />
    </PageContainer>
  )
}
