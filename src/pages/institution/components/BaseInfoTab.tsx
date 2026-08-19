/**
 * 机构详情 - 基础资料 Tab
 * 数据来自协作平台同步，平台侧只读
 */
import { Card } from 'antd'
import type { InstitutionDetail } from '@/api/modules/institution'

interface BaseInfoTabProps {
  detail: InstitutionDetail
}

export default function BaseInfoTab({ detail }: BaseInfoTabProps) {
  return (
    <Card variant="borderless" className="detail-card">
      <div className="detail-card__header">
        <div>
          <h3>基础资料</h3>
          <p>来自协作平台同步，平台侧仅维护患者端展示资料</p>
        </div>
      </div>
      <div className="sync-info sync-info--base">
        <div><span>机构名称</span><strong>{detail.name}</strong></div>
        <div><span>机构编码</span><strong>{detail.code}</strong></div>
        <div><span>机构类型</span><strong>{detail.type}</strong></div>
        <div><span>机构来源</span><strong>{detail.source}</strong></div>
        <div><span>经营地址</span><strong>{detail.address}</strong></div>
        <div><span>联系电话</span><strong>{detail.contactPhone}</strong></div>
      </div>
    </Card>
  )
}
