/**
 * 服务项目 - 机构服务
 * 以机构为主体的主从视图：左侧选择机构，右侧维护该机构已接入服务的预约状态
 * 与集团服务池（服务定义视角）区分：本页不维护服务定义与分类，仅做跨机构状态运营
 * 接口逻辑：① 进入页面先拉机构列表渲染左侧；② 切换机构时携带机构 id 拉取其服务列表
 * 当前为 mock（fetchInstitutions / fetchInstitutionServices），后端就绪后替换为 institutionApi / serviceApi
 */
import { useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Input, Select, Spin, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowRightOutlined, BankOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { useServiceInstitutionStore } from '@/store/modules/serviceInstitution';
import { typeText, statusText, typeColor } from '../list'
import StatusTargetModal from '../components/StatusTargetModal'
import '../list.less'
import './index.less'


/** 机构列表项：GET /admin/institutions 返回（含服务聚合统计，用于左侧列表展示） */
interface InstitutionSummary {
  id: number
  name: string
  address: string
  /** 已接入服务总数 */
  serviceCount: number
  /** 可预约（status=1）服务数 */
  onlineCount: number
  /** 已下架（status=9）服务数 */
  offlineCount: number
  /** 近 30 日订单 */
  orderCount30d: number
}

/** 机构已接入服务：GET /admin/institutions/:id/services 返回 */
interface InstitutionService {
  id: number
  code: string
  name: string
  categoryName: string
  /** 服务方式：1 上门 / 2 到店 */
  type: number
  price: number
  dailyCapacity: string
  orderCount: number
  /** 预约状态：1 可预约 / 9 已下架 */
  status: number
}

interface ServiceFilters {
  keyword: string
  type: number | null
  status: number | null
}

/** 上下架目标：action=offline 走「下架原因」流程，action=online 走确认上架流程 */
interface StatusTarget {
  ids: number[]
  title: string
  code?: string
  action: 'online' | 'offline'
}

/* ------------------------------------------------------------------ */
/* mock 数据：机构列表与「按机构 id 的服务列表」两张表分离，模拟真实接口形态  */
/* ------------------------------------------------------------------ */

const mockInstitutionList: InstitutionSummary[] = [
  { id: 1, name: '幸福里健康驿站', address: '拱墅区 · 申花街道', serviceCount: 3, onlineCount: 2, offlineCount: 1, orderCount30d: 198 },
  { id: 2, name: '康乐护理院', address: '西湖区 · 古荡街道', serviceCount: 2, onlineCount: 2, offlineCount: 0, orderCount30d: 120 },
  { id: 3, name: '怡康护理院', address: '上城区 · 笕桥街道', serviceCount: 2, onlineCount: 1, offlineCount: 1, orderCount30d: 117 },
  { id: 4, name: '长青健康驿站', address: '滨江区 · 长河街道', serviceCount: 2, onlineCount: 1, offlineCount: 1, orderCount30d: 84 },
  { id: 5, name: '和悦护理院', address: '萧山区 · 北干街道', serviceCount: 1, onlineCount: 0, offlineCount: 1, orderCount30d: 42 },
  { id: 6, name: '新赏护理院', address: '萧山区 · 新街街道', serviceCount: 2, onlineCount: 1, offlineCount: 1, orderCount30d: 47 },
]

const mockServiceMap: Record<number, InstitutionService[]> = {
  1: [
    { id: 101, code: 'FW0001', name: '上门助浴服务', categoryName: '生活照护', type: 1, price: 168, dailyCapacity: '8 单/日', orderCount: 126, status: 1 },
    { id: 102, code: 'FW0004', name: '慢病健康随访', categoryName: '健康管理', type: 1, price: 69, dailyCapacity: '12 单/日', orderCount: 54, status: 1 },
    { id: 103, code: 'FW0007', name: '康复评定', categoryName: '康复护理', type: 2, price: 120, dailyCapacity: '6 单/日', orderCount: 18, status: 9 },
  ],
  2: [
    { id: 201, code: 'FW0002', name: '居家护理服务', categoryName: '生活照护', type: 1, price: 198, dailyCapacity: '10 单/日', orderCount: 98, status: 1 },
    { id: 202, code: 'FW0008', name: '压疮护理', categoryName: '康复护理', type: 1, price: 150, dailyCapacity: '4 单/日', orderCount: 22, status: 1 },
  ],
  3: [
    { id: 301, code: 'FW0003', name: '术后康复训练', categoryName: '康复护理', type: 2, price: 128, dailyCapacity: '6 单/日', orderCount: 76, status: 1 },
    { id: 302, code: 'FW0009', name: '中医理疗', categoryName: '健康管理', type: 2, price: 88, dailyCapacity: '10 单/日', orderCount: 41, status: 9 },
  ],
  4: [
    { id: 401, code: 'FW0005', name: '居家安全评估', categoryName: '居家安全', type: 1, price: 99, dailyCapacity: '5 单/日', orderCount: 21, status: 9 },
    { id: 402, code: 'FW0004', name: '慢病健康随访', categoryName: '健康管理', type: 1, price: 69, dailyCapacity: '8 单/日', orderCount: 63, status: 1 },
  ],
  5: [
    { id: 501, code: 'FW0006', name: '全程陪诊服务', categoryName: '陪诊出行', type: 1, price: 268, dailyCapacity: '8 单/日', orderCount: 42, status: 9 },
  ],
  6: [
    { id: 601, code: 'FW0001', name: '上门助浴服务', categoryName: '生活照护', type: 1, price: 168, dailyCapacity: '6 单/日', orderCount: 35, status: 1 },
    { id: 602, code: 'FW0010', name: '就医陪同（半天）', categoryName: '陪诊出行', type: 2, price: 158, dailyCapacity: '4 单/日', orderCount: 12, status: 9 },
  ],
}

const mockDelay = <T,>(data: T, ms = 300) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(data), ms))

