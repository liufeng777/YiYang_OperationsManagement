/**
 * 服务项目 - 机构服务
 * 以机构为主体的主从视图：左侧选择机构，右侧维护该机构已接入服务的预约状态
 * 与集团服务池（服务定义视角）区分：本页不维护服务定义与分类，仅做跨机构状态运营
 * 当前为 mock 数据，后端就绪后替换为 serviceApi 的机构服务接口
 */
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Input, Modal, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowRightOutlined, BankOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ServiceMode } from '@/api/modules/service'
import './list.less'
import './institution.less'

/** 预约状态：1 可预约 / 2 待上架 / 3 已下架 */
type BookingStatus = 1 | 2 | 3

interface InstitutionService {
  id: string
  code: string
  name: string
  categoryName: string
  mode: ServiceMode
  price: number
  dailyCapacity: string
  orderCount: number
  status: BookingStatus
}

interface InstitutionEntry {
  id: string
  name: string
  address: string
  services: InstitutionService[]
}

interface ServiceFilters {
  keyword: string
  mode: ServiceMode | 'all'
  status: BookingStatus | 0
}

interface OfflineTarget {
  ids: string[]
  title: string
  code?: string
}

const statusText: Record<BookingStatus, string> = {
  1: '可预约',
  2: '待上架',
  3: '已下架',
}

const modeClass: Record<ServiceMode, string> = {
  上门: 'home',
  到店: 'store',
  陪同: 'accompany',
}

const mockInstitutions: InstitutionEntry[] = [
  {
    id: 'i1',
    name: '幸福里健康驿站',
    address: '拱墅区 · 申花街道',
    services: [
      { id: 's1', code: 'FW0001', name: '上门助浴服务', categoryName: '生活照护', mode: '上门', price: 168, dailyCapacity: '8 单/日', orderCount: 126, status: 1 },
      { id: 's2', code: 'FW0004', name: '慢病健康随访', categoryName: '健康管理', mode: '上门', price: 69, dailyCapacity: '12 单/日', orderCount: 54, status: 1 },
      { id: 's3', code: 'FW0007', name: '康复评定', categoryName: '康复护理', mode: '到店', price: 120, dailyCapacity: '6 单/日', orderCount: 18, status: 2 },
    ],
  },
  {
    id: 'i2',
    name: '康乐护理院',
    address: '西湖区 · 古荡街道',
    services: [
      { id: 's4', code: 'FW0002', name: '居家护理服务', categoryName: '生活照护', mode: '上门', price: 198, dailyCapacity: '10 单/日', orderCount: 98, status: 1 },
      { id: 's5', code: 'FW0008', name: '压疮护理', categoryName: '康复护理', mode: '上门', price: 150, dailyCapacity: '4 单/日', orderCount: 22, status: 1 },
    ],
  },
  {
    id: 'i3',
    name: '怡康护理院',
    address: '上城区 · 笕桥街道',
    services: [
      { id: 's6', code: 'FW0003', name: '术后康复训练', categoryName: '康复护理', mode: '到店', price: 128, dailyCapacity: '6 单/日', orderCount: 76, status: 1 },
      { id: 's7', code: 'FW0009', name: '中医理疗', categoryName: '健康管理', mode: '到店', price: 88, dailyCapacity: '10 单/日', orderCount: 41, status: 3 },
    ],
  },
  {
    id: 'i4',
    name: '长青健康驿站',
    address: '滨江区 · 长河街道',
    services: [
      { id: 's8', code: 'FW0005', name: '居家安全评估', categoryName: '居家安全', mode: '上门', price: 99, dailyCapacity: '5 单/日', orderCount: 21, status: 2 },
      { id: 's9', code: 'FW0004', name: '慢病健康随访', categoryName: '健康管理', mode: '上门', price: 69, dailyCapacity: '8 单/日', orderCount: 63, status: 1 },
    ],
  },
  {
    id: 'i5',
    name: '和悦护理院',
    address: '萧山区 · 北干街道',
    services: [
      { id: 's10', code: 'FW0006', name: '全程陪诊服务', categoryName: '陪诊出行', mode: '陪同', price: 268, dailyCapacity: '8 单/日', orderCount: 42, status: 3 },
    ],
  },
  {
    id: 'i6',
    name: '新赏护理院',
    address: '萧山区 · 新街街道',
    services: [
      { id: 's11', code: 'FW0001', name: '上门助浴服务', categoryName: '生活照护', mode: '上门', price: 168, dailyCapacity: '6 单/日', orderCount: 35, status: 1 },
      { id: 's12', code: 'FW0010', name: '就医陪同（半天）', categoryName: '陪诊出行', mode: '陪同', price: 158, dailyCapacity: '4 单/日', orderCount: 12, status: 2 },
    ],
  },
]

