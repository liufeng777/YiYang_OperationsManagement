/**
 * 会员管理 - 推荐与奖励
 * 推荐列表：rewardApi.getReferralList（GET /admin/referral-events）
 * - 筛选 status / event_type / biz_type / reward_status 全部下推后端（不传表示全部）
 * - 接口返回标准分页结构 { list, total }，服务端分页
 * 奖励：预留 Tab 入口，待后端接口就绪后接入
 * 布局说明：Tabs 仅作分段导航（items 不带 children），内容区作为 .referral-page 的直接子级渲染，
 *           保证 PageContainer fixed 的高度链（list-card--fill + FillTable 测量）不被 Tabs 打断。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Select, Tabs } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import PageContainer from '@/components/PageContainer'
import { rewardApi } from '@/api'
import type { ReferralItem } from '@/api/modules/reward'
import { formatDateTime } from '@/utils'
import './index.less'

/** 事件类型：100-注册 / 200-报名 / 300-订单支付 */
const EVENT_TYPE_TEXT: Record<number, string> = {
  100: '注册',
  200: '报名',
  300: '订单支付',
}

/** 业务类型：1-用户 / 2-活动 / 3-订单 */
const BIZ_TYPE_TEXT: Record<number, string> = {
  1: '用户',
  2: '活动',
  3: '订单',
}

/** 状态：1-待生效 2-已生效 9-无效 */
const STATUS_TEXT: Record<number, string> = {
  1: '待生效',
  2: '已生效',
  9: '无效',
}

/** 奖励状态：1-未奖励 2-已奖励 3-已过期 9-作废 */
const REWARD_STATUS_TEXT: Record<number, string> = {
  1: '未奖励',
  2: '已奖励',
  3: '已过期',
  9: '作废',
}

/** 时间戳格式化：后端时间为 UTC 秒（小于 1e12 按秒处理），缺失展示 — */
const formatTs = (value?: number) => {
  if (!value) return '—'
  return formatDateTime(value < 1e12 ? value * 1000 : value)
}

interface ReferralFilters {
  status: number | null
  event_type: number | null
  biz_type: number | null
  reward_status: number | null
}

const emptyFilters: ReferralFilters = {
  status: null,
  event_type: null,
  biz_type: null,
  reward_status: null,
}

type TabKey = 'list' | 'reward'

