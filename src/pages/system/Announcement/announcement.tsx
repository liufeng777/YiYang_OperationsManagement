/**
 * 系统设置 - 系统公告
 * 数据来源：messageApi 公告接口（getAnnouncements / createAnnouncement / updateAnnouncement /
 *          publishAnnouncement / withdrawAnnouncement / deleteAnnouncement，swagger 未收录，以后端实际为准）
 * 说明：与「消息通知管理 - 系统公告」Tab 为同一业务，直接复用 AnnouncementsTab 组件
 */
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import AnnouncementsTab from '../Message/manage/AnnouncementsTab'
import './announcement.less'

export default function AnnouncementList() {
  const navigate = useNavigate()

  return (
    <PageContainer
      fixed
      title="系统公告"
      description="发布服务暂停、系统维护和节假日服务调整等运营通知"
    >
      <div className="announcement-page">
        <div className="announcement-page__subtabs">
          <button type="button" onClick={() => navigate('/system/message')}>
            业务消息模板
          </button>
          <button type="button" className="is-active">
            系统公告
          </button>
          <span>公告仅用于影响患者使用的运营异常通知</span>
        </div>
        <AnnouncementsTab />
      </div>
    </PageContainer>
  )
}
