/**
 * 活动管理 - 活动列表
 * 视觉对齐设计稿：顶部统计 + 筛选 + 状态 Tabs + 活动表格
 * 当前为 mock 数据，后端就绪后替换为 activityApi.getActivityList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Radio, Select, Table, Col, Row } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ActivityItem, ActivityStatus, PublishStatus } from '@/api/modules/activity'
import './list.less'

const statusText: Record<ActivityStatus, string> = {
  draft: '草稿',
  pending: '待发布',
  signup: '报名中',
  ongoing: '进行中',
  full: '已满员',
  finished: '已结束',
}

const publishText: Record<PublishStatus, string> = {
  published: '已发布',
  unpublished: '未发布',
  pending: '待发布',
  offline: '已下架',
}

const initialActivities: ActivityItem[] = [
  {
    id: '1',
    code: 'HD20260807001',
    name: '秋日康养游园会',
    type: '社区活动',
    institutionCount: 3,
    signupCount: 86,
    capacity: 120,
    status: 'signup',
    publishStatus: 'published',
    activityTime: '09-20 09:00',
  },
  {
    id: '2',
    code: 'HD20260807002',
    name: '西湖无障碍一日游',
    type: '康养旅游',
    institutionCount: 2,
    signupCount: 30,
    capacity: 30,
    status: 'full',
    publishStatus: 'published',
    activityTime: '08-18 08:00',
  },
  {
    id: '3',
    code: 'HD20260807003',
    name: '失能长者照护课堂',
    type: '健康课堂',
    institutionCount: 5,
    signupCount: 42,
    capacity: 80,
    status: 'signup',
    publishStatus: 'published',
    activityTime: '08-25 14:00',
  },
  {
    id: '4',
    code: 'HD20260806018',
    name: '重阳节健康义诊',
    type: '健康活动',
    institutionCount: 4,
    signupCount: null,
    capacity: 0,
    status: 'draft',
    publishStatus: 'unpublished',
    activityTime: '10-08 09:00',
  },
  {
    id: '5',
    code: 'HD20260806011',
    name: '温泉康养两日游',
    type: '康养旅游',
    institutionCount: 2,
    signupCount: 0,
    capacity: 24,
    status: 'pending',
    publishStatus: 'pending',
    activityTime: '09-12 07:30',
  },
  {
    id: '6',
    code: 'HD20260805096',
    name: '夏季防暑讲座',
    type: '健康课堂',
    institutionCount: 3,
    signupCount: 76,
    capacity: 100,
    status: 'finished',
    publishStatus: 'offline',
    activityTime: '07-15 14:00',
  },
]

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿 3' },
  { key: 'pending', label: '待发布 3' },
  { key: 'signup', label: '报名中 12' },
  { key: 'ongoing', label: '进行中 5' },
  { key: 'finished', label: '已结束 23' },
]

interface ActivityFilters {
  keyword: string
  type: string
  institution: string
  status: ActivityStatus | 'all'
  time: string
}

export default function ActivityList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [data, setData] = useState(initialActivities)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('all')
  const [institution, setInstitution] = useState('all')
  const [status, setStatus] = useState<ActivityStatus | 'all'>('all')
  const [time, setTime] = useState('')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<ActivityFilters>({
    keyword: '',
    type: 'all',
    institution: 'all',
    status: 'all',
    time: '',
  })

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase())
      const typeHit = applied.type === 'all' || item.type === applied.type
      const statusHit = applied.status === 'all' || item.status === applied.status
      const tabHit =
        tab === 'all' ||
        (tab === 'signup' && (item.status === 'signup' || item.status === 'full')) ||
        item.status === tab
      return keywordHit && typeHit && statusHit && tabHit
    })
  }, [applied, data, tab])

  const metrics = [
    { key: 'all', label: '全部活动', value: 46, badge: '本月新增 8 个', tone: 'primary' },
    { key: 'signup', label: '报名中', value: 12, badge: '今日新增报名 36 人', tone: 'info' },
    { key: 'ongoing', label: '进行中', value: 5, badge: '3 个活动今日开始', tone: 'warning' },
    { key: 'pending', label: '待发布', value: 3, badge: '1 个待完善承接机构',tone: 'danger' },
  ]

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), type, institution, status, time })
  }

  const handleReset = () => {
    setKeyword('')
    setType('all')
    setInstitution('all')
    setStatus('all')
    setTime('')
    setApplied({ keyword: '', type: 'all', institution: 'all', status: 'all', time: '' })
  }

  const handlePublish = (record: ActivityItem) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === record.id ? { ...item, status: 'signup', publishStatus: 'published' } : item,
      ),
    )
    message.success(`「${record.name}」已发布`)
  }

  const columns = useMemo<ColumnsType<ActivityItem>>(
    () => [
      {
        title: '活动 / 编号',
        key: 'name',
        render: (_, record) => (
          <div className="activity-name">
            <strong>{record.name}</strong>
            <span>{record.code}</span>
          </div>
        ),
      },
      {
        title: '活动类型',
        dataIndex: 'type',
        key: 'type',
        width: 110,
      },
      {
        title: '承接机构',
        dataIndex: 'institutionCount',
        key: 'institutionCount',
        width: 100,
        render: (value: number) => `${value} 家机构`,
      },
      {
        title: '报名情况',
        key: 'signup',
        width: 120,
        render: (_, record) =>
          record.signupCount === null ? '—' : `${record.signupCount} / ${record.capacity} 人`,
      },
      {
        title: '活动状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: ActivityStatus) => (
          <span className={`activity-status activity-status--${value}`}>{statusText[value]}</span>
        ),
      },
      {
        title: '发布状态',
        dataIndex: 'publishStatus',
        key: 'publishStatus',
        width: 100,
        render: (value: PublishStatus) => (
          <span className={`publish-status publish-status--${value}`}>{publishText[value]}</span>
        ),
      },
      {
        title: '活动时间',
        dataIndex: 'activityTime',
        key: 'activityTime',
        width: 120,
      },
      {
        title: '操作',
        key: 'action',
        width: 130,
        render: (_, record) => (
          <div className="activity-actions">
            {(record.status === 'signup' ||
              record.status === 'ongoing' ||
              record.status === 'full' ||
              record.status === 'finished' ||
              record.status === 'pending') && (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/activity/signups/${record.id}`)}
              >
                报名查询
              </Button>
            )}
            {(record.status === 'signup' || record.status === 'ongoing' || record.status === 'draft') && (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/activity/detail/${record.id}`)}
              >
                编辑
              </Button>
            )}
            {record.status === 'pending' && (
              <Button type="link" size="small" onClick={() => handlePublish(record)}>
                发布
              </Button>
            )}
          </div>
        ),
      },
    ],
    [navigate],
  )

  return (
    <PageContainer
      title="活动管理"
      description="平台统一创建活动与康养旅游，选择可承接机构并管理报名与发布"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/activity/create')}>
          新建活动
        </Button>
      }
    >
      <div className="activity-list">
        <Row gutter={[16, 16]}>
          {metrics.map((metric) => (
            <Col xs={24} sm={12} lg={6} key={metric.key}>
              <Card variant="borderless" className="metric-card">
                <div className="metric-card__head">
                  <span className="metric-card__label">{metric.label}</span>
                  <i className={`metric-card__icon metric-card__icon--${metric.tone} metric-card__icon--round`}>
                    <BarChartOutlined />
                  </i>
                </div>
                <div className="metric-card__value">{metric.value}</div>
                <span className={`metric-card__note metric-card__note--${metric.tone}`}>
                  {metric.badge}
                </span>
              </Card>
            </Col>
          ))}
        </Row>


        <Card variant="borderless" className="filter-bar activity-list__filter">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="活动名称或活动编号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={type}
            onChange={setType}
            options={[
              { label: '全部活动类型', value: 'all' },
              { label: '社区活动', value: '社区活动' },
              { label: '康养旅游', value: '康养旅游' },
              { label: '健康课堂', value: '健康课堂' },
              { label: '健康活动', value: '健康活动' },
            ]}
          />
          <Select
            value={institution}
            onChange={setInstitution}
            options={[
              { label: '全部承接机构', value: 'all' },
              { label: '幸福里健康驿站', value: '幸福里健康驿站' },
              { label: '康乐护理院', value: '康乐护理院' },
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: '全部活动状态', value: 'all' },
              { label: '草稿', value: 'draft' },
              { label: '待发布', value: 'pending' },
              { label: '报名中', value: 'signup' },
              { label: '进行中', value: 'ongoing' },
              { label: '已满员', value: 'full' },
              { label: '已结束', value: 'finished' },
            ]}
          />
          <Input
            allowClear
            placeholder="活动时间"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">活动列表</span>
              <span  className="list-card__header__tips">共 46 场活动 · 点击「查看」可进入报名查询</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<ActivityItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            pagination={{ total: 46, pageSize: 6, current: 1, showSizeChanger: false }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
