/**
 * 服务项目 - 集团服务池
 * 视觉对齐设计稿：顶部统计 + 筛选 + 左侧服务分类 + 右侧服务项目表格
 * 当前为 mock 数据，后端就绪后替换为 serviceApi.getServiceList
 */
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Input, Modal, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ServiceItem, ServiceMode, ServiceStatus } from '@/api/modules/service'
import './list.less'

const statusText: Record<ServiceStatus, string> = {
  on: '已启用',
  draft: '草稿',
  off: '已停用',
}

const modeClass: Record<ServiceMode, string> = {
  上门: 'home',
  到店: 'store',
  陪同: 'accompany',
}

const categories = [
  { name: '全部服务', count: 128 },
  { name: '生活照护', count: 38 },
  { name: '康复护理', count: 30 },
  { name: '健康管理', count: 24 },
  { name: '居家安全', count: 16 },
  { name: '陪诊出行', count: 20 },
]

const mockServices: ServiceItem[] = [
  {
    id: '1',
    code: 'FW0001',
    name: '上门助浴服务',
    categoryId: 'c1',
    categoryName: '生活照护',
    mode: '上门',
    price: 168,
    institutionCount: 12,
    orderCount: 326,
    status: 'on',
    description: '专业护理人员上门提供安全、舒适的助浴服务',
  },
  {
    id: '2',
    code: 'FW0002',
    name: '居家护理服务',
    categoryId: 'c1',
    categoryName: '生活照护',
    mode: '上门',
    price: 198,
    institutionCount: 9,
    orderCount: 156,
    status: 'on',
  },
  {
    id: '3',
    code: 'FW0003',
    name: '术后康复训练',
    categoryId: 'c2',
    categoryName: '康复护理',
    mode: '到店',
    price: 128,
    institutionCount: 7,
    orderCount: 98,
    status: 'on',
  },
  {
    id: '4',
    code: 'FW0004',
    name: '慢病健康随访',
    categoryId: 'c3',
    categoryName: '健康管理',
    mode: '上门',
    price: 69,
    institutionCount: 15,
    orderCount: 288,
    status: 'on',
  },
  {
    id: '5',
    code: 'FW0005',
    name: '居家安全评估',
    categoryId: 'c4',
    categoryName: '居家安全',
    mode: '上门',
    price: 99,
    institutionCount: 5,
    orderCount: 36,
    status: 'draft',
  },
  {
    id: '6',
    code: 'FW0006',
    name: '全程陪诊服务',
    categoryId: 'c5',
    categoryName: '陪诊出行',
    mode: '陪同',
    price: 268,
    institutionCount: 8,
    orderCount: 64,
    status: 'off',
  },
]

const updateTimeMap: Record<string, string> = {
  '1': '08-10 16:20',
  '2': '08-09 11:05',
  '3': '08-08 09:30',
  '4': '08-07 15:42',
  '5': '08-06 10:18',
  '6': '08-02 14:36',
}

interface ServiceFilters {
  keyword: string
  category: string
  mode: ServiceMode | 'all'
  status: ServiceStatus | 'all'
}

interface OfflineTarget {
  ids: string[]
  title: string
  code?: string
}