const countByStatus = (services: InstitutionService[], status: BookingStatus) =>
  services.filter((item) => item.status === status).length

export default function ServiceInstitutionPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [data, setData] = useState(mockInstitutions)
  const [instKeyword, setInstKeyword] = useState('')
  const [selectedId, setSelectedId] = useState(mockInstitutions[0].id)
  const [keyword, setKeyword] = useState('')
  const [mode, setMode] = useState<ServiceMode | 'all'>('all')
  const [status, setStatus] = useState<BookingStatus | 0>(0)
  const [applied, setApplied] = useState<ServiceFilters>({ keyword: '', mode: 'all', status: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [offlineTarget, setOfflineTarget] = useState<OfflineTarget | null>(null)
  const [offlineReason, setOfflineReason] = useState('')

  const visibleInstitutions = useMemo(
    () => data.filter((item) => !instKeyword.trim() || item.name.includes(instKeyword.trim())),
    [data, instKeyword],
  )

  const current = useMemo(
    () => data.find((item) => item.id === selectedId) ?? data[0],
    [data, selectedId],
  )

  const filteredServices = useMemo(() => {
    return current.services.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase())
      const modeHit = applied.mode === 'all' || item.mode === applied.mode
      const statusHit = applied.status === 0 || item.status === applied.status
      return keywordHit && modeHit && statusHit
    })
  }, [applied, current])

  const applyFilters = (next?: Partial<ServiceFilters>) => {
    setApplied({
      keyword: (next?.keyword ?? keyword).trim(),
      mode: next?.mode ?? mode,
      status: next?.status ?? status,
    })
  }

  const handleReset = () => {
    setKeyword('')
    setMode('all')
    setStatus(0)
    setApplied({ keyword: '', mode: 'all', status: 0 })
  }

  const handleSelectInstitution = (id: string) => {
    setSelectedId(id)
    setSelectedRowKeys([])
  }

  /** 更新当前机构内指定服务的状态 */
  const patchServiceStatus = (ids: string[], nextStatus: BookingStatus) => {
    setData((prev) =>
      prev.map((inst) =>
        inst.id === current.id
          ? {
              ...inst,
              services: inst.services.map((svc) =>
                ids.includes(svc.id) ? { ...svc, status: nextStatus } : svc,
              ),
            }
          : inst,
      ),
    )
  }

  const handleEnable = (record: InstitutionService) => {
    patchServiceStatus([record.id], 1)
    message.success(`「${record.name}」已上架，用户端恢复预约`)
  }

  const handleBatchEnable = () => {
    const ids = current.services
      .filter((item) => selectedRowKeys.includes(item.id) && item.status !== 1)
      .map((item) => item.id)
    if (!ids.length) {
      message.warning('请勾选待上架或已下架的服务')
      return
    }
    patchServiceStatus(ids, 1)
    setSelectedRowKeys([])
    message.success(`已批量上架 ${ids.length} 项服务`)
  }

  const openOfflineModal = (record: InstitutionService) => {
    setOfflineReason('')
    setOfflineTarget({ ids: [record.id], title: record.name, code: record.code })
  }

  const openBatchOfflineModal = () => {
    const ids = current.services
      .filter((item) => selectedRowKeys.includes(item.id) && item.status === 1)
      .map((item) => item.id)
    if (!ids.length) {
      message.warning('请勾选可预约状态的服务')
      return
    }
    setOfflineReason('')
    setOfflineTarget({ ids, title: `批量下架 ${ids.length} 项服务` })
  }

  const handleConfirmOffline = () => {
    if (!offlineTarget) return
    if (offlineReason.trim().length < 5) {
      message.warning('请填写下架原因，至少 5 个字')
      return
    }
    patchServiceStatus(offlineTarget.ids, 3)
    message.success(`已下架 ${offlineTarget.ids.length} 项服务`)
    setOfflineTarget(null)
    setSelectedRowKeys([])
  }

  const columns = useMemo<ColumnsType<InstitutionService>>(
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
        width: 100,
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
        dataIndex: 'dailyCapacity',
        key: 'dailyCapacity',
        width: 110,
      },
      {
        title: '近30日订单',
        dataIndex: 'orderCount',
        key: 'orderCount',
        width: 110,
      },
      {
        title: '预约状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: BookingStatus) => <span className={`pool-status pool-status--${value}`}>{statusText[value]}</span>,
      },
      {
        title: '操作',
        key: 'action',
        width: 130,
        render: (_, record) => (
          <div className="pool-actions">
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/institution/detail/${current.id}?tab=services`)}
            >
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current.id, navigate],
  )

  return (
    <PageContainer
      title="机构服务"
      description="以机构为主体管理已接入的服务项目；选择左侧机构后查看其服务，并进行上架 / 下架运营"
      extra={
        <Button type="primary" onClick={() => navigate('/service')}>
          进入集团服务池
        </Button>
      }
    >
      <div className="service-pool inst-service">
        <Card variant="borderless" className="filter-bar inst-service__filter">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索服务名称、项目编码"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => applyFilters()}
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
              { label: '全部预约状态', value: 0 },
              { label: '可预约', value: 1 },
              { label: '待上架', value: 2 },
              { label: '已下架', value: 3 },
            ]}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={() => applyFilters()}>查询</Button>
        </Card>

        <div className="inst-service__main">
          <Card variant="borderless" className="inst-panel">
            <div className="inst-panel__header">
              <h3>机构列表</h3>
              <span>{data.length} 家</span>
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索机构名称"
              value={instKeyword}
              onChange={(event) => setInstKeyword(event.target.value)}
            />
            <div className="inst-panel__list">
              {visibleInstitutions.map((inst) => {
                const orderTotal = inst.services.reduce((sum, svc) => sum + svc.orderCount, 0)
                return (
                  <button
                    type="button"
                    key={inst.id}
                    className={inst.id === current.id ? 'is-active' : ''}
                    onClick={() => handleSelectInstitution(inst.id)}
                  >
                    <div className="inst-panel__name">
                      <BankOutlined />
                      <strong>{inst.name}</strong>
                    </div>
                    <span className="inst-panel__addr">{inst.address}</span>
                    <div className="inst-panel__stats">
                      <span><i className="dot dot--on" />可预约 {countByStatus(inst.services, 1)}</span>
                      <span>待上架 {countByStatus(inst.services, 2)}</span>
                      <span>已下架 {countByStatus(inst.services, 3)}</span>
                    </div>
                    <span className="inst-panel__orders">近30日订单 {orderTotal}</span>
                  </button>
                )
              })}
              {!visibleInstitutions.length && (
                <p className="inst-panel__empty">未找到匹配机构</p>
              )}
            </div>
            <div className="inst-panel__tip">
              <h4>页面职责说明</h4>
              <p>服务定义由集团服务池统一维护；机构添加服务在「机构管理」中完成，本页仅负责跨机构的上架 / 下架运营。</p>
            </div>
          </Card>

          <Card variant="borderless" className="list-card inst-service__detail">
            <div className="list-card__header">
              <div>
                <span className="list-card__header__title">{current.name}</span>
                <span className="list-card__header__tips">
                  {current.address} · 已接入 {current.services.length} 项服务
                </span>
              </div>
              <div className="inst-service__actions">
                <Button
                  type="link"
                  className="list-card__header__link"
                  onClick={() => navigate(`/institution/detail/${current.id}?tab=services`)}
                >
                  进入机构详情
                  <ArrowRightOutlined />
                </Button>
                <Button onClick={handleBatchEnable}>批量上架</Button>
                <Button onClick={openBatchOfflineModal}>批量下架</Button>
              </div>
            </div>
            <Table<InstitutionService>
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={filteredServices}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
              pagination={false}
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
              <span>{current.name} · {offlineTarget.title}</span>
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
