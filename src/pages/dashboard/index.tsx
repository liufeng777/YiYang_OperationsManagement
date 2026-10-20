/**
 * 运营首页 - 数据总览（对齐设计稿《运营首页》）
 * 布局：统计日期行（今日 / 昨日 / 本月 / 自定义日期 + 查询 + 数据更新时间）
 *       + 指标卡（新增注册会员数 / 首单转化会员数 / 服务净成交金额）
 *       + 待办事项 / 服务净成交趋势 + 近期订单表格
 * 数据来源：dashboardApi.getDashboardOverview({ scope:'all', start_ts, end_ts, limit })
 *          一次性返回 { accounts, dataset_dura, recent_orders, todos }
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Col, DatePicker, Empty, Row } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { dashboardApi } from '@/api'
import type {
  DashboardOverviewResult,
  DashboardRecentOrder,
  DashboardTrendPoint,
} from '@/api/modules/dashboard'
import { formatDateTime, formatNumber } from '@/utils'
import './index.less'

/** 色调：与 global.less 中 .status--* 修饰类一一对应（统计卡 icon / note 着色） */
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

/** 待办项 key 的展示文案与图标字块（后端 key 未在 swagger 列明，未命中时兜底展示 key 本身）
 *  tone 对应 index.less 中 dashboard-todo__icon--* 的着色类 */
const todoMeta: Record<string, { title: string; desc: string; icon: string; unit: string; tone: string }> = {
  refund_approval: { title: '待审核退款', desc: '退款单等待财务/运营审批', icon: '退', unit: '笔', tone: 'refund' },
  pending_institution: { title: '待审核机构', desc: '新机构资料等待平台审核', icon: '商', unit: '家', tone: 'institution' },
  institution: { title: '待审核机构', desc: '新机构资料等待平台审核', icon: '商', unit: '家', tone: 'institution' },
  pending_content: { title: '待审核内容', desc: '资讯/公告等内容等待发布审核', icon: '内', unit: '条', tone: 'content' },
  content: { title: '待审核内容', desc: '资讯/公告等内容等待发布审核', icon: '内', unit: '条', tone: 'content' },
  pending_warn: { title: '待处理预警', desc: '健康预警等待运营跟进处置', icon: '警', unit: '条', tone: 'warn' },
  warn: { title: '待处理预警', desc: '健康预警等待运营跟进处置', icon: '警', unit: '条', tone: 'warn' },
}

interface MetricCard {
  key: string
  label: string
  value?: number | string
  badge: string
  tone: Tone
  icon: ReactNode
}

/** 统计日期快捷项 */
type RangeType = 'today' | 'yesterday' | 'month' | 'custom'

const rangeOptions: { key: RangeType; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'month', label: '本月' },
  { key: 'custom', label: '自定义日期' },
]

