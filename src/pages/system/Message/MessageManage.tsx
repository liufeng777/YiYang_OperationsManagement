/**
 * 系统设置 - 消息通知管理
 * 当前仅维护「消息模板」（§9.2 / 权限 system:message-template）
 * 站内消息 / 短信记录 / 系统公告三个入口已从本页移除（公告仍有独立页面）
 */
import PageContainer from '@/components/PageContainer'
import TemplatesTab from './manage/TemplatesTab'
import './MessageManage.less'

export default function MessageManage() {
  return (
    <PageContainer
      fixed
      title="消息通知管理"
      description="维护业务消息模板：模板名称、类型、渠道与内容，支持启停与删除"
    >
      <div className="message-manage">
        <TemplatesTab />
      </div>
    </PageContainer>
  )
}
