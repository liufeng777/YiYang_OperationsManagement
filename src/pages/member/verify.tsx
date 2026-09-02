/**
 * 会员管理 - 健康服务对象实名审核
 * 视觉对齐设计稿：顶部统计卡 + 筛选 + 审核状态 Tabs + 审核列表 + 审核 Drawer
 * 当前为 mock 数据，后端就绪后替换为 memberOpsApi 对应接口
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Radio, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import VerifyDrawer from './VerifyDrawer'
import type { VerifyRecord, VerifySource, VerifyStatus } from '@/api/modules/memberOps'
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

const initialRecords: VerifyRecord[] = [
  {
    id: '1',
    applyNo: 'RN202608250038',
    targetName: '张建国',
    submitter: '张女士 · 138****2368',
    relation: '父亲',
    idCard: '1101011948****1234',
    source: 'add',
    status: 'pending',
    submitTime: '2026-08-25 14:20',
    auditor: null,
  },
  {
    id: '2',
    applyNo: 'RN202608250031',
    targetName: '李秀兰',
    submitter: '李先生 · 139****5521',
    relation: '母亲',
    idCard: '1101021952****4521',
    source: 'add',
    status: 'pending',
    submitTime: '2026-08-25 11:35',
    auditor: null,
  },
  {
    id: '3',
    applyNo: 'RN202608240096',
    targetName: '王国强',
    submitter: '本人 · 136****8890',
    relation: '本人',
    idCard: '1101051960****8772',
    source: 'self',
    status: 'approved',
    submitTime: '2026-08-24 17:36',
    auditor: '陈运营',
    remark: '姓名与身份证信息核对一致。',
  },
  {
    id: '4',
    applyNo: 'RN202608240087',
    targetName: '赵梅',
    submitter: '赵女士 · 137****6632',
    relation: '母亲',
    idCard: '1101061955****2008',
    source: 'add',
    status: 'rejected',
    submitTime: '2026-08-24 16:20',
    auditor: '陈运营',
    remark: '身份证号与姓名不匹配，请核对后重新提交。',
  },
  {
    id: '5',
    applyNo: 'RN202608240052',
    targetName: '周秀兰',
    submitter: '周先生 · 135****9066',
    relation: '配偶',
    idCard: '1101071958****3690',
    source: 'add',
    status: 'pending',
    submitTime: '2026-08-24 10:08',
    auditor: null,
  },
  {
    id: '6',
    applyNo: 'RN202608230041',
    targetName: '陈国强',
    submitter: '陈女士 · 188****3175',
    relation: '父亲',
    idCard: '1101081949****6617',
    source: 'add',
    status: 'approved',
    submitTime: '2026-08-23 14:42',
    auditor: '陈运营',
    remark: '姓名与身份证信息核对一致。',
  },
]

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核 38' },
  { key: 'approved', label: '已通过 82' },
  { key: 'rejected', label: '已驳回 6' },
  { key: 'today', label: '今日提交 31' },
  { key: 'source', label: '全部来源' },
]

const metrics = [
  { key: 'pending', label: '待审核', value: '38', note: '需运营人员人工核对', tone: 'primary' },
  { key: 'approved', label: '今日通过', value: '24', note: '审核通过后可建档', tone: 'info' },
  { key: 'rejected', label: '今日驳回', value: '3', note: '均已填写驳回原因', tone: 'warning' },
  { key: 'duration', label: '平均审核时长', value: '4.2h', note: '目标 1 个工作日内完成', tone: 'danger' },
]

interface VerifyFilters {
  keyword: string
  status: VerifyStatus | 'all'
  source: VerifySource | 'all'
  date: string
}

export default function VerifyList() {
  const { message } = App.useApp()
  const [records, setRecords] = useState<VerifyRecord[]>(initialRecords)
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
  const pageSize = 10

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

  const handleAudited = (
    id: string,
    nextStatus: Exclude<VerifyStatus, 'pending'>,
    remark: string,
  ) => {
    setRecords((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: nextStatus, auditor: '陈运营', remark: remark || item.remark }
          : item,
      ),
    )
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
          onClick={() => message.info('导出功能将在后端接口就绪后接入')}
        >
          导出审核记录
        </Button>
      }
    >
      <div className="verify-list">
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
              <span className="list-card__header__tips">共 126 条申请 · 待审核 38 条</span>
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
              onChange: setPage,
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
