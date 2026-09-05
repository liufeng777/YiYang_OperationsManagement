/**
 * 服务项目 - 集团服务池
 * 视觉对齐设计稿：顶部统计 + 筛选 + 左侧服务分类 + 右侧服务项目表格
 * 当前为 mock 数据，后端就绪后替换为 serviceApi.getServiceList
 */
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Input, Modal, Select, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ServiceItem } from '@/api/modules/service'
import './list.less'

export const statusText: Record<number, string> = {
  1: '启用',
  9: '停用'
}

export const typeText: Record<number, string> = {
  1: '上门',
  2: '到店',
}

const typeColor = ['', 'geekblue', 'purple']

export const categories = [
  { name: '全部服务', count: 128, id: 0 },
  { name: '生活照护', count: 38, id: 1},
  { name: '康复护理', count: 30, id: 2 },
  { name: '健康管理', count: 24, id: 3 },
  { name: '居家安全', count: 16, id: 4 },
  { name: '陪诊出行', count: 20, id: 5 },
]

const mockServices: ServiceItem[] = [
  {
    id: 1,
    code: 'FW0001',
    category_id: 1,
    service_type: 1,
    name: '上门助浴服务',
    name_en: '',
    description: '专业护理人员上门提供安全、舒适的助浴服务',
    price: 168,
    unit: '次',
    duration: 60,
    status: 1,
    vital_sign: [],
    is_consumable_supported: true,
    packages: [],
    service_process: '',
    cover_url: ''
  },
  {
    id: 2,
    code: 'FW0002',
    name: '居家护理服务',
    category_id: 1,
    service_type: 1,
    name_en: '',
    description: '专业护理人员上门提供安全、舒适的助浴服务',
    price: 168,
    unit: '次',
    duration: 60,
    status: 1,
    vital_sign: [],
    is_consumable_supported: true,
    packages: [],
    service_process: '',
    cover_url: ''
  },
  {
    id: 3,
    code: 'FW0003',
    name: '术后康复训练',
    category_id: 2,
    service_type: 2,
    name_en: '',
    description: '专业护理人员上门提供安全、舒适的助浴服务',
    price: 168,
    unit: '次',
    duration: 60,
    service_process: '',
    cover_url: '',
    status: 9,
    vital_sign: [],
    is_consumable_supported: true,
    packages: []
  },
  {
    id: 4,
    code: 'FW0004',
    name: '慢病健康随访',
    category_id: 3,
    service_type: 1,
    name_en: '',
    description: '专业护理人员上门提供安全、舒适的助浴服务',
    price: 168,
    unit: '次',
    duration: 60,
    status: 1,
    vital_sign: [],
    is_consumable_supported: true,
    packages: [],
    service_process: '',
    cover_url: ''
  },
  {
    id: 5,
    code: 'FW0005',
    name: '居家安全评估',
    category_id: 4,
    service_type: 1,
    name_en: '',
    description: '专业护理人员上门提供安全、舒适的助浴服务',
    price: 168,
    unit: '次',
    duration: 60,
    status: 9,
    vital_sign: [],
    is_consumable_supported: true,
    packages: [],
    service_process: '',
    cover_url: ''
  },
  {
    id: 6,
    code: 'FW0006',
    name: '全程陪诊服务',
    category_id: 5,
    service_type: 2,
    name_en: '',
    description: '专业护理人员上门提供安全、舒适的助浴服务',
    price: 168,
    unit: '次',
    duration: 60,
    status: 1,
    vital_sign: [],
    is_consumable_supported: true,
    packages: [],
    service_process: '',
    cover_url: ''
  },
]

interface ServiceFilters {
  keyword: string
  category: number
  type: number | null
  status: number | null
}

/** 上停用目标：action=offline 走「停用原因」流程，action=online 走确认启用流程 */
interface StatusTarget {
  ids: number[]
  title: string
  code?: string
  action: 'online' | 'offline'
}

