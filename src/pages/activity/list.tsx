/**
 * 活动管理 - 活动列表
 * 视觉对齐设计稿：顶部统计 + 筛选 + 状态 Tabs + 活动表格
 * 当前为 mock 数据，后端就绪后替换为 activityApi.getActivityList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Dropdown, Input, Select, Table, Col, Row, Tag, Divider } from 'antd'
import type { MenuProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ActivityItem } from '@/api/modules/activity';
import { mockInstitutions } from '@/pages/institution/list'
import './list.less'

/** 活动类型：1社区活动 / 2康养旅游 / 3健康课堂 / 4健康活动 */

const statusText: Record<number, string> = {
  1: '待发布',
  2: '报名中',
  3: '已结束',
  9: '已取消',
}

const typeText: Record<number, {text: string, color: string}> = {
  1: {
    text: '社区活动',
    color: 'geekblue'
  },
  2: {
    text: '康养旅游',
    color: 'purple'
  },
  3: {
    text: '健康课堂',
    color: 'cyan'
  },
  4: {
    text: '健康活动',
    color: 'lime'
  }
}

const initialActivities: any[] = [
  {
    id: '1',
    code: 'HD20260807001',
    title: '秋日康养游园会',
    type: 1,
    institutionCount: 3,
    signupCount: 86,
    capacity: 120,
    status: 1,
    activityTime: '09-20 09:00',
  },
  {
    id: '2',
    code: 'HD20260807002',
    title: '西湖无障碍一日游',
    type: 2,
    institutionCount: 2,
    signupCount: 30,
    capacity: 30,
    status: 2,
    activityTime: '08-18 08:00',
  },
  {
    id: '3',
    code: 'HD20260807003',
    title: '失能长者照护课堂',
    type: 3,
    institutionCount: 5,
    signupCount: 42,
    capacity: 80,
    status: 3,
    activityTime: '08-25 14:00',
  },
  {
    id: '4',
    code: 'HD20260806018',
    title: '重阳节健康义诊',
    type: 4,
    institutionCount: 4,
    signupCount: null,
    capacity: 0,
    status: 9,
    activityTime: '10-08 09:00',
  },
  {
    id: '5',
    code: 'HD20260806011',
    title: '温泉康养两日游',
    type: 1,
    institutionCount: 2,
    signupCount: 0,
    capacity: 24,
    status: 1,
    activityTime: '09-12 07:30',
  },
  {
    id: '6',
    code: 'HD20260805096',
    title: '夏季防暑讲座',
    type: 4,
    institutionCount: 3,
    signupCount: 76,
    capacity: 100,
    status: 2,
    activityTime: '07-15 14:00',
  },
]

interface ActivityFilters {
  keyword: string
  type: number | null
  institution_id: number | null
  status: number | null
}