export default function ServicePoolList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [data, setData] = useState(mockServices)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('全部服务')
  const [mode, setMode] = useState<ServiceMode | 'all'>('all')
  const [status, setStatus] = useState<ServiceStatus | 'all'>('all')
  const [applied, setApplied] = useState<ServiceFilters>({
    keyword: '',
    category: '全部服务',
    mode: 'all',
    status: 'all',
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [offlineTarget, setOfflineTarget] = useState<OfflineTarget | null>(null)
  const [offlineReason, setOfflineReason] = useState('')

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase())
      const categoryHit = applied.category === '全部服务' || item.categoryName === applied.category
      const modeHit = applied.mode === 'all' || item.mode === applied.mode
      const statusHit = applied.status === 'all' || item.status === applied.status
      return keywordHit && categoryHit && modeHit && statusHit
    })
  }, [applied, data])

  const metrics = [
    { key: 'all', label: '服务项目', value: 128, note: '集团统一定义' },
    { key: 'on', label: '已启用', value: 112, note: '机构可选择添加' },
    { key: 'draft', label: '草稿', value: 9, note: '尚未对机构开放' },
    { key: 'off', label: '已停用', value: 7, note: '不可新增使用' },
  ]

  const applyFilters = (next?: Partial<ServiceFilters>) => {
    setApplied({
      keyword: (next?.keyword ?? keyword).trim(),
      category: next?.category ?? category,
      mode: next?.mode ?? mode,
      status: next?.status ?? status,
    })
  }

  const handleReset = () => {
    setKeyword('')
    setCategory('全部服务')
    setMode('all')
    setStatus('all')
    setApplied({ keyword: '', category: '全部服务', mode: 'all', status: 'all' })
  }

  const handleCategoryClick = (name: string) => {
    setCategory(name)
    applyFilters({ category: name })
  }

  const openOfflineModal = (record: ServiceItem) => {
    setOfflineReason('')
    setOfflineTarget({ ids: [record.id], title: `集团服务池 · ${record.name}`, code: record.code })
  }

  const openBatchOfflineModal = () => {
    const ids = data.filter((item) => selectedRowKeys.includes(item.id) && item.status === 'on').map((item) => item.id)
    if (!ids.length) {
      message.warning('请选择可停用的已启用服务')
      return
    }
    setOfflineReason('')
    setOfflineTarget({ ids, title: `批量停用 ${ids.length} 项服务` })
  }

  const handleEnable = (record: ServiceItem) => {
    setData((prev) => prev.map((item) => (item.id === record.id ? { ...item, status: 'on' } : item)))
    message.success(`${record.name} 已启用`)
  }

  const handleConfirmOffline = () => {
    if (!offlineTarget) return
    if (offlineReason.trim().length < 5) {
      message.warning('请填写下架原因，至少 5 个字')
      return
    }
    setData((prev) => prev.map((item) => (offlineTarget.ids.includes(item.id) ? { ...item, status: 'off' } : item)))
    message.success(`已停用 ${offlineTarget.ids.length} 项服务`)
    setOfflineTarget(null)
    setSelectedRowKeys([])
  }

  const columns = useMemo<ColumnsType<ServiceItem>>(
    () => [
      {
        title: '服务项目',
        key: 'name',
        render: (_, record) => (
          <div className="pool-service">
            <i>{record.name.slice(0, 1)}</i>
            <div>
              <strong>{record.name}</strong>
              <span>{record.categoryName} · {record.code}</span>
            </div>
          </div>
        ),
      },
      {
        title: '服务方式',
        dataIndex: 'mode',
        key: 'mode',
        width: 110,
        render: (value: ServiceMode) => <span className={`mode-pill mode-pill--${modeClass[value]}`}>{value}</span>,
      },
      {
        title: '集团定价',
        dataIndex: 'price',
        key: 'price',
        width: 110,
        render: (value: number) => `¥${value} / 次`,
      },
      {
        title: '使用机构',
        dataIndex: 'institutionCount',
        key: 'institutionCount',
        width: 100,
        render: (value: number) => `${value} 家`,
      },
      {
        title: '更新时间',
        key: 'updatedAt',
        width: 120,
        render: (_, record) => updateTimeMap[record.id] ?? '08-01 10:00',
      },
      {
        title: '定义状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: ServiceStatus) => <span className={`pool-status pool-status--${value}`}>{statusText[value]}</span>,
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: (_, record) => (
          <div className="pool-actions">
            <Button type="link" size="small" onClick={() => navigate(`/service/detail/${record.id}`)}>
              编辑
            </Button>
            {record.status === 'on' ? (
              <Button type="link" size="small" onClick={() => openOfflineModal(record)}>
                停用
              </Button>
            ) : (
              <Button type="link" size="small" onClick={() => handleEnable(record)}>
                启用
              </Button>
            )}
          </div>
        ),
      },
    ],
    [message, navigate],
  )

  return (
    <PageContainer
      title="集团服务池"
      description="统一定义服务基础信息与集团定价，机构从服务池选择项目后再配置线上履约规则"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/service/detail/new')}>
          新建服务项目
        </Button>
      }
    >
      <div className="service-pool">
        <div className="service-pool__metrics">
          {metrics.map((metric) => (
            <Card variant="borderless" className="pool-metric" key={metric.key}>
              <span>{metric.label}</span>
              <div>
                <strong>{metric.value}</strong>
                <em>{metric.note}</em>
              </div>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar service-pool__filter">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索服务名称、项目编码"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => applyFilters()}
          />
          <Select
            value={category}
            onChange={(value) => {
              setCategory(value)
              applyFilters({ category: value })
            }}
            options={categories.map((item) => ({ label: item.name === '全部服务' ? '全部服务分类' : item.name, value: item.name }))}
          />
          <Select
            value={mode}
            onChange={(value) => {
              setMode(value)
              applyFilters({ mode: value })
            }}
            options={[
              { label: '全部服务方式', value: 'all' },
              { label: '上门', value: '上门' },
              { label: '到店', value: '到店' },
              { label: '陪同', value: '陪同' },
            ]}
          />
          <Select
            value={status}
            onChange={(value) => {
              setStatus(value)
              applyFilters({ status: value })
            }}
            options={[
              { label: '全部定义状态', value: 'all' },
              { label: '已启用', value: 'on' },
              { label: '草稿', value: 'draft' },
              { label: '已停用', value: 'off' },
            ]}
          />
          <Button type="primary" onClick={() => applyFilters()}>查询</Button>
          <Button onClick={handleReset}>重置</Button>
        </Card>

        <div className="service-pool__main">
          <Card variant="borderless" className="pool-category">
            <div className="pool-category__header">
              <h3>服务分类</h3>
              <Button size="small" icon={<PlusOutlined />} onClick={() => message.info('新增分类开发中')}>
                新增分类
              </Button>
            </div>
            <div className="pool-category__list">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={category === item.name ? 'is-active' : ''}
                  onClick={() => handleCategoryClick(item.name)}
                >
                  <span>{item.name}</span>
                  <em>{item.count}</em>
                </button>
              ))}
            </div>
            <div className="pool-category__tip">
              <h4>集团服务池定义什么？</h4>
              <ul>
                <li>服务名称、编码与分类</li>
                <li>服务方式、集团价格与单位</li>
                <li>患者端封面、摘要和详情</li>
                <li>适用人群、服务时长与须知</li>
              </ul>
              <h4 className="is-danger">不在这里配置</h4>
              <p>机构服务半径、日容量、接单时间与预约上下架状态。</p>
            </div>
          </Card>

          <Card variant="borderless" className="list-card">
            <div className="list-card__header">
              <div>
                <span className="list-card__header__title">服务项目</span>
                <span className="list-card__header__tips">共 128 项 · 机构添加时继承集团基础信息与价格</span>
              </div>
              <Button onClick={openBatchOfflineModal}>批量停用</Button>
            </div>
            <Table<ServiceItem>
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={filteredData}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
              pagination={{ total: 128, pageSize: 6, current: 1, showSizeChanger: false }}
            />
          </Card>
        </div>
      </div>

      <Modal
        open={!!offlineTarget}
        title="下架服务"
        onCancel={() => setOfflineTarget(null)}
        footer={
          <div className="offline-modal__footer">
            <Button onClick={() => setOfflineTarget(null)}>取消</Button>
            <Button danger type="primary" onClick={handleConfirmOffline}>
              确认下架
            </Button>
          </div>
        }
      >
        {offlineTarget && (
          <div className="offline-modal">
            <div className="offline-modal__warning">
              <strong>下架后用户端将立即停止展示和预约</strong>
              <p>已产生的预约订单不受影响，仍按原履约流程处理。</p>
            </div>
            <div className="offline-modal__service">
              <span>{offlineTarget.title}</span>
              <span>{offlineTarget.code ?? `${offlineTarget.ids.length} 项`}</span>
            </div>
            <div className="offline-modal__reason">
              <label>下架原因 <i>*</i></label>
              <Input.TextArea
                rows={4}
                placeholder="请填写下架原因，至少 5 个字"
                value={offlineReason}
                onChange={(event) => setOfflineReason(event.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
