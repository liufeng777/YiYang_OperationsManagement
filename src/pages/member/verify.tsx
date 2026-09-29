/**
 * 会员管理 - 健康服务对象实名审核（当前未挂载路由）
 * 视觉对齐设计稿：顶部统计卡 + 筛选 + 审核状态 Tabs + 审核列表 + 审核 Drawer
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据，接口就绪后接入 rewardApi 对应接口
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Radio, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import VerifyDrawer from './VerifyDrawer'
import type { VerifyRecord, VerifySource, VerifyStatus } from '@/api/modules/reward'
import './verify.less'

const statusText: Record<VerifyStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
}

const sourceText: Record<VerifySource, string> = {
  add: 'C端添加对象',
  self: 'C端本人认证',
}

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
  { key: 'today', label: '今日提交' },
  { key: 'source', label: '全部来源' },
]

const metrics = [
  { key: 'pending', label: '待审核', value: '—', note: '需运营人员人工核对', tone: 'primary' },
  { key: 'approved', label: '今日通过', value: '—', note: '审核通过后可建档', tone: 'info' },
  { key: 'rejected', label: '今日驳回', value: '—', note: '均已填写驳回原因', tone: 'warning' },
  { key: 'duration', label: '平均审核时长', value: '—', note: '目标 1 个工作日内完成', tone: 'danger' },
]

interface VerifyFilters {
  keyword: string
  status: VerifyStatus | 'all'
  source: VerifySource | 'all'
  date: string
}

export default function VerifyList() {
  const { message } = App.useApp()
  /** 接口未对接：无审核数据 */
  const [records] = useState<VerifyRecord[]>([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<VerifyStatus | 'all'>('all')
  const [source, setSource] = useState<VerifySource | 'all'>('all')
  const [date, setDate] = useState('')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<VerifyFilters>({
    keyword: '',
    status: 'all',
    source: 'all',
    date: '',
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [current, setCurrent] = useState<VerifyRecord | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredData = useMemo(() => {
    return records.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.targetName.includes(applied.keyword) ||
        item.idCard.includes(applied.keyword)
      const statusHit = applied.status === 'all' || item.status === applied.status
      const sourceHit = applied.source === 'all' || item.source === applied.source
      const tabHit =
        tab === 'all' ||
        tab === 'today' ||
        tab === 'source' ||
        item.status === (tab as VerifyStatus)
      return keywordHit && statusHit && sourceHit && tabHit
    })
  }, [records, applied, tab])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), status, source, date })
  }

  const handleReset = () => {
    setKeyword('')
    setStatus('all')
    setSource('all')
    setDate('')
    setApplied({ keyword: '', status: 'all', source: 'all', date: '' })
  }

  const openDrawer = (record: VerifyRecord) => {
    setCurrent(record)
    setDrawerOpen(true)
  }

  /** 接口未对接：审核回调统一提示（列表为空时 Drawer 不可达） */
  const handleAudited = () => {
    message.warning('接口未对接，功能暂未开放')
  }

  const columns = useMemo<ColumnsType<VerifyRecord>>(
    () => [
      {
        title: '服务对象 / 提交人',
        key: 'target',
        width: 160,
        render: (_, record) => (
          <div className="verify-cell">
            <strong>{record.targetName}</strong>
            <span>提交人：{record.submitter.split(' · ')[0]}</span>
          </div>
        ),
      },
      {
        title: '与提交人关系',
        dataIndex: 'relation',
        key: 'relation',
        width: 110,
      },
      {
        title: '身份证号',
        dataIndex: 'idCard',
        key: 'idCard',
        width: 170,
      },
      {
        title: '提交来源',
        dataIndex: 'source',
        key: 'source',
        width: 110,
        render: (value: VerifySource) => sourceText[value],
      },
      {
        title: '审核状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: VerifyStatus) => (
          <span className={`verify-status verify-status--${value}`}>{statusText[value]}</span>
        ),
      },
      {
        title: '提交时间',
        dataIndex: 'submitTime',
        key: 'submitTime',
        width: 140,
      },
      {
        title: '审核人',
        dataIndex: 'auditor',
        key: 'auditor',
        width: 90,
        render: (value: string | null) => value ?? '—',
      },
      {
        title: '操作',
        key: 'action',
        width: 80,
        render: (_, record) => (
          <Button type="link" size="small" onClick={() => openDrawer(record)}>
            {record.status === 'pending' ? '审核' : '查看'}
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer
      title="健康服务对象实名审核"
      description="审核C端提交的健康服务对象姓名与身份证信息"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.warning('接口未对接，功能暂未开放')}
        >
          导出审核记录
        </Button>
      }
    >
      <div className="verify-list">
        <ApiPendingAlert feature="实名审核" />
        <div className="metric-cards">
          {metrics.map((metric) => (
            <Card variant="borderless" className="metric-card" key={metric.key}>
              <div className="metric-card__head">
                <span className="metric-card__label">{metric.label}</span>
                <i className={`metric-card__icon metric-card__icon--${metric.tone}`}>
                  <BarChartOutlined />
                </i>
              </div>
              <strong className="metric-card__value">{metric.value}</strong>
              <em className={`metric-card__note metric-card__note--${metric.tone}`}>
                {metric.note}
              </em>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar verify-list__filter">
          <Input
            allowClear
            placeholder="姓名或身份证号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: '全部审核状态', value: 'all' },
              { label: '待审核', value: 'pending' },
              { label: '已通过', value: 'approved' },
              { label: '已驳回', value: 'rejected' },
            ]}
          />
          <Select
            value={source}
            onChange={setSource}
            options={[
              { label: '全部提交来源', value: 'all' },
              { label: 'C端添加对象', value: 'add' },
              { label: 'C端本人认证', value: 'self' },
            ]}
          />
          <Input
            allowClear
            placeholder="提交时间"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">实名认证审核列表</span>
              <span className="list-card__header__tips">共 {filteredData.length} 条申请</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<VerifyRecord>
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
            pagination={{
              current: page,
              pageSize,
              total: filteredData.length,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
              },
              showTotal: (total) => `共 ${total} 条`
            }}
          />
        </Card>
      </div>

      <VerifyDrawer
        open={drawerOpen}
        record={current}
        onClose={() => setDrawerOpen(false)}
        onAudited={handleAudited}
      />
    </PageContainer>
  )
}