export default function ActivityList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [data, setData] = useState(initialActivities)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<number | null>(null)
  const [institution, setInstitution] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [applied, setApplied] = useState<ActivityFilters>({
    keyword: '',
    type: null,
    institution_id: null,
    status: null,
  })
  const [page, setPage] = useState(1)
  const pageSize = 10

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.title.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase())
      const typeHit = !applied.type || item.type === applied.type
      const statusHit = !applied.status || item.status === applied.status
      const institutionHit = !applied.institution_id || (item.institutions.map(i => i.institution_id)).includes(applied.institution_id)
      return keywordHit && typeHit && statusHit && institutionHit
    })
  }, [applied, data])

  const metrics = [
    { key: 0, label: '全部活动', value: 46, badge: '本月新增 8 个', tone: 'primary' },
    { key: 2, label: '报名中', value: 12, badge: '今日新增报名 36 人', tone: 'info' },
    { key: 1, label: '待发布', value: 3, badge: '1 个待完善承接机构',tone: 'danger' },
    { key: 3, label: '已结束', value: 5, badge: '3 个活动已经结束', tone: 'warning' },
  ]

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), type, institution_id: institution, status })
  }

  const handleReset = () => {
    setKeyword('')
    setType(null)
    setInstitution(null)
    setStatus(null)
    setApplied({ keyword: '', type: null, institution_id: null, status: null })
  }

  const handlePublish = (record: ActivityItem) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === record.id ? { ...item, status: 2 } : item,
      ),
    )
    message.success(`「${record.title}」已发布`)
  }

  /** 取消活动（报名中 → 已取消）：危险操作，二次确认 */
  const handleCancelActivity = (record: ActivityItem) => {
    modal.confirm({
      title: `确认取消活动「${record.title}」？`,
      content: '取消后用户端将立即停止报名，已报名用户的报名信息保留但活动标记为已取消。',
      okText: '确认取消',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: () => {
        setData((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, status: 9 } : item)),
        )
        message.success(`「${record.title}」已取消`)
      },
    })
  }

  /** 重新发布（已取消 → 报名中） */
  const handleRepublish = (record: ActivityItem) => {
    setData((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, status: 2 } : item)),
    )
    message.success(`「${record.title}」已重新发布，报名通道已开启`)
  }

  /** 删除活动：危险操作，二次确认 */
  const handleDelete = (record: ActivityItem) => {
    modal.confirm({
      title: `确认删除活动「${record.title}」？`,
      content: '删除后该活动后，所有的报名信息将被清空',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        message.success(`已删除「${record.title}」（mock）`)
      },
    })
  }

  const columns = useMemo<ColumnsType<ActivityItem>>(
    () => [
      {
        title: '活动 / 编号',
        key: 'title',
        render: (_, record) => (
          <div className="activity-name">
            <strong>{record.title}</strong>
            <span>{record.code}</span>
          </div>
        ),
      },
      {
        title: '活动类型',
        dataIndex: 'type',
        key: 'type',
        width: 110,
        render: (v) => <Tag color={typeText[v]?.color} variant='outlined'>{typeText[v]?.text}</Tag>
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
        render: (value: number) => (
          <span className={`activity-status activity-status--${value}`}>{statusText[value]}</span>
        ),
      },
      // {
      //   title: '发布状态',
      //   dataIndex: 'publishStatus',
      //   key: 'publishStatus',
      //   width: 100,
      //   render: (value: PublishStatus) => (
      //     <span className={`publish-status publish-status--${value}`}>{publishText[value]}</span>
      //   ),
      // },
      {
        title: '活动时间',
        dataIndex: 'activityTime',
        key: 'activityTime',
        width: 120,
      },
      {
        title: '操作',
        key: 'action',
        width: 190,
        render: (_, record) => {
          /* 三段式操作列：状态主操作 + 编辑（恒有）+ 更多（低频/危险操作收拢）
             - 待发布(1)：发布；报名中(2)/已结束(3)：报名查询；已取消(9)：重新发布
             - 取消、删除放入「更多」，均需二次确认 */
          const primary =
            record.status === 1
              ? { label: '发布', onClick: () => handlePublish(record) }
              : record.status === 9
                ? { label: '重新发布', onClick: () => handleRepublish(record) }
                : { label: '报名查询', onClick: () => navigate(`/activity/signups/${record.id}`) }

          const moreItems: MenuProps['items'] = [
            ...(record.status === 2 ? [{ key: 'cancel', label: '取消活动', danger: true }] : []),
            { key: 'delete', label: '删除', danger: true },
          ]
          const onMoreClick: MenuProps['onClick'] = ({ key }) => {
            if (key === 'cancel') handleCancelActivity(record)
            if (key === 'delete') handleDelete(record)
          }

          return (
            <div className="activity-actions">
              <Button type="link" size="small" onClick={primary.onClick}>
                {primary.label}
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/activity/detail/${record.id}`)}
              >
                编辑
              </Button>
              <Divider vertical />
              <Dropdown menu={{ items: moreItems, onClick: onMoreClick }} trigger={['click']}>
                <Button type="link" size="small">
                  更多
                  <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            </div>
          )
        },
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
            placeholder="活动名称或活动编号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={type}
            onChange={setType}
            options={Object.keys(typeText).map(v => ({
              label: typeText[v].text,
              value: v
            }))}
            allowClear
            placeholder="活动类型"
          />
          <Select
            value={institution}
            onChange={setInstitution}
            options={mockInstitutions.map(v => ({
              label: v.name,
              value: v.id
            }))}
            allowClear
            placeholder="活动承接机构"
          />
          <Select
            value={status}
            onChange={setStatus}
            options={Object.keys(statusText).map(v => ({
              label: statusText[v],
              value: v
            }))}
            allowClear
            placeholder="活动状态"
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
              {/* <span  className="list-card__header__tips">共 46 场活动 · 点击「查看」可进入报名查询</span> */}
            </div>
            {/* <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            /> */}
          </div>
          <Table<ActivityItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            pagination={{
              current: page,
              pageSize,
              total: filteredData.length,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
