/**
 * 运营首页 - 数据总览
 * 布局：经营指标卡（今日订单 / 运营机构 / 待办事项 / 今日活动报名）
 *       + 待办事项 / 近 7 日订单趋势 + 近期订单表格
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据；接口就绪后接入 dashboardApi（§11）
 */
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Col, Row } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { ArrowUpOutlined, BarChartOutlined, RightOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import type {
  DashboardTodo,
  OverviewData,
  RecentOrder,
  TrendStat,
} from '@/api/modules/dashboard'
import './index.less'

/** 色调：与 variables.less 中 metric-card / todo / pill 的修饰类一一对应 */
type Tone = 'success' | 'info' | 'warning' | 'danger'

/** 订单状态 -> 1=待服务 2=已确认 3=退款审核 4=已完成  */
const statusText: Record<number, any> = {
  1: {text: '待服务', tone: 'warning'},
  2: {text: '已确认', tone: 'info'},
  3: {text: '退款审核', tone: 'danger'},
  4: {text: '已完成', tone: 'success'},
}

/** 待办项图标（设计稿为单色字块：退 / 商 / 内） */
const todoIconText: Record<string, string> = {
  refund: '退',
  institution: '商',
  content: '内',
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
  /** 接口未对接：各区块保持空态（指标卡展示 -，列表/趋势为空） */
  const [overview] = useState<OverviewData | null>(null)
  const [todos] = useState<DashboardTodo[]>([])
  const [recentOrders] = useState<RecentOrder[]>([])
  const [trend] = useState<TrendStat | null>(null)

  /** 经营指标卡配置（顺序与设计稿一致）；接口未对接时副标题展示 - */
  const metricCards: MetricCard[] = [
    {
      key: 'order',
      label: '今日订单',
      value: overview?.todayOrderCount,
      badge: overview ? `+${overview.todayOrderRate}% 较昨日` : '-',
      tone: 'success',
      icon: <BarChartOutlined />,
    },
    {
      key: 'institution',
      label: '运营机构',
      value: overview?.totalInstitution,
      badge: overview ? `${overview.pendingInstitutionCount} 家待完善资料` : '-',
      tone: 'info',
      icon: <BarChartOutlined />,
    },
    {
      key: 'todo',
      label: '待办事项',
      value: overview?.pendingTodoCount,
      badge: overview ? `含 ${overview.pendingRefundCount} 笔退款审核` : '-',
      tone: 'warning',
      icon: <BarChartOutlined />,
    },
    {
      key: 'signup',
      label: '今日活动报名',
      value: overview?.activitySignupCount,
      badge: overview ? `+${overview.activitySignupRate}% 较昨日` : '-',
      tone: 'danger',
      icon: <BarChartOutlined />,
    },
  ]

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
          <span className={`status-btn status--${statusText[status].tone}`}>
            {statusText[status].text}
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
            onClick={() => navigate(`/order/detail/${record.orderNo}`)}
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
      <ApiPendingAlert feature="运营首页数据总览" />
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
                {todos.map((item) => (
                  <div className="dashboard-todo__item" key={item.key}>
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
                  {trend ? `${trend.totalRate}%` : '-'}
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
              pagination={false}
              size="small"
            />
          </Card>
    </PageContainer>
  )
}
