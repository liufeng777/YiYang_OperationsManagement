/**
 * 运营首页 - 数据总览
 * 布局：欢迎横幅 + 经营指标卡（今日订单 / 合作机构 / 退款待审核 / 今日活动报名）
 *       + 待办提醒 / 近 7 日订单趋势 + 近期订单表格
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Col, Row, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ArrowUpOutlined,
  AuditOutlined,
  FileTextOutlined,
  HomeOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import type {
  OverviewData,
  RecentOrder,
  TrendStat,
} from '@/api/modules/dashboard'
import './index.less'

/** 订单状态 -> 文案 / Tag 颜色 */
const statusMap: Record<RecentOrder['status'], { text: string; color: string }> = {
  pending: { text: '待服务', color: 'warning' },
  confirmed: { text: '已确认', color: 'processing' },
  refunding: { text: '退款审核', color: 'error' },
  finished: { text: '已完成', color: 'success' },
}

/** 待办提醒（图标与标题） */
const todoConfig: { key: string; title: string; count?: number; icon: ReactNode }[] = [
  { key: 'refund', title: '退款待审核', count: 6, icon: <AuditOutlined /> },
  { key: 'institution', title: '机构资料待完善', count: 3, icon: <TeamOutlined /> },
  { key: 'content', title: '用户定制与服务展示内容待发布', icon: <FileTextOutlined /> },
  { key: 'home', title: '首页配置待管理', icon: <HomeOutlined /> },
]

/** 近 7 日订单量（图表展示用，后端就绪后替换） */
const trendValues = [42, 58, 45, 66, 72, 60, 84]

