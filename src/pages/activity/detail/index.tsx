/**
 * 活动管理 - 活动详情
 * 先回显当前活动数据：可编辑活动切换为表单编辑布局，不可编辑活动使用非表单只读布局。
 */
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Empty, Space, Spin, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import ActivityCreate from '../create'
import RichDetailPreview, { isRichDetailEmpty } from '@/components/RichDetailPreview'
import { activityApi, institutionApi } from '@/api'
import type { ActivityInstitutionConfig, ActivityItem } from '@/api/modules/activity'
import type { InstitutionItem } from '@/api/modules/institution'
import { formatDateTime } from '@/utils'
import {
  activityTypeText,
  canEditActivity,
  formatActivityDate,
  resolveActivityStatus,
  resolveActivityTimeStatus,
} from '../constants'
import './index.less'

export default function ActivityDetail() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const activityId = Number(params.id)
  const [detail, setDetail] = useState<ActivityItem | null>(null)
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activityId) return
    let cancelled = false
    setLoading(true)
    activityApi
      .getActivity(activityId)
      .then((result) => {
        if (!cancelled) setDetail(result)
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    institutionApi
      .getInstitutions({ page: 1, page_size: 1000 })
      .then((result) => {
        if (!cancelled) setInstitutions(result.list ?? [])
      })
      .catch(() => {
        if (!cancelled) setInstitutions([])
      })
    return () => {
      cancelled = true
    }
  }, [activityId])

  const institutionMap = useMemo(
    () => new Map(institutions.map((item) => [item.id, item])),
    [institutions],
  )
  const status = detail ? resolveActivityStatus(detail) : null
  const timeStatus = detail ? resolveActivityTimeStatus(detail) : null
  const canEdit = detail ? canEditActivity(detail) : false

  const institutionColumns: ColumnsType<ActivityInstitutionConfig> = [
    {
      title: '参与机构',
      key: 'institution',
      render: (_, record) => {
        const institution = institutionMap.get(Number(record.institution_id))
        return (
          <div className="institution-cell">
            <strong>{institution?.name ?? `机构 ${record.institution_id}`}</strong>
            {(institution?.city || institution?.district) && (
              <span>{[institution.city, institution.district].filter(Boolean).join(' · ')}</span>
            )}
          </div>
        )
      },
    },
    {
      title: '联系人',
      key: 'contact',
      width: 180,
      render: (_, record) => (
        <div className="institution-cell">
          <span>{record.contact_name || '—'}</span>
          <span>{record.contact_phone || '—'}</span>
        </div>
      ),
    },
    {
      title: '机构场次时间',
      key: 'time',
      width: 280,
      render: (_, record) =>
        `${record.start_time ? formatDateTime(record.start_time * 1000) : '—'} ~ ${
          record.end_time ? formatDateTime(record.end_time * 1000) : '—'
        }`,
    },
    {
      title: '承接人数',
      dataIndex: 'max_participants',
      key: 'max_participants',
      width: 110,
      render: (value?: number) => `${value ?? 0} 人`,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <span className={`status-btn ${record.status === 9 ? 'status--cancel' : 'status--success'}`}>
          {record.status === 9 ? '停用' : '启用'}
        </span>
      ),
    },
  ]

  // 查看详情与编辑共用当前活动数据：符合权限时回显表单，其余情况使用只读布局。
  if (!loading && detail && canEdit) {
    return <ActivityCreate />
  }

  return (
    <PageContainer
      fixed
      title={detail?.title ?? '活动详情'}
      // description={detail ? `活动编号 ${detail.code || '—'} · 只读查看活动配置与展示内容` : '活动配置与展示内容'}
      extra={
        <Space>
          {detail && detail.status !== 1 && (
            <Button color="primary" variant='outlined' onClick={() => navigate(`/activity/signups/${activityId}`)}>报名查询</Button>
          )}
          <Button color="primary" variant="outlined" icon={<ArrowLeftOutlined />} onClick={() => navigate('/activity')}>
            返回活动列表
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading} className="activity-detail__spin">
        <div className="activity-detail">
          <Card variant="borderless" className="activity-detail__card">
            <div className="activity-detail__overview">
              <div className={`activity-detail__cover${detail?.cover_url ? ' has-image' : ''}`}>
                {detail?.cover_url ? <img src={detail.cover_url} alt="活动封面" /> : <span>暂无活动封面</span>}
              </div>
              <Descriptions
                className="activity-detail__descriptions"
                column={{ xs: 1, sm: 2, lg: 2 }}
                items={[
                  // { key: 'code', label: '活动编号', children: detail?.code || '—' },
                  {
                    key: 'type',
                    label: '活动类型',
                    children: detail ? (activityTypeText[detail.activity_type] ?? '—') : '—',
                  },
                  {
                    key: 'status',
                    label: '发布状态',
                    children: status ? (
                      <span className={`status-btn ${status.className}`}>{status.label}</span>
                    ) : '—',
                  },
                  {
                    key: 'time',
                    label: '活动时间',
                    children: detail
                      ? `${formatActivityDate(detail.start_date)} ~ ${formatActivityDate(detail.end_date)}`
                      : '—',
                  },
                  {
                    key: 'timeStatus',
                    label: '活动状态',
                    children: timeStatus ? (
                      <span className={`status-btn ${timeStatus.className}`}>{timeStatus.label}</span>
                    ) : '—',
                  },
                  {
                    key: 'capacity',
                    label: '报名 / 承接人数',
                    children: detail
                      ? `${detail.total_registered ?? 0} / ${detail.total_max_participants ?? 0} 人`
                      : '—',
                  },
                  { key: 'target', label: '适用人群', children: detail?.target_crowd || '—' },
                  {
                    key: 'institutions',
                    label: '参与机构',
                    children: `${detail?.institutions?.length ?? 0} 家`,
                  },
                  {
                    key: 'location',
                    label: '活动简介',
                    children: detail?.location || '暂无活动简介'
                  }
                ]}
              />
            </div>
          </Card>

          <Card variant="borderless" className="activity-detail__card" title="参与机构与场次">
            <Table<ActivityInstitutionConfig>
              rowKey="institution_id"
              size="small"
              columns={institutionColumns}
              dataSource={detail?.institutions ?? []}
              pagination={false}
              scroll={{ x: 860 }}
              locale={{ emptyText: '暂未配置参与机构' }}
            />
          </Card>

          <Card variant="borderless" className="activity-detail__card" title="图文详情">
            {detail && !isRichDetailEmpty(detail.description) ? (
              <RichDetailPreview value={detail.description} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无图文详情" />
            )}
          </Card>
        </div>
      </Spin>
    </PageContainer>
  )
}