export default function ReferralList() {
  const [tab, setTab] = useState<TabKey>('list')
  const [rows, setRows] = useState<ReferralItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ReferralFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  /** 拉取推荐事件列表：分页与筛选条件全部下推后端 */
  const fetchList = useCallback(async (targetPage: number, next: ReferralFilters, size: number) => {
    setLoading(true)
    try {
      const res = await rewardApi.getReferralList({
        page: targetPage,
        page_size: size,
        status: next.status ?? undefined,
        event_type: next.event_type ?? undefined,
        biz_type: next.biz_type ?? undefined,
        reward_status: next.reward_status ?? undefined,
      })
      setRows(res.list ?? [])
      setTotal(res.total ?? 0)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList(1, emptyFilters, pageSize)
  }, [fetchList])

  const applyFilters = () => {
    setPage(1)
    void fetchList(1, filters, pageSize)
  }

  const handleReset = () => {
    setFilters(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  const columns: ColumnsType<ReferralItem> = useMemo(
    () => [
      {
        title: '用户',
        key: 'user',
        width: 150,
        render: (_, record) => (
          <div className="referral-cell">
            <strong>{record.user_name || '—'}</strong>
            <span>ID：{record.user_id ?? '—'}</span>
          </div>
        ),
      },
      {
        title: '推荐码',
        dataIndex: 'referral_code',
        key: 'referral_code',
        width: 130,
        render: (value?: string) => value || '—',
      },
      {
        title: '事件类型',
        dataIndex: 'event_type',
        key: 'event_type',
        width: 110,
        render: (value: number) => EVENT_TYPE_TEXT[value] ?? value ?? '—',
      },
      {
        title: '业务类型',
        dataIndex: 'biz_type',
        key: 'biz_type',
        width: 100,
        render: (value: number) => BIZ_TYPE_TEXT[value] ?? value ?? '—',
      },
      {
        title: '关联业务',
        key: 'biz',
        width: 160,
        render: (_, record) => record.biz_name || (record.biz_id != null ? `#${record.biz_id}` : '—'),
      },
      {
        title: '奖励状态',
        dataIndex: 'reward_status',
        key: 'reward_status',
        width: 100,
        render: (value: number) => (
          <span className={`referral-reward referral-reward--${value}`}>
            {REWARD_STATUS_TEXT[value] ?? value ?? '—'}
          </span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => (
          <span className={`referral-status referral-status--${value}`}>
            {STATUS_TEXT[value] ?? value ?? '—'}
          </span>
        ),
      },
      {
        title: '创建时间',
        key: 'created_at',
        width: 160,
        render: (_, record) => formatTs(record.created_at),
      },
    ],
    [],
  )

  return (
    <PageContainer
      fixed
      title="推荐与奖励"
      description="查看会员推荐事件与奖励结算情况"
    >
      <div className="referral-page">
        <Tabs
          className="referral-page__tabs"
          activeKey={tab}
          onChange={(key) => setTab(key as TabKey)}
          items={[
            { key: 'list', label: '推荐列表' },
            { key: 'reward', label: '奖励' },
          ]}
        />

        {tab === 'list' ? (
          <>
            <Card variant="borderless" className="filter-bar referral-filter">
              <Select
                placeholder="状态"
                allowClear
                value={filters.status}
                onChange={(value) => setFilters((prev) => ({ ...prev, status: value ?? null }))}
                options={[
                  { label: '待生效', value: 1 },
                  { label: '已生效', value: 2 },
                  { label: '无效', value: 9 },
                ]}
              />
              <Select
                placeholder="事件类型"
                allowClear
                value={filters.event_type}
                onChange={(value) => setFilters((prev) => ({ ...prev, event_type: value ?? null }))}
                options={[
                  { label: '注册', value: 100 },
                  { label: '报名', value: 200 },
                  { label: '订单支付', value: 300 },
                ]}
              />
              <Select
                placeholder="业务类型"
                allowClear
                value={filters.biz_type}
                onChange={(value) => setFilters((prev) => ({ ...prev, biz_type: value ?? null }))}
                options={[
                  { label: '用户', value: 1 },
                  { label: '活动', value: 2 },
                  { label: '订单', value: 3 },
                ]}
              />
              <Select
                placeholder="奖励状态"
                allowClear
                value={filters.reward_status}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, reward_status: value ?? null }))
                }
                options={[
                  { label: '未奖励', value: 1 },
                  { label: '已奖励', value: 2 },
                  { label: '已过期', value: 3 },
                  { label: '作废', value: 9 },
                ]}
              />
              <Button onClick={handleReset}>重置</Button>
              <Button type="primary" onClick={applyFilters}>
                查询
              </Button>
            </Card>

            <Card variant="borderless" className="list-card list-card--fill">
              <div className="list-card__header">
                <div>
                  <span className="list-card__header__title">推荐列表</span>
                  <span className="list-card__header__tips">共 {total} 条推荐事件</span>
                </div>
              </div>
              <FillTable<ReferralItem>
                rowKey={(record) => record.id ?? `${record.user_id}-${record.created_at}`}
                size="small"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  onChange: (nextPage, nextPageSize) => {
                    setPage(nextPage)
                    setPageSize(nextPageSize)
                    void fetchList(nextPage, filters, nextPageSize)
                  },
                  showTotal: (count) => `共 ${count} 条`,
                }}
              />
            </Card>
          </>
        ) : (
          <Card variant="borderless" className="referral-placeholder">
            <Empty description="奖励功能即将上线，敬请期待" />
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