/** 格式化今日日期：2026 年 8 月 6 日 星期四 */
function formatToday() {
  const now = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 星期${week}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [trend, setTrend] = useState<TrendStat | null>(null)

  useEffect(() => {
    // TODO: 后端就绪后替换为真实接口：
    // getOverview().then(setOverview)
    // getRecentOrders().then(setRecentOrders)
    // getTrendStat().then(setTrend)
    setOverview({
      todayOrderCount: 128,
      todayOrderRate: 12,
      activitySignupCount: 45,
      activitySignupRate: 2,
      pendingRefundCount: 6,
      totalInstitution: 36,
      pendingInstitutionCount: 3,
    })
    setRecentOrders([
      {
        orderNo: 'xv202608060128',
        bizType: '上门服务',
        institution: '幸福里康养驿站',
        customer: '李阿姨',
        amount: 168.0,
        orderTime: '08-06 10:24',
        status: 'pending',
      },
      {
        orderNo: 'xv202608060119',
        bizType: '活动报名',
        institution: '康乐护理院',
        customer: '赵先生',
        amount: 990.0,
        orderTime: '08-06 00:46',
        status: 'confirmed',
      },
      {
        orderNo: 'xv202608050985',
        bizType: '适老商品',
        institution: '幸福里康养驿站',
        customer: '陈阿姨',
        amount: 326.0,
        orderTime: '08-05 11:32',
        status: 'refunding',
      },
      {
        orderNo: 'xv202608050921',
        bizType: '老龄旅游',
        institution: '怡康护理院',
        customer: '刘叔叔',
        amount: 1299.0,
        orderTime: '08-05 15:28',
        status: 'finished',
      },
    ])
    setTrend({ totalOrders: 742, totalRate: 11.8 })
  }, [])

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
        render: (value: number) => `¥${value.toFixed(2)}`,
      },
      { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime' },
      {
        title: '订单状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: RecentOrder['status']) => (
          <Tag color={statusMap[status].color}>{statusMap[status].text}</Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <a onClick={() => navigate(`/order/detail/${record.orderNo}`)}>查看详情</a>
        ),
      },
    ],
    [navigate],
  )

  const maxTrend = Math.max(...trendValues)

  return (
    <PageContainer title="运营首页" extra={<span className="dashboard-date">{formatToday()}</span>}>
      {/* 欢迎横幅 */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome__title">欢迎回来，以下是今日平台经营概览</div>
        <div className="dashboard-welcome__desc">祝您今日工作顺利，及时处理平台各项待办事项</div>
      </div>

      {/* 经营指标卡 */}
      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card" bordered={false}>
            <div className="metric-card__label">今日订单</div>
            <div className="metric-card__value">
              {overview?.todayOrderCount ?? '-'}
              <span className="metric-card__unit">单</span>
            </div>
            <div className="metric-card__footer">
              <span className="metric-card__rate">
                <ArrowUpOutlined className="metric-card__rate-arrow" />
                {overview?.todayOrderRate ?? 0}% 较昨日
              </span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card" bordered={false}>
            <div className="metric-card__label">合作机构</div>
            <div className="metric-card__value">
              {overview?.totalInstitution ?? '-'}
              <span className="metric-card__unit">家</span>
            </div>
            <div className="metric-card__footer">
              <span className="metric-card__sub">待完善资料 {overview?.pendingInstitutionCount ?? 0} 家</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card metric-card--danger" bordered={false}>
            <div className="metric-card__label">退款待审核</div>
            <div className="metric-card__value">
              {overview?.pendingRefundCount ?? '-'}
              <span className="metric-card__unit">笔</span>
            </div>
            <div className="metric-card__footer">
              <span className="metric-card__sub">含 {overview?.pendingRefundCount ?? 0} 笔退款审核</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card" bordered={false}>
            <div className="metric-card__label">今日活动报名</div>
            <div className="metric-card__value">
              {overview?.activitySignupCount ?? '-'}
              <span className="metric-card__unit">人</span>
            </div>
            <div className="metric-card__footer">
              <span className="metric-card__rate">
                <ArrowUpOutlined className="metric-card__rate-arrow" />
                {overview?.activitySignupRate ?? 0}% 较昨日
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 待办提醒 + 近 7 日订单趋势 */}
      <Row gutter={16} className="dashboard-row">
        <Col xs={24} lg={12}>
          <Card
            title="待办提醒"
            bordered={false}
            extra={<a onClick={() => navigate('/refund')}>查看全部</a>}
          >
            <div className="dashboard-todo">
              {todoConfig.map((item) => (
                <div className="dashboard-todo__item" key={item.key}>
                  <span className={`dashboard-todo__icon dashboard-todo__icon--${item.key}`}>
                    {item.icon}
                  </span>
                  <span className="dashboard-todo__title">{item.title}</span>
                  {item.count !== undefined && (
                    <span className="dashboard-todo__count">{item.count}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="近 7 日订单趋势"
            bordered={false}
            extra={
              <Button type="link" size="small" onClick={() => navigate('/order')}>
                进入订单中心
              </Button>
            }
          >
            <div className="dashboard-trend">
              <div className="dashboard-trend__chart">
                {trendValues.map((value, index) => (
                  <div className="dashboard-trend__bar-wrap" key={index}>
                    <div
                      className={`dashboard-trend__bar${index === trendValues.length - 1 ? ' dashboard-trend__bar--active' : ''}`}
                      style={{ height: `${(value / maxTrend) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="dashboard-trend__stat">
                <span className="dashboard-trend__stat-label">累计订单</span>
                <span className="dashboard-trend__stat-value">{trend?.totalOrders ?? '-'} 单</span>
                <span className="dashboard-trend__stat-rate">
                  <ArrowUpOutlined className="dashboard-trend__stat-arrow" />
                  {trend?.totalRate ?? 0}% 较上周
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 近期订单 */}
      <Row gutter={16} className="dashboard-row">
        <Col span={24}>
          <Card title="近期订单" bordered={false} className="dashboard-orders">
            <Table
              rowKey="orderNo"
              columns={columns}
              dataSource={recentOrders}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
