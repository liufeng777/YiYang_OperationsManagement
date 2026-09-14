/**
 * 活动管理 - 活动详情（只读展示）
 * 数据来源：activityApi.getActivity
 * 说明：当前路由 /activity/detail/:id 指向活动编辑页（pages/activity/create），
 *       本页作为只读详情预留，如需对外展示可在 router/routes.tsx 中另行挂载。
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Descriptions, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import PageContainer from '@/components/PageContainer'
import { activityApi } from '@/api'
import type { ActivityInstitutionConfig, ActivityItem } from '@/api/modules/activity'
import { formatDateTime } from '@/utils'

const statusText: Record<number, string> = {
  1: '待发布',
  2: '报名中',
  3: '已结束',
  9: '已取消',
}

const typeText: Record<number, string> = {
  1: '社区活动',
  2: '康养旅游',
  3: '健康课堂',
  4: '健康活动',
  5: '其他',
}

/** 参与机构列：机构 / 名额上限 / 场次时间 / 联系人 */
const institutionColumns: ColumnsType<ActivityInstitutionConfig> = [
  { title: '机构 ID', dataIndex: 'institution_id', key: 'institution_id', width: 100 },
  { title: '名额上限', dataIndex: 'max_participants', key: 'max_participants', width: 100 },
  {
    title: '场次开始',
    dataIndex: 'start_time',
    key: 'start_time',
    width: 170,
    render: (value: number) => formatDateTime(value && value * 1000),
  },
  {
    title: '场次结束',
    dataIndex: 'end_time',
    key: 'end_time',
    width: 170,
    render: (value: number) => formatDateTime(value && value * 1000),
  },
  { title: '联系人', dataIndex: 'contact_name', key: 'contact_name' },
  { title: '联系电话', dataIndex: 'contact_phone', key: 'contact_phone', width: 140 },
]

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<ActivityItem | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    activityApi
      .getActivity(Number(id))
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <PageContainer title="活动详情" description={`活动 ID：${id ?? '-'}`}>
      <Card variant="borderless" loading={loading}>
        <Descriptions column={2} title="活动信息">
          <Descriptions.Item label="活动标题">{detail?.title || '-'}</Descriptions.Item>
          <Descriptions.Item label="活动编号">{detail?.code || '-'}</Descriptions.Item>
          <Descriptions.Item label="英文标题">{detail?.title_en || '-'}</Descriptions.Item>
          <Descriptions.Item label="活动类型">
            {detail ? (typeText[detail.activity_type] ?? '—') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="活动状态">
            {detail ? <Tag>{statusText[detail.status] ?? '—'}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="活动地址">{detail?.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {formatDateTime(detail?.start_date && detail.start_date * 1000)}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {formatDateTime(detail?.end_date && detail.end_date * 1000)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card variant="borderless" title="参与机构" style={{ marginTop: 16 }}>
        <Table<ActivityInstitutionConfig>
          rowKey="institution_id"
          size="small"
          pagination={false}
          columns={institutionColumns}
          dataSource={detail?.institutions ?? []}
        />
      </Card>
    </PageContainer>
  )
}
