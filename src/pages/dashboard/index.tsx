/**
 * 运营首页 - 数据总览
 * 布局：经营指标卡（服务订单 / 建档会员 / 待办预警 / 活动报名）
 *       + 待办事项 / 近 7 日订单趋势 + 近期订单表格
 * 数据来源：dashboardApi.getDashboardOverview（指标卡 + 待办）
 *          dashboardApi.getServiceTrend（近 14 日按日趋势，后 7 日展示、前 7 日计算环比）
 *          orderApi.getOrders（近期订单，取第 1 页前 8 条）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Col, Row } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { ArrowUpOutlined, BarChartOutlined, RightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { dashboardApi, orderApi } from '@/api'
import type {
  DashboardOverview,
  DashboardTodo,
  RecentOrder,
  TrendStat,
} from '@/api/modules/dashboard'
import { formatDateTime } from '@/utils'
import './index.less'

/** 色调：与 variables.less 中 metric-card / todo / pill 的修饰类一一对应 */
type Tone = 'success' | 'info' | 'warning' | 'danger'

/** 订单状态（swagger OrderDetail.order_status）：1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款 */
const statusText: Record<number, { text: string; tone: string }> = {
  1: { text: '待支付', tone: 'warning' },
  2: { text: '待确认', tone: 'info' },
  3: { text: '生效中', tone: 'info' },
  4: { text: '已完成', tone: 'success' },
  5: { text: '已取消', tone: 'cancel' },
  6: { text: '已退款', tone: 'danger' },
}

/** 待办项图标（设计稿为单色字块） */
const todoIconText: Record<string, string> = {
  refund: '退',
  institution: '商',
  content: '内',
  warn: '警',
}

interface MetricCard {
  key: string
  label: string
  value?: number
  badge: string
  tone: Tone
  icon: ReactNode
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [trend, setTrend] = useState<TrendStat | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  /** 指标总览（§11.1）：scope=all 取平台全量 */
  const fetchOverview = useCallback(async () => {
    try {
      const res = await dashboardApi.getDashboardOverview({ scope: 'all' })
      setOverview(res)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setOverview(null)
    }
  }, [])

  /** 订单趋势（§11.2）：拉近 14 日按日数据，后 7 日展示、与前 7 日环比 */
  const fetchTrend = useCallback(async () => {
    try {
      const end = dayjs().endOf('day').unix()
      const start = dayjs().subtract(13, 'day').startOf('day').unix()
      const res = await dashboardApi.getServiceTrend({ start, end, granularity: 'day' })
      const list = res.list ?? []
      const current = list.slice(-7)
      const previous = list.slice(0, 7)
      const currentTotal = current.reduce((sum, item) => sum + (item.order_count ?? 0), 0)
      const previousTotal = previous.reduce((sum, item) => sum + (item.order_count ?? 0), 0)
      setTrend({
        totalOrders: currentTotal,
        totalRate:
          previousTotal > 0
            ? Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10
            : null,
        daily: current.map((item, index) => ({
          label:
            index === current.length - 1 && dayjs(item.date).isSame(dayjs(), 'day')
              ? '今日'
              : dayjs(item.date).format('M/D'),
          value: item.order_count ?? 0,
        })),
      })
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setTrend(null)
    }
  }, [])

