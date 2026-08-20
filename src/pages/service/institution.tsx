/**
 * 服务项目 - 机构服务
 * 按机构维度查看服务接入情况，并跳转机构详情维护单项配置
 */
import { useState, useMemo } from 'react'
import type { Key } from 'react'
import { Button, Card, Input, Modal, message, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer';
import type { ServiceItem, ServiceMode, ServiceStatus } from '@/api/modules/service'
import './institution.less';
import './list.less'

const statusText: Record<number, string> = {
  1: '可预约',
  2: '待上架',
  3: '已下架',
}

const modeClass: Record<ServiceMode, string> = {
  上门: 'home',
  到店: 'store',
  陪同: 'accompany',
}

const institutionOptions = [
  { label: '全部机构', value: 'all' },
  { label: '幸福里健康驿站', value: '幸福里健康驿站' },
  { label: '康乐护理院', value: '康乐护理院' },
  { label: '怡康护理院', value: '怡康护理院' },
  { label: '长青健康驿站', value: '长青健康驿站' },
  { label: '和悦护理院', value: '和悦护理院' },
  { label: '新赏护理院', value: '新赏护理院' },
]

const categories = [
  { name: '全部服务', count: 128 },
  { name: '生活照护', count: 38 },
  { name: '康复护理', count: 30 },
  { name: '健康管理', count: 24 },
  { name: '居家安全', count: 16 },
  { name: '陪诊出行', count: 20 },
]

interface ServiceFilters {
  keyword: string
  institution: string | 'all'
  mode: ServiceMode | 'all'
  status: number | 0
}

interface OfflineTarget {
  ids: string[]
  title: string
  code?: string
}

const mockServices: any[] = [
  {
    id: '1',
    code: 'FW0001',
    name: '上门助浴服务',
    institution: '幸福里健康驿站',
    address: '拱墅区·申花街道',
    categoryId: 'c1',
    categoryName: '生活照护',
    mode: '上门',
    price: 168,
    dailyCapacity: '8单/日',
    orderCount: 326,
    status: 1,
    description: '专业护理人员上门提供安全、舒适的助浴服务',
  },
  {
    id: '2',
    code: 'FW0002',
    name: '居家护理服务',
    institution: '康乐护理院',
    address: '西湖区·古荡街道',
    categoryId: 'c1',
    categoryName: '生活照护',
    mode: '上门',
    price: 198,
    dailyCapacity: '6单/日',
    orderCount: 156,
    status: 1,
  },
  {
    id: '3',
    code: 'FW0003',
    name: '术后康复训练',
    institution: '怡康护理院',
    address: '上城区·笕桥街道',
    categoryId: 'c2',
    categoryName: '康复护理',
    mode: '到店',
    price: 128,
    dailyCapacity: '12单/日',
    orderCount: 98,
    status: 1,
  },
  {
    id: '4',
    code: 'FW0004',
    name: '慢病健康随访',
    institution: '长青健康驿站',
    address: '滨江区·长河街道',
    categoryId: 'c3',
    categoryName: '健康管理',
    mode: '上门',
    price: 69,
    dailyCapacity: '5单/日',
    orderCount: 288,
    status: 1,
  },
  {
    id: '5',
    code: 'FW0005',
    name: '居家安全评估',
    institution: '和悦护理院',
    address: '萧山区·北干街道',
    categoryId: 'c4',
    categoryName: '居家安全',
    mode: '上门',
    price: 99,
    dailyCapacity: '7单/日',
    orderCount: 36,
    status: 2,
  },
  {
    id: '6',
    code: 'FW0006',
    name: '全程陪诊服务',
    institution: '新赏护理院',
    address: '萧山区·新街街道',
    categoryId: 'c5',
    categoryName: '陪诊出行',
    mode: '陪同',
    price: 268,
    dailyCapacity: '8单/日',
    orderCount: 64,
    status: 3,
  },
]

export default function ServiceInstitutionPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(mockServices)
  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState('all')
  const [mode, setMode] = useState<ServiceMode | 'all'>('all')
  const [status, setStatus] = useState<ServiceStatus | 'all'>('all')
  const [category, setCategory] = useState('')
  const [applied, setApplied] = useState<ServiceFilters>({
    keyword: '',
    institution: 'all',
    mode: 'all',
    status: 0,
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
      const categoryHit = applied.institution === 'all' || item.institution === applied.institution
      const modeHit = applied.mode === 'all' || item.mode === applied.mode
      const statusHit = applied.status === 0 || item.status === applied.status
      return keywordHit && categoryHit && modeHit && statusHit
    })
  }, [applied, data])

  const applyFilters = (next?: Partial<ServiceFilters>) => {
    setApplied({
      keyword: (next?.keyword ?? keyword).trim(),
      institution: next?.institution || 'all',
      mode: next?.mode ?? mode,
      status: next?.status ?? status,
    })
  }

  const handleReset = () => {
    setKeyword('')
    setInstitution('all')
    setMode('all')
    setStatus('all')
    setApplied({ keyword: '', institution: 'all', mode: 'all', status: 0 })
  }

  const handleCategoryClick = (name: string) => {
    setCategory(name)
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

  const columns = useMemo<ColumnsType<any>>(
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
        title: '服务机构',
        key: 'institution',
        render: (_, record) => (
          <div className="pool-service">
            <div>
              <strong>{record.institution}</strong>
              <span>{record.address}</span>
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
        title: '日容量',
        key: 'dailyCapacity',
        width: 120,
      },
      {
        title: '近30日订单',
        key: 'orderCount',
        width: 120,
      },
      {
        title: '预约状态',
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
              查看
            </Button>
            {record.status === 1 ? (
              <Button type="link" size="small" onClick={() => openOfflineModal(record)}>
                下架
              </Button>
            ) : (
              <Button type="link" size="small" onClick={() => handleEnable(record)}>
                上架
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
          批量上架
        </Button>
      }
    >
      <div className="service-pool service-institution">
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
            value={institution}
            onChange={(value) => {
              setInstitution(value)
              applyFilters({ institution: value })
            }}
            options={institutionOptions}
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
              { label: '全部上架 / 预约状态', value: 1 },
              { label: '待上架', value: 2 },
              { label: '已下架', value: 3 },
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
              <h4>分类维护说明</h4>
              <p>服务项目由集团统一维护；机构添加服务与默认配置在机构管理中完成，本页仅负责跨机构上架/下架。</p>
            </div>
          </Card>

          <Card variant="borderless" className="list-card" style={{marginTop: 0}}>
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
