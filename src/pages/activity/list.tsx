/**
 * 活动管理 - 活动列表
 * 视觉对齐设计稿：顶部统计 + 筛选 + 状态 Tabs + 活动表格
 * 数据来源：activityApi.getActivities（分页 + 类型/机构/状态/关键字筛选）
 * 字段以后端实际契约为准：类型出参 activity_type、筛选入参 type、时间 start_date/end_date、机构 institutions[]
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Dropdown, Input, Select, Table, Col, Row, Tag, Divider } from 'antd'
import type { MenuProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { activityApi } from '@/api'
import type { ActivityItem } from '@/api/modules/activity'
import { mockInstitutions } from '@/pages/institution/list'
import { formatDateTime } from '@/utils'
import './list.less'

/** 活动类型：1社区活动 / 2康养旅游 / 3健康课堂 / 4健康活动 / 5其他 */

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
  },
  5: {
    text: '其他',
    color: 'default'
  }
}

interface ActivityFilters {
  keyword: string
  type: number | null
  institution_id: number | null
  status: number | null
}

const emptyFilters: ActivityFilters = {
  keyword: '',
  type: null,
  institution_id: null,
  status: null,
}

export default function ActivityList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [data, setData] = useState<ActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<number | null>(null)
  const [institution, setInstitution] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [applied, setApplied] = useState<ActivityFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const pageSize = 10

  /** 拉取活动列表（筛选条件以后端查询参数下发） */
  const fetchList = useCallback(
    async (targetPage = page) => {
      setLoading(true)
      try {
        const result = await activityApi.getActivities({
          page: targetPage,
          page_size: pageSize,
          keyword: applied.keyword || undefined,
          // 筛选入参名为 type（后端约定），非 activity_type
          type: applied.type ?? undefined,
          institution_id: applied.institution_id ?? undefined,
          status: applied.status ?? undefined,
        })
        setData(result.list ?? [])
        setTotal(result.total ?? 0)
      } catch {
        // 错误提示由 request 拦截器统一处理
        setData([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [applied, page],
  )

  useEffect(() => {
    void fetchList(page)
  }, [fetchList, page])

  /** 顶部统计：活动总数与各状态数量（基于当前列表数据汇总） */
  const metrics = useMemo(() => {
    const countBy = (target: number) => data.filter((item) => item.status === target).length
    return [
      { key: 0, label: '全部活动', value: total, badge: '按当前筛选条件统计', tone: 'primary' },
      { key: 2, label: '报名中', value: countBy(2), badge: '本页报名中活动', tone: 'info' },
      { key: 1, label: '待发布', value: countBy(1), badge: '本页待发布活动', tone: 'danger' },
      { key: 3, label: '已结束', value: countBy(3), badge: '本页已结束活动', tone: 'warning' },
    ]
  }, [data, total])

  const applyFilters = () => {
    setPage(1)
    setApplied({ keyword: keyword.trim(), type, institution_id: institution, status })
  }

  const handleReset = () => {
    setKeyword('')
    setType(null)
    setInstitution(null)
    setStatus(null)
    setPage(1)
    setApplied(emptyFilters)
  }

  /** 发布活动（待发布 → 报名中） */
  const handlePublish = async (record: ActivityItem) => {
    try {
      await activityApi.updateActivityStatus(Number(record.id), 2)
      message.success(`「${record.title}」已发布`)
      void fetchList(page)
    } catch {
      /* 拦截器已提示 */
    }
  }

  /** 取消活动（报名中 → 已取消）：危险操作，二次确认 */
  const handleCancelActivity = (record: ActivityItem) => {
    modal.confirm({
      title: `确认取消活动「${record.title}」？`,
      content: '取消后用户端将立即停止报名，已报名用户的报名信息保留但活动标记为已取消。',
      okText: '确认取消',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: async () => {
        try {
          await activityApi.updateActivityStatus(Number(record.id), 9)
          message.success(`「${record.title}」已取消`)
        } catch {
          /* 拦截器已提示 */
        }
        void fetchList(page)
      },
    })
  }

  /** 重新发布（已取消 → 报名中） */
  const handleRepublish = async (record: ActivityItem) => {
    try {
      await activityApi.updateActivityStatus(Number(record.id), 2)
      message.success(`「${record.title}」已重新发布，报名通道已开启`)
      void fetchList(page)
    } catch {
      /* 拦截器已提示 */
    }
  }

  /** 删除活动：危险操作，二次确认 */
  const handleDelete = (record: ActivityItem) => {
    modal.confirm({
      title: `确认删除活动「${record.title}」？`,
      content: '删除后该活动后，所有的报名信息将被清空',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await activityApi.deleteActivity(Number(record.id))
          message.success(`已删除「${record.title}」`)
        } catch {
          /* 拦截器已提示 */
        }
        void fetchList(page)
      },
    })
  }

  const columns = useMemo<ColumnsType<ActivityItem>>(
    () => [
      {
        title: '活动名称',
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
        dataIndex: 'activity_type',
        key: 'activity_type',
        width: 110,
        render: (v: number) => <Tag color={typeText[v]?.color} variant='outlined'>{typeText[v]?.text ?? '—'}</Tag>
      },
      {
        title: '承接机构',
        key: 'institutions',
        width: 120,
        render: (_, record) => `${record.institutions?.length ?? 0} 家机构`,
      },
      {
        title: '承接名额',
        key: 'capacity',
        width: 120,
        // 总名额由各参与机构名额上限汇总
        render: (_, record) =>
          `${(record.institutions ?? []).reduce((sum, item) => sum + (item.max_participants || 0), 0)} 人`,
      },
      {
        title: '活动状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => (
          <span className={`activity-status activity-status--${value}`}>{statusText[value] ?? '—'}</span>
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
        key: 'activityTime',
        width: 140,
        // 后端返回 UTC 秒，需 ×1000 交给 dayjs
        render: (_, record) => formatDateTime(record.start_date && record.start_date * 1000, 'MM-DD HH:mm'),
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
              ? { label: '发布活动', onClick: () => handlePublish(record) }
              : record.status === 9
                ? { label: '重新发布', onClick: () => handleRepublish(record) }
                : { label: '报名查询', onClick: () => navigate(`/activity/signups/${record.id}`) }

          const moreItems: MenuProps['items'] = [
            ...(record.status === 2 ? [{ key: 'cancel', label: '取消活动', danger: true }] : []),
            { key: 'delete', label: '删除活动', danger: true },
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
                编辑活动
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, fetchList],
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
            options={Object.entries(typeText).map(([key, item]) => ({
              label: item.text,
              value: Number(key)
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
            options={Object.entries(statusText).map(([key, label]) => ({
              label,
              value: Number(key)
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
            loading={loading}
            columns={columns}
            dataSource={data}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
