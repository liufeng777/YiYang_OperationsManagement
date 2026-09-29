/**
 * 系统设置 - 系统公告
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据；
 * 接口就绪后接入 systemApi 公告接口并恢复筛选与公告表格
 */
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
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
        <ApiPendingAlert feature="系统公告" />
      </div>
    </PageContainer>
  )
}