  /** 近期订单：取订单列表第 1 页前 8 条（金额为分，展示转元） */
  const fetchRecentOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await orderApi.getOrders({ page: 1, page_size: 8 })
      setRecentOrders(
        (res.list ?? []).map((item) => ({
          id: item.id,
          orderNo: item.order_no,
          bizType: '上门服务',
          institution: item.institution_id ? `机构 ${item.institution_id}` : '—',
          customer: item.contact_name || '—',
          amount: (item.paid_amount ?? 0) / 100,
          orderTime: item.created_at ? formatDateTime(item.created_at * 1000) : '—',
          status: item.order_status,
        })),
      )
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setRecentOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchOverview()
    void fetchTrend()
    void fetchRecentOrders()
  }, [fetchOverview, fetchTrend, fetchRecentOrders])

  /** 经营指标卡配置（顺序与设计稿一致）；数据未返回时展示 - */
  const metricCards: MetricCard[] = [
    {
      key: 'order',
      label: '服务订单',
      value: overview?.service_order_count,
      badge: overview ? `服务预约 ${overview.service_appointment_count} 单` : '-',
      tone: 'success',
      icon: <BarChartOutlined />,
    },
    {
      key: 'member',
      label: '建档会员',
      value: overview?.member_registered,
      badge: overview ? `已实名 ${overview.member_verified} 人` : '-',
      tone: 'info',
      icon: <BarChartOutlined />,
    },
    {
      key: 'warn',
      label: '待办预警',
      value: overview ? overview.warn_pending + overview.warn_processing : undefined,
      badge: overview ? `待处理 ${overview.warn_pending} · 处理中 ${overview.warn_processing}` : '-',
      tone: 'warning',
      icon: <BarChartOutlined />,
    },
    {
      key: 'signup',
      label: '活动报名',
      value: overview?.activity_registered,
      badge: overview ? `服务完成率 ${overview.service_completion_rate}%` : '-',
      tone: 'danger',
      icon: <BarChartOutlined />,
    },
  ]

  /** 待办事项：由指标总览的预警数据组装（暂无退款 / 机构待办统计接口） */
  const todos = useMemo<DashboardTodo[]>(() => {
    if (!overview) return []
    return [
      {
        key: 'warn',
        title: '待处理预警',
        desc: '健康预警等待运营跟进处置',
        count: overview.warn_pending,
        unit: '条',
      },
      {
        key: 'warn',
        title: '处理中预警',
        desc: '已介入、尚未闭环的预警',
        count: overview.warn_processing,
        unit: '条',
      },
    ]
  }, [overview])

  const columns = useMemo<ColumnsType<RecentOrder>>(
    () => [
      { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo' },
      { title: '业务类型', dataIndex: 'bizType', key: 'bizType' },
      { title: '服务机构', dataIndex: 'institution', key: 'institution' },
      { title: '用户', dataIndex: 'customer', key: 'customer' },
      {
        title: '实付金额',
        dataIndex: 'amount',
        key: 'amount',
        render: (value: number) =>
          `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime' },
      {
        title: '订单状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: number) => (
          <span className={`status-btn status--${statusText[status]?.tone ?? 'info'}`}>
            {statusText[status]?.text ?? status}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 90,
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            className="table-link-btn"
            onClick={() => navigate(`/order/detail/${record.id}`)}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [navigate],
  )

  const daily = trend?.daily ?? []
  const maxTrend = Math.max(...daily.map((d) => d.value), 1)

  return (
    <PageContainer fixed title="运营首页" description="欢迎回来，以下是今日平台经营概览">
      {/* 经营指标卡 */}
      <Row gutter={[16, 16]}>
        {metricCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.key}>
            <Card className="metric-card" variant="borderless">
              <div className="metric-card__head">
                <span className="metric-card__label">{card.label}</span>
                <span className={`metric-card__icon status--${card.tone}`}>
                  {card.icon}
                </span>
              </div>
              <div className="metric-card__value">{card.value ?? '-'}</div>
              <span className={`metric-card__note status--${card.tone}`}>
                {card.badge}
              </span>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 待办事项 + 近 7 日订单趋势 */}
      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} lg={12}>
          <Card
            variant="borderless"
            className="dashboard-card"
          >
            <div className="dashboard-todo">
              <div className='dashboard__header'>
                <span className="dashboard__title">待办事项</span>
                <Button
                  type="link"
                  className="dashboard-card__link"
                  onClick={() => navigate('/refund')}
                >
                  查看全部 <RightOutlined />
                </Button>
              </div>
              <div className='dashboard-todo__list'>
                {todos.map((item, index) => (
                  <div className="dashboard-todo__item" key={`${item.key}-${index}`}>
                    <span className={`dashboard-todo__icon dashboard-todo__icon--${item.key}`}>
                      {todoIconText[item.key] ?? '待'}
                    </span>
                    <div className="dashboard-todo__main">
                      <div className="dashboard-todo__title">{item.title}</div>
                      {item.desc && <div className="dashboard-todo__desc">{item.desc}</div>}
                    </div>
                    {item.count !== undefined && (
                      <span className={`dashboard-todo__count dashboard-todo__count--${item.key}`}>
                        {item.count} {item.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            variant="borderless"
            className="dashboard-card"
          >
            <div className="dashboard-trend-container">
              <div className='dashboard__header'>
                <span className="dashboard__title">近 7 日订单趋势</span>
                <span className="dashboard-trend__summary">
                  累计 {trend?.totalOrders ?? '-'} 单
                  <ArrowUpOutlined className="dashboard-trend__summary-arrow" />
                  {trend?.totalRate != null ? `${trend.totalRate}%` : '-'}
                </span>
              </div>
              <div className="dashboard-trend">
                {daily.map((point, index) => (
                  <div className="dashboard-trend__col" key={point.label}>
                    <div className="dashboard-trend__plot">
                      <span className="dashboard-trend__num">{point.value}</span>
                      <div
                        className={`dashboard-trend__bar${index === daily.length - 1 ? ' dashboard-trend__bar--active' : ''}`}
                        style={{ height: `${(point.value / maxTrend) * 100}%` }}
                      />
                    </div>
                    <span className="dashboard-trend__day">{point.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 近期订单 */}
          <Card
            variant="borderless"
            className="list-card list-card--fill"
          >
            <div className="list-card__header">
              <span className='list-card__header__title'>近期订单</span>
              <Button
                type="link"
                className="list-card__header__link"
                onClick={() => navigate('/order')}
              >
                进入订单中心 <RightOutlined />
              </Button>
            </div>
            <FillTable
              rowKey="orderNo"
              columns={columns}
              dataSource={recentOrders}
              loading={ordersLoading}
              pagination={false}
              size="small"
            />
          </Card>
    </PageContainer>
  )
}