/** 模拟接口：获取机构列表（TODO: 替换为 institutionApi 的机构列表接口） */
const fetchInstitutions = () => mockDelay(mockInstitutionList)

/** 模拟接口：按机构 id 获取已接入服务列表（TODO: 替换为 serviceApi.getInstitutionServices） */
const fetchInstitutionServices = (institutionId: number) =>
  mockDelay(mockServiceMap[institutionId] ?? [])

const countByStatus = (services: InstitutionService[], status: number) =>
  services.filter((item) => item.status === status).length

export default function ServiceInstitutionPage() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  /** 从机构详情跳转时 URL 带 institution：本页据此自动选中对应机构 */
  const qsInst = searchParams.get('institution')
  const rememberSelected = useServiceInstitutionStore((s) => s.setSelectedServiceInstitutionId)
  const rememberedId = useServiceInstitutionStore((s) => s.selectedServiceInstitutionId)
  const [instKeyword, setInstKeyword] = useState('')
  /** 机构列表：进入页面先拉取（接口①），渲染左侧机构列表 */
  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([])
  const [instLoading, setInstLoading] = useState(true)
  /** 当前机构的服务列表：切换机构时携带机构 id 重新拉取（接口②） */
  const [services, setServices] = useState<InstitutionService[]>([])
  const [serviceLoading, setServiceLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [applied, setApplied] = useState<ServiceFilters>({ keyword: '', type: null, status: null })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null)

  // 接口①：进入页面拉取机构列表；完成后确定初始选中（URL 参数 > store 记忆 > 第一项）
  useEffect(() => {
    let cancelled = false
    setInstLoading(true)
    fetchInstitutions().then((list) => {
      if (cancelled) return
      setInstitutions(list)
      setInstLoading(false)
      const fromQuery = qsInst ? list.find((i) => i.id === Number(qsInst)) : undefined
      const fromStore = rememberedId ? list.find((i) => i.id === Number(rememberedId)) : undefined
      setSelectedId((fromQuery ?? fromStore ?? list[0])?.id ?? null)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 接口②：选中机构后，携带机构 id 拉取其已接入服务列表
  useEffect(() => {
    if (selectedId == null) return
    let cancelled = false
    setServiceLoading(true)
    setServices([])
    setSelectedRowKeys([])
    fetchInstitutionServices(selectedId).then((list) => {
      if (cancelled) return
      setServices(list)
      setServiceLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  // 从机构详情带参跳转：机构列表就绪后应用到选中态并写入 store
  useEffect(() => {
    if (!qsInst || !institutions.length) return
    const hit = institutions.find((i) => i.id === Number(qsInst))
    if (!hit) return
    setSelectedId(hit.id)
    rememberSelected(String(hit.id))
    setKeyword('')
    setType(null)
    setStatus(null)
    setApplied({ keyword: '', type: null, status: null })
  }, [qsInst, institutions, rememberSelected])

  const visibleInstitutions = useMemo(
    () =>
      institutions.filter((item) => !instKeyword.trim() || item.name.includes(instKeyword.trim())),
    [institutions, instKeyword],
  )

  const current = useMemo(
    () => institutions.find((item) => item.id === selectedId),
    [institutions, selectedId],
  )

  const filteredServices = useMemo(() => {
    return services.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase())
      const typeHit = !applied.type || item.type === applied.type
      const statusHit = !applied.status || item.status === applied.status
      return keywordHit && typeHit && statusHit
    })
  }, [applied, services])

  const applyFilters = (next?: Partial<ServiceFilters>) => {
    setApplied({
      keyword: (next?.keyword ?? keyword).trim(),
      type: next?.type ?? type,
      status: next?.status ?? status,
    })
  }

  const handleReset = () => {
    setKeyword('')
    setType(null)
    setStatus(null)
    setApplied({ keyword: '', type: null, status: null })
  }

  const handleSelectInstitution = (id: number) => {
    setSelectedId(id)
    // 记录到 store 并持久化：切到其它页面再回来仍定位到该机构
    rememberSelected(String(id))
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
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (value: number) => <Tag variant='outlined' color={typeColor[value]}>{typeText[value]}</Tag>
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
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => <span className={`status-btn status--${value === 1 ? 'success' : 'danger'}`}>{statusText[value]}</span>,
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
              onClick={() => navigate(`/institution/detail/${selectedId}?tab=services`)}
            >
              查看
            </Button>
            {record.status === 1 ? (
              <Button type="link" danger size="small" onClick={() => openOfflineModal(record)}>
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
    [selectedId, navigate],
  )

  /* 勾选服务的 status 一致性：一致才可批量上架/下架 */
  const selectedItems = useMemo(
    () => services.filter((item) => selectedRowKeys.includes(item.id)),
    [services, selectedRowKeys],
  )
  const selectedStatuses = useMemo(
    () => new Set(selectedItems.map((item) => item.status)),
    [selectedItems],
  )
  /** 勾选非空且状态一致时才允许批量操作 */
  const batchEnabled = selectedItems.length > 0 && selectedStatuses.size === 1
  /** 状态一致时的批量方向：已上架 → 批量下架；草稿/已下架 → 批量上架 */
  const batchAction: 'online' | 'offline' =
    selectedItems[0]?.status === 1 ? 'offline' : 'online'
  const batchTooltip = !selectedItems.length
    ? '请先勾选服务项目'
    : selectedStatuses.size > 1
      ? '所选择的服务状态不一致，无法批量上架/下架'
      : ''

  /** 状态变更统一入口：更新当前机构服务列表，并同步左侧机构聚合统计 */
  const applyServiceStatus = (ids: number[], nextStatus: number) => {
    const next = services.map((item) =>
      ids.includes(item.id) ? { ...item, status: nextStatus } : item,
    )
    setServices(next)
    if (selectedId != null) {
      setInstitutions((prev) =>
        prev.map((inst) =>
          inst.id === selectedId
            ? {
                ...inst,
                onlineCount: countByStatus(next, 1),
                offlineCount: countByStatus(next, 9),
              }
            : inst,
        ),
      )
    }
    // TODO: 接后端后调用 serviceApi.updateServiceStatus / batchUpdateServiceStatus
  }

  const openOfflineModal = (record: InstitutionService) => {
    setStatusTarget({
      ids: [record.id],
      title: `${current?.name ?? ''} · ${record.name}`,
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
      message.warning('所选择的服务状态不一致，无法批量上架/下架')
      return
    }
    const ids = selectedItems.map((item) => item.id)
    setStatusTarget(
      batchAction === 'offline'
        ? { ids, title: `批量下架 ${ids.length} 项服务`, action: 'offline' }
        : { ids, title: `批量上架 ${ids.length} 项服务`, action: 'online' },
    )
  }

  const handleEnable = (record: InstitutionService) => {
    modal.confirm({
      title: '上架服务',
      content: `确认上架 “${record.name}” ？上架后用户端可预约该服务。`,
      okText: '确认上架',
      cancelText: '取消',
      onOk: () => {
        applyServiceStatus([record.id], 1)
        message.success(`${record.name} 已上架`)
      },
    })
  }

  const handleConfirmStatusChange = (reason?: string) => {
    if (!statusTarget) return
    if (statusTarget.action === 'offline') {
      applyServiceStatus(statusTarget.ids, 9)
      message.success(`已下架 ${statusTarget.ids.length} 项服务`)
    } else {
      applyServiceStatus(statusTarget.ids, 1)
      message.success(`已上架 ${statusTarget.ids.length} 项服务`)
    }
    setStatusTarget(null)
    setSelectedRowKeys([])
  }
    

  return (
    <PageContainer
      title="机构服务上下架"
      description="以机构为主体管理已接入的服务项目；选择左侧机构后查看其服务，并进行上架 / 下架运营"
      // extra={
      //   <Button type="primary" onClick={() => navigate('/service')}>
      //     进入集团服务池
      //   </Button>
      // }
    >
      <div className="service-pool inst-service">
        <Card variant="borderless" className="filter-bar inst-service__filter">
          <Input
            allowClear
            placeholder="搜索服务名称、项目编码"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => applyFilters()}
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

        <div className="inst-service__main">
          <Card variant="borderless" className="inst-panel">
            <div className="inst-panel__header">
              <h3>机构列表</h3>
              <span>{institutions.length} 家</span>
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索机构名称"
              value={instKeyword}
              onChange={(event) => setInstKeyword(event.target.value)}
            />
            <div className="inst-panel__list">
              {instLoading ? (
                <p className="inst-panel__empty">
                  <Spin size="small" /> 机构列表加载中…
                </p>
              ) : (
                <>
                  {visibleInstitutions.map((inst) => (
                    <button
                      type="button"
                      key={inst.id}
                      className={inst.id === selectedId ? 'is-active' : ''}
                      onClick={() => handleSelectInstitution(inst.id)}
                    >
                      <div className="inst-panel__name">
                        <BankOutlined />
                        <strong>{inst.name}</strong>
                      </div>
                      <span className="inst-panel__addr">{inst.address}</span>
                      <div className="inst-panel__stats">
                        <span><i className="dot dot--on" />可预约 {inst.onlineCount}</span>
                        <span>已下架 {inst.offlineCount}</span>
                      </div>
                      <span className="inst-panel__orders">近30日订单 {inst.orderCount30d}</span>
                    </button>
                  ))}
                  {!visibleInstitutions.length && (
                    <p className="inst-panel__empty">未找到匹配机构</p>
                  )}
                </>
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
                <span className="list-card__header__title">{current?.name ?? '—'}</span>
                <span className="list-card__header__tips">
                  {current ? `${current.address} · 已接入 ${current.serviceCount} 项服务` : '机构加载中…'}
                </span>
              </div>
              <div className="inst-service__actions">
                <Button
                  type="link"
                  className="list-card__header__link"
                  disabled={!current}
                  onClick={() => navigate(`/institution/detail/${selectedId}?tab=services`)}
                >
                  进入机构详情
                  <ArrowRightOutlined />
                </Button>
                <Tooltip title={batchTooltip}>
                  {/* disabled 按钮不触发鼠标事件，需包一层 span 才能展示 Tooltip */}
                  <span>
                    <Button color="primary" variant="outlined" disabled={!batchEnabled} onClick={openBatchStatusModal}>
                      批量上架/下架
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>
            <Table<InstitutionService>
              size="small"
              rowKey="id"
              loading={serviceLoading}
              columns={columns}
              dataSource={filteredServices}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
              pagination={false}
            />
          </Card>
        </div>
      </div>

      <StatusTargetModal
        statusTarget={statusTarget}
        onCancel={() => setStatusTarget(null)}
        onOk={(reason?: string) => handleConfirmStatusChange(reason)}
      />
    </PageContainer>
  )
}