/** 由快捷项解析起止时间（自定义时取 RangePicker 值） */
function resolveRange(type: RangeType, custom: [Dayjs, Dayjs] | null): [Dayjs, Dayjs] {
  switch (type) {
    case 'today':
      return [dayjs().startOf('day'), dayjs().endOf('day')]
    case 'yesterday':
      return [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')]
    case 'month':
      return [dayjs().startOf('month'), dayjs().endOf('day')]
    case 'custom':
      return custom ?? [dayjs().startOf('month'), dayjs().endOf('day')]
  }
}

/** 实付金额兼容：字符串按「元」解析；数值按「分」转元（与订单列表接口一致） */
const parseAmount = (value: string | number | undefined): number | null => {
  if (value == null || value === '') return null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return value / 100
}

/** 趋势柱密度阈值：超过则缩小柱宽/间隙并省略柱上数值 */
const TREND_DENSE_COUNT = 12

export default function Dashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  /** 统计日期：快捷项 + 自定义区间（点「查询」后生效） */
  const [rangeType, setRangeType] = useState<RangeType>('month')
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null)
  /** 当前生效的统计区间（驱动请求与「x 至 x」展示） */
  const [appliedRange, setAppliedRange] = useState<[Dayjs, Dayjs]>(() => resolveRange('month', null))
  /** 数据更新时间（最近一次成功拉取） */
  const [updatedAt, setUpdatedAt] = useState<string>('')

  /** 指标总览：scope=all 取平台全量，limit 控制近期订单条数 */
  const fetchOverview = useCallback(async (range: [Dayjs, Dayjs]) => {
    setLoading(true)
    try {
      const res = await dashboardApi.getDashboardOverview({
        scope: 'all',
        start_ts: range[0].unix(),
        end_ts: range[1].unix(),
        limit: 8,
      })
      setOverview(res)
      setUpdatedAt(dayjs().format('MM-DD HH:mm'))
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }, [])

  /** 进入页面：按默认「本月」拉取 */
  useEffect(() => {
    void fetchOverview(appliedRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 查询：解析当前选择的区间并重新拉取 */
  const handleQuery = () => {
    const next = resolveRange(rangeType, customRange)
    setAppliedRange(next)
    void fetchOverview(next)
  }

  const dataset = overview?.dataset_dura

  /** 新增注册会员数：所选区间内 registered_trend 之和（val 为字符串，转数值累加） */
  const registeredTotal = useMemo(
    () => (dataset?.registered_trend ?? []).reduce((sum, point) => sum + (Number(point.val) || 0), 0),
    [dataset],
  )

  /** 经营指标卡配置（顺序与设计稿一致）；数据未返回时展示 - */
  const metricCards: MetricCard[] = [
    {
      key: 'registered',
      label: '新增注册会员数',
      value: overview ? registeredTotal : undefined,
      badge: '按首次注册时间统计',
      tone: 'success',
      icon: <BarChartOutlined />,
    },
    {
      key: 'firstDeal',
      label: '首单转化会员数',
      value: dataset?.first_deal_users,
      badge: '按下单会员去重',
      tone: 'info',
      icon: <BarChartOutlined />,
    },
    {
      key: 'paid',
      label: '服务净成交金额',
      value: dataset ? `¥${formatNumber(dataset.paid_amount)}` : undefined,
      badge: '实付金额 – 成功退款',
      tone: 'warning',
      icon: <BarChartOutlined />,
    },
  ]

  /** 待办事项：todos 为 key→数量 映射，按 todoMeta 渲染，未知名 key 兜底 */
  const todos = useMemo(() => {
    if (!overview?.todos) return []
    return Object.entries(overview.todos).map(([key, count]) => {
      const meta = todoMeta[key]
      return {
        key,
        title: meta?.title ?? key,
        desc: meta?.desc,
        icon: meta?.icon ?? '待',
        count,
        unit: meta?.unit ?? '项',
        tone: meta?.tone ?? 'warn',
      }
    })
  }, [overview])

  /**
   * 服务净成交趋势：取 dataset_dura.paid_trend（单位：元），全量渲染
   * - ts 实际为字符串：月视图按日（"2026-10-01" / "10-02"），日视图按小时（"2026-10-20 00:00" / "10-20 01:00"）
   * - 标签只保留变化部分：按日 → MM-DD，按小时 → HH:mm；
   *   公共部分（年月 / 年月日）上提到卡片标题后展示
   * - 点数较多（dense）时缩小柱宽与间隙，柱上数值省略（悬停 title 查看）
   */
  const trend = useMemo(() => {
    const list: DashboardTrendPoint[] = dataset?.paid_trend ?? []
    const hourly = list.some((point) => typeof point.ts === 'string' && point.ts.includes(':'))
    const rawFirst = list.length ? String(list[0].ts) : ''
    /** 公共时间上下文：按小时为 YYYY-MM-DD，按日为 YYYY-MM（优先取 ts 完整值，兜底所选区间） */
    const context = hourly
      ? (rawFirst.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? appliedRange[0].format('YYYY-MM-DD'))
      : (rawFirst.match(/\d{4}-\d{2}/)?.[0] ?? appliedRange[0].format('YYYY-MM'))
    const points = list.map((point) => {
      const raw = String(point.ts)
      const label = hourly
        ? (raw.match(/(\d{2}:\d{2})$/)?.[1] ?? raw)
        : (raw.match(/(\d{2}-\d{2})$/)?.[1] ?? raw)
      return { label, value: Number(point.val) || 0, raw }
    })
    return { hourly, context, points }
  }, [dataset, appliedRange])

  const recentOrders = useMemo(() => overview?.recent_orders ?? [], [overview])

  const columns = useMemo<ColumnsType<DashboardRecentOrder>>(
    () => [
      { title: '订单编号', dataIndex: 'order_no', key: 'order_no', render: (v?: string) => v ?? '—' },
      {
        title: '服务机构',
        key: 'institution',
        render: (_, record) =>
          record.institution_name ?? (record.institution_id ? `机构 ${record.institution_id}` : '—'),
      },
      {
        title: '下单会员',
        key: 'customer',
        render: (_, record) => (<div className="table-cell">
          <strong>{record.user_name}</strong>
          <span>{record.user_phone}</span>
        </div>),
      },
      {
        title: '实付金额',
        key: 'amount',
        render: (_, record) => {
          const amount = parseAmount(record.paid_amount)
          return amount == null ? '—' : `¥${formatNumber(amount)}`
        },
      },
      {
        title: '下单时间',
        key: 'orderTime',
        render: (_, record) =>
          record.created_at ? formatDateTime(record.created_at * 1000, 'MM-DD HH:mm') : '—',
      },
      {
        title: '订单状态',
        dataIndex: 'order_status',
        key: 'order_status',
        render: (status?: number) =>
          status == null ? (
            '—'
          ) : (
            <span className={`status-btn status--${statusText[status]?.tone ?? 'info'}`}>
              {statusText[status]?.text ?? status}
            </span>
          ),
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        render: (_, record) =>
          record.order_id == null ? null : (
            <Button
              type="link"
              size="small"
              className="table-link-btn"
              onClick={() => navigate(`/order/detail/${record.order_id}`)}
            >
              查看详情
            </Button>
          ),
      },
    ],
    [navigate],
  )

  const maxTrend = Math.max(...trend.points.map((d) => d.value), 1)
  /** 密集模式：柱数较多时缩小柱宽与间隙、省略柱上数值 */
  const dense = trend.points.length > TREND_DENSE_COUNT

  return (
    <PageContainer fixed title="运营首页" description="注册会员拉新、首单转化与服务成交概览">
      {/* 统计日期 */}
      <div className="dashboard-filter">
        <span className="dashboard-filter__label">统计日期</span>
        <div className="dashboard-filter__quick">
          {rangeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`dashboard-filter__quick-btn${rangeType === option.key ? ' is-active' : ''}`}
              onClick={() => setRangeType(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {rangeType === 'custom' ? (
          <DatePicker.RangePicker
            value={customRange}
            onChange={(value) =>
              setCustomRange(value && value[0] && value[1] ? [value[0], value[1]] : null)
            }
            allowClear={false}
          />
        ) : (
          <span className="dashboard-filter__range">
            {appliedRange[0].format('YYYY-MM-DD')} 至 {appliedRange[1].format('YYYY-MM-DD')}
          </span>
        )}
        <Button type="primary" loading={loading} onClick={handleQuery}>
          查询
        </Button>
        {updatedAt && <span className="dashboard-filter__updated">数据更新：{updatedAt}</span>}
      </div>

      {/* 经营指标卡 */}
      <Row gutter={[16, 16]}>
        {metricCards.map((card) => (
          <Col xs={24} sm={12} lg={8} key={card.key}>
            <Card className="metric-card" variant="borderless">
              <div className="metric-card__head">
                <span className="metric-card__label">{card.label}</span>
                <i className={`metric-card__icon status--${card.tone}`}>
                  {card.icon}
                </i>
              </div>
              <div className="metric-card__value">{card.value ?? '-'}</div>
              <em className={`metric-card__note status--${card.tone}`}>
                {card.badge}
              </em>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 待办事项 + 服务净成交趋势 */}
      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} lg={8}>
          <Card
            variant="borderless"
            className="dashboard-card"
          >
            <div className="dashboard-todo">
              <div className='dashboard__header'>
                <span className="dashboard__title">待办事项</span>
                <span className="dashboard-todo__realtime">当前待处理 · 实时</span>
              </div>
              <div className='dashboard-todo__list'>
                {todos.length === 0 && !loading ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待办事项" />
                ) : (
                  todos.map((item, index) => (
                    <div className="dashboard-todo__item" key={`${item.key}-${index}`}>
                      <span className={`dashboard-todo__icon dashboard-todo__icon--${item.tone}`}>
                        {item.icon}
                      </span>
                      <div className="dashboard-todo__main">
                        <div className="dashboard-todo__title">{item.title}</div>
                        {item.desc && <div className="dashboard-todo__desc">{item.desc}</div>}
                      </div>
                      <span className="dashboard-todo__count">
                        {item.count} {item.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            variant="borderless"
            className="dashboard-card"
          >
            <div className="dashboard-trend-container">
              <div className='dashboard__header'>
                <span className="dashboard__title">
                  服务净成交趋势
                  {trend.points.length > 0 && (
                    <span className="dashboard-trend__context">{trend.context}</span>
                  )}
                </span>
                <span className="dashboard-trend__hint">按所选日期统计 · 单位：元</span>
              </div>
              <div className={`dashboard-trend${dense ? ' dashboard-trend--dense' : ''}`}>
                {trend.points.length === 0 && !loading ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="所选区间暂无成交数据" />
                ) : (
                  trend.points.map((point, index) => (
                    <div
                      className="dashboard-trend__col"
                      key={`${point.raw}-${index}`}
                      title={dense ? `${point.raw}：¥${formatNumber(point.value)}` : undefined}
                    >
                      <div className="dashboard-trend__plot">
                        <span className="dashboard-trend__num">{formatNumber(point.value, 0)}</span>
                        <div
                          className={`dashboard-trend__bar${index === trend.points.length - 1 ? ' dashboard-trend__bar--active' : ''}`}
                          style={{ height: `${(point.value / maxTrend) * 100}%` }}
                        />
                      </div>
                      <span className="dashboard-trend__day">{point.label}</span>
                    </div>
                  ))
                )}
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
              rowKey={(record) => record.order_no ?? String(record.id ?? '')}
              columns={columns}
              dataSource={recentOrders}
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
    </PageContainer>
  )
}
