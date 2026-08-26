/**
 * 系统设置 - 消息通知管理
 * 以 Tab 聚合：站内消息 / 消息模板 / 短信记录 / 系统公告
 * 对齐《运营后台端-API设计》§9 消息通知管理
 */
import { useState } from 'react'
import { Tabs } from 'antd'
import PageContainer from '@/components/PageContainer'
import MessagesTab from './manage/MessagesTab'
import TemplatesTab from './manage/TemplatesTab'
import SmsLogsTab from './manage/SmsLogsTab'
import AnnouncementsTab from './manage/AnnouncementsTab'
import './MessageManage.less'

export default function MessageManage() {
  const [activeKey, setActiveKey] = useState('messages')

  return (
    <PageContainer
      title="消息通知管理"
      description="管理站内消息、业务消息模板、短信发送记录与系统公告"
    >
      <Tabs
        className="message-manage__tabs"
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'messages', label: '站内消息', children: <MessagesTab /> },
          { key: 'templates', label: '消息模板', children: <TemplatesTab /> },
          { key: 'sms', label: '短信记录', children: <SmsLogsTab /> },
          { key: 'announcements', label: '系统公告', children: <AnnouncementsTab /> },
        ]}
      />
    </PageContainer>
  )
}