export default function ServicePoolList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [data, setData] = useState(mockServices)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState(0)
  const [type, setType] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [applied, setApplied] = useState<ServiceFilters>({
    keyword: '',
    category: 0,
    type: null,
    status: null,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null)
  const [offlineReason, setOfflineReason] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase())
      const categoryHit = applied.category === 0 || item.category_id === applied.category
      const typeHit = !applied.type || item.service_type === applied.type
      const statusHit = !applied.status || item.status === applied.status
      return keywordHit && categoryHit && typeHit && statusHit
    })
  }, [applied, data])

  const metrics = [
    { key: 'all', label: '服务项目', value: 128, note: '集团统一定义' },
    { key: 'on', label: '已启用', value: 112, note: '机构可选择添加' },
    { key: 'draft', label: '草稿', value: 9, note: '尚未对机构开放' },
    { key: 'off', label: '已停用', value: 7, note: '不可新增使用' },
  ]

  /** 应用到过滤：把当前输入的筛选条件一次性生效（重置到第 1 页） */
  const applyFilters = () => {
    setPage(1)
    setApplied({
      keyword: keyword.trim(),
      category: category ?? 0,
      type: type ?? null,
      status: status ?? null,
    })
  }

  const handleReset = () => {
    setKeyword('')
    setCategory(0)
    setType(null)
    setStatus(null)
    setPage(1)
    setApplied({ keyword: '', category: 0, type: null, status: null })
  }

  /** 点击左侧分类仅更新选中态（与顶部 Select 联动），由「查询」应用过滤 */
  const handleCategoryClick = (id?: number) => {
    setCategory(id ?? 0)
    setPage(1)
  }

  /* 勾选服务的 status 一致性：一致才可批量启用/停用 */
  const selectedItems = useMemo(
    () => data.filter((item) => selectedRowKeys.includes(item.id)),
    [data, selectedRowKeys],
  )
  const selectedStatuses = useMemo(
    () => new Set(selectedItems.map((item) => item.status)),
    [selectedItems],
  )
  /** 勾选非空且状态一致时才允许批量操作 */
  const batchEnabled = selectedItems.length > 0 && selectedStatuses.size === 1
  /** 状态一致时的批量方向：已启用 → 批量停用；草稿/已停用 → 批量启用 */
  const batchAction: 'online' | 'offline' =
    selectedItems[0]?.status === 1 ? 'offline' : 'online'
  const batchTooltip = !selectedItems.length
    ? '请先勾选服务项目'
    : selectedStatuses.size > 1
      ? '所选择的服务状态不一致，无法批量启用/停用'
      : ''

  const openOfflineModal = (record: ServiceItem) => {
    setOfflineReason('')
    setStatusTarget({
      ids: [record.id],
      title: `集团服务池 · ${record.name}`,
      code: record.code,
      action: 'offline',
    })
  }

  const openBatchStatusModal = () => {
    if (!selectedItems.length) {
      message.warning('请先勾选服务项目')
      return
    }
    if (selectedStatuses.size > 1) {
      message.warning('所选择的服务状态不一致，无法批量启用/停用')
      return
    }
    const ids = selectedItems.map((item) => item.id)
    setOfflineReason('')
    setStatusTarget(
      batchAction === 'offline'
        ? { ids, title: `批量停用 ${ids.length} 项服务`, action: 'offline' }
        : { ids, title: `批量启用 ${ids.length} 项服务`, action: 'online' },
    )
  }

  const handleEnable = (record: ServiceItem) => {
    modal.confirm({
      title: '启用服务',
      content: `确认启用 “${record.name}” ？启用后机构可选择添加该服务。`,
      okText: '确认启用',
      cancelText: '取消',
      onOk: () => {
        setData((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, status: 1 } : item)),
        )
        message.success(`${record.name} 已启用`)
      },
    })
  }

  const handleConfirmStatusChange = () => {
    if (!statusTarget) return
    if (statusTarget.action === 'offline') {
      if (offlineReason.trim().length < 5) {
        message.warning('请填写停用原因，至少 5 个字')
        return
      }
      setData((prev) =>
        prev.map((item) => (statusTarget.ids.includes(item.id) ? { ...item, status: 9 } : item)),
      )
      message.success(`已停用 ${statusTarget.ids.length} 项服务`)
    } else {
      setData((prev) =>
        prev.map((item) => (statusTarget.ids.includes(item.id) ? { ...item, status: 1 } : item)),
      )
      message.success(`已启用 ${statusTarget.ids.length} 项服务`)
    }
    setStatusTarget(null)
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
              <span>{categories.find(v => v.id === record.category_id)?.name} · {record.code}</span>
            </div>
          </div>
        ),
      },
      {
        title: '服务方式',
        dataIndex: 'service_type',
        key: 'service_type',
        width: 110,
        render: (value: number) => <Tag variant='outlined' color={typeColor[value]}>{typeText[value]}</Tag>
      },
      {
        title: '集团定价',
        dataIndex: 'price',
        key: 'price',
        width: 110,
        render: (value: number, record) => `¥${value} / ${record.unit}`,
      },
      // {
      //   title: '使用机构',
      //   dataIndex: 'institutionCount',
      //   key: 'institutionCount',
      //   width: 100,
      //   render: (value: number) => `${value} 家`,
      // },
      // {
      //   title: '更新时间',
      //   key: 'updatedAt',
      //   width: 120,
      //   render: (_, record) => updateTimeMap[record.id] ?? '08-01 10:00',
      // },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => <span className={`status-btn status--${value === 1 ? 'success' : 'danger'}`}>{statusText[value]}</span>,
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_, record) => (
          <div className="pool-actions">
            <Button type="link" size="small" onClick={() => navigate(`/service/list/detail/${record.id}`)}>
              编辑
            </Button>
            {record.status === 1 ? (
              <Button type="link" size="small" danger onClick={() => openOfflineModal(record)}>
                停用
              </Button>
            ) : (
              <Button type="link" size="small" onClick={() => handleEnable(record)}>
                启用
              </Button>
            )}
            <Button type="link" size="small" danger onClick={() => {
              modal.confirm({
                title: '确认删除',
                content: `确认删除 “${record.name}” ？`,
                okText: '确认删除',
                cancelText: '取消',
                onOk: () => {
                  message.success('已确认删除（mock）')
                },
                okButtonProps: {
                  danger: true
                }
              })
            }}>
              删除
            </Button>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/service/list/detail/new')}>
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
            placeholder="搜索服务名称、编码"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => applyFilters()}
          />
          <Select
            allowClear
            value={category}
            placeholder="服务类型"
            onChange={(value) => setCategory(value ?? 0)}
            options={categories
              .filter((item) => item.id != null)
              .map((item) => ({ label: item.name, value: item.id as number }))}
          />
          <Select
            allowClear
            value={type}
            placeholder="服务方式"
            onChange={(value) => setType(value ?? null)}
            options={Object.entries(typeText).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
          />
          <Select
            allowClear
            value={status}
            placeholder="服务状态"
            onChange={(value) => setStatus(value ?? null)}
            options={Object.entries(statusText).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={() => applyFilters()}>查询</Button>
        </Card>

        <div className="service-pool__main">
          <Card variant="borderless" className="pool-category">
            <div style={{flex: 1}}>
            <div className="pool-category__header">
              <h3>服务分类</h3>
              <Button size="small" type='primary' icon={<PlusOutlined />} onClick={() => message.info('新增分类开发中')}>
                新增分类
              </Button>
            </div>
            <div className="pool-category__list">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={category === item.id ? 'is-active' : ''}
                  onClick={() => handleCategoryClick(item.id)}
                >
                  <span>{item.name}</span>
                  <em>{item.count}</em>
                </button>
              ))}
            </div>
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
              <p>机构服务半径、日容量、接单时间与预约上停用状态。</p>
            </div>
          </Card>

          <Card variant="borderless" className="list-card" style={{marginTop: 0}}>
            <div className="list-card__header">
              <div>
                <span className="list-card__header__title">服务项目</span>
              </div>
              <Tooltip title={batchTooltip}>
                {/* disabled 按钮不触发鼠标事件，需包一层 span 才能展示 Tooltip */}
                <span>
                  <Button disabled={!batchEnabled} onClick={openBatchStatusModal}>
                    批量启用/停用
                  </Button>
                </span>
              </Tooltip>
            </div>
            <Table<ServiceItem>
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={filteredData.slice((page - 1) * pageSize, page * pageSize)}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
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
      </div>

      <Modal
        open={!!statusTarget}
        title={statusTarget?.action === 'online' ? '启用服务' : '停用服务'}
        onCancel={() => setStatusTarget(null)}
        footer={
          <div className="offline-modal__footer">
            <Button onClick={() => setStatusTarget(null)}>取消</Button>
            {statusTarget?.action === 'online' ? (
              <Button type="primary" onClick={handleConfirmStatusChange}>
                确认启用
              </Button>
            ) : (
              <Button danger type="primary" onClick={handleConfirmStatusChange}>
                确认停用
              </Button>
            )}
          </div>
        }
      >
        {statusTarget && (
          <div className="offline-modal">
            {statusTarget.action === 'offline' ? (
              <>
                <div className="offline-modal__warning">
                  <strong>停用后用户端将立即停止展示和预约</strong>
                  <p>已产生的预约订单不受影响，仍按原履约流程处理。</p>
                </div>
                <div className="offline-modal__service">
                  <span>{statusTarget.title}</span>
                  <span>{statusTarget.code ?? `${statusTarget.ids.length} 项`}</span>
                </div>
                <div className="offline-modal__reason">
                  <label>停用原因 <i>*</i></label>
                  <Input.TextArea
                    rows={4}
                    placeholder="请填写停用原因，至少 5 个字"
                    value={offlineReason}
                    onChange={(event) => setOfflineReason(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="offline-modal__warning" style={{background: '#e8f4f0'}}>
                  <strong>启用后机构可选择添加该服务</strong>
                  <p>机构添加时继承集团基础信息与价格，再配置线上履约规则。</p>
                </div>
                <div className="offline-modal__service">
                  <span>{statusTarget.title}</span>
                  <span>{statusTarget.code ?? `${statusTarget.ids.length} 项`}</span>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
