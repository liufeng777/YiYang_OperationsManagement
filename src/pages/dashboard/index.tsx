/**
 * 运营首页 - 数据总览
 * 布局：经营指标卡（今日订单 / 运营机构 / 待办事项 / 今日活动报名）
 *       + 待办事项 / 近 7 日订单趋势 + 近期订单表格
 * 视觉严格对齐设计稿：docs/assets/design-reference.png
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Col, Row, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowUpOutlined, BarChartOutlined, RightOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import type {
  DashboardTodo,
  OverviewData,
  RecentOrder,
  TrendStat,
} from '@/api/modules/dashboard'
import './index.less'

/** 色调：与 variables.less 中 metric-card / todo / pill 的修饰类一一对应 */
type Tone = 'primary' | 'info' | 'warning' | 'danger'

/** 订单状态 -> 文案（样式见 .status-pill--{status}） */
const statusText: Record<RecentOrder['status'], string> = {
  pending: '待服务',
  confirmed: '已确认',
  refunding: '退款审核',
  finished: '已完成',
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
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [todos, setTodos] = useState<DashboardTodo[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [trend, setTrend] = useState<TrendStat | null>(null)

  useEffect(() => {
    // TODO: 后端就绪后替换为真实接口：
    // getOverview().then(setOverview)
    // getTodoList().then(setTodos)
    // getRecentOrders().then(setRecentOrders)
    // getTrendStat().then(setTrend)
    setOverview({
      todayOrderCount: 128,
      todayOrderRate: 12.6,
      activitySignupCount: 58,
      activitySignupRate: 8.2,
      pendingRefundCount: 6,
      pendingTodoCount: 18,
      totalInstitution: 36,
      pendingInstitutionCount: 3,
    })
    setTodos([
      { key: 'refund', title: '退款待审核', desc: '用户退款由平台最终审批', count: 6, unit: '笔' },
      { key: 'institution', title: '机构资料待完善', desc: '影响用户定位与服务展示', count: 3, unit: '家' },
      { key: 'content', title: '内容待发布', desc: '活动及首页推荐位待处理', count: 5, unit: '条' },
    ])
    setRecentOrders([
      {
        orderNo: 'XY202608060128',
        bizType: '上门服务',
        institution: '幸福里健康驿站',
        customer: '李阿姨',
        amount: 168.0,
        orderTime: '08-06 10:24',
        status: 'pending',
      },
      {
        orderNo: 'XY202608060119',
        bizType: '活动报名',
        institution: '康乐护理院',
        customer: '王叔叔',
        amount: 99.0,
        orderTime: '08-06 09:46',
        status: 'confirmed',
      },
      {
        orderNo: 'XY202608050986',
        bizType: '适老商品',
        institution: '幸福里健康驿站',
        customer: '陈女士',
        amount: 328.0,
        orderTime: '08-05 18:32',
        status: 'refunding',
      },
      {
        orderNo: 'XY202608050921',
        bizType: '银龄旅游',
        institution: '怡康护理院',
        customer: '赵先生',
        amount: 1299.0,
        orderTime: '08-05 16:08',
        status: 'finished',
      },
    ])
    setTrend({
      totalOrders: 742,
      totalRate: 11.8,
      daily: [
        { label: '7/31', value: 82 },
        { label: '8/1', value: 96 },
        { label: '8/2', value: 74 },
        { label: '8/3', value: 118 },
        { label: '8/4', value: 104 },
        { label: '8/5', value: 126 },
        { label: '今日', value: 142 },
      ],
    })
  }, [])

  /** 经营指标卡配置（顺序与设计稿一致） */
  const metricCards: MetricCard[] = [
    {
      key: 'order',
      label: '今日订单',
      value: overview?.todayOrderCount,
      badge: `+${overview?.todayOrderRate ?? 0}% 较昨日`,
      tone: 'primary',
      icon: <BarChartOutlined />,
    },
    {
      key: 'institution',
      label: '运营机构',
      value: overview?.totalInstitution,
      badge: `${overview?.pendingInstitutionCount ?? 0} 家待完善资料`,
      tone: 'info',
      icon: <BarChartOutlined />,
    },
    {
      key: 'todo',
      label: '待办事项',
      value: overview?.pendingTodoCount,
      badge: `含 ${overview?.pendingRefundCount ?? 0} 笔退款审核`,
      tone: 'warning',
      icon: <BarChartOutlined />,
    },
    {
      key: 'signup',
      label: '今日活动报名',
      value: overview?.activitySignupCount,
      badge: `+${overview?.activitySignupRate ?? 0}% 较昨日`,
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
        render: (status: RecentOrder['status']) => (
          <span className={`status-pill status-pill--${status}`}>
            <i className="status-pill__dot" />
            {statusText[status]}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
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
    <PageContainer title="运营首页" description="欢迎回来，以下是今日平台经营概览">
      {/* 经营指标卡 */}
      <Row gutter={[16, 16]}>
        {metricCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.key}>
            <Card className="metric-card" variant="borderless">
              <div className="metric-card__head">
                <span className="metric-card__label">{card.label}</span>
                <span className={`metric-card__icon metric-card__icon--${card.tone}`}>
                  {card.icon}
                </span>
              </div>
              <div className="metric-card__value">{card.value ?? '-'}</div>
              <span className={`metric-card__note metric-card__note--${card.tone}`}>
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
                  {trend?.totalRate ?? 0}%
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
            className="list-card"
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
            <Table
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
