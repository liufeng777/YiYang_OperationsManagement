/**
 * 服务项目 - 机构服务
 * 以机构为主体的主从视图：左侧选择机构，右侧维护该机构已接入服务的预约状态
 * 与集团服务池（服务定义视角）区分：本页不维护服务定义与分类，仅做跨机构状态运营
 * 接口逻辑：① 进入页面先拉机构列表渲染左侧；② 切换机构时携带机构 id 拉取其服务列表
 * 数据来源：institutionApi.getInstitutions / getInstitutionServiceList / updateInstitutionServiceStatus
 *           机构服务列表接口已平铺返回服务名称、分类、服务方式、价格与单位，无需再调服务池 / 分类接口拼装
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Input, Select, Spin, Tag, Tooltip } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
// 注：ArrowRightOutlined 仅供已注释的「进入机构详情」按钮使用，恢复该按钮时需一并加回导入
import { BankOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { useServiceInstitutionStore } from '@/store/modules/serviceInstitution'
import { institutionApi } from '@/api'
import type { InstitutionServiceRow, InstitutionItem } from '@/api/modules/institution'
import type { CommonStatus } from '@/types/api'
import { serviceTypeText } from '../list'
import StatusTargetModal from '../components/StatusTargetModal'
import '../list.less'
import './index.less'

interface ServiceFilters {
  keyword: string
  type: number | null
  status: number | null
}

/** 机构服务预约状态（关联维度）：1-可预约 9-已下架 */
export const instServiceStatusText: Record<number, string> = {
  1: '可预约',
  9: '已下架',
}

/** 上下架目标：action=offline 走「下架原因」流程，action=online 走确认上架流程 */
interface StatusTarget {
  ids: number[]
  title: string
  code?: string
  action: 'online' | 'offline'
}

/** 机构价：price_override 为 0 表示沿用集团价 */
const resolvePrice = (row: InstitutionServiceRow) => row.price_override || row.price

/** 服务列表默认每页条数 */
const DEFAULT_PAGE_SIZE = 10

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
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([])
  const [instLoading, setInstLoading] = useState(true)
  /** 当前机构的服务列表（接口②）：行数据直接使用接口平铺字段，无需二次拼装 */
  const [services, setServices] = useState<InstitutionServiceRow[]>([])
  const [serviceLoading, setServiceLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [applied, setApplied] = useState<ServiceFilters>({ keyword: '', type: null, status: null })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null)
  /** 服务列表分页：page / pageSize 下推接口，total 取接口响应 */
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  /** 服务列表请求序号：仅最后一次请求生效，避免快速切换机构或翻页时旧响应覆盖新列表 */
  const serviceSeq = useRef(0)

  // 接口①：进入页面拉取机构列表；完成后确定初始选中（URL 参数 > store 记忆 > 第一项）
  useEffect(() => {
    let cancelled = false
    setInstLoading(true)
    institutionApi
      .getInstitutions({ page: 1, page_size: 1000 })
      .then((res) => {
        if (cancelled) return
        const list = res.list ?? []
        setInstitutions(list)
        const fromQuery = qsInst ? list.find((i) => i.id === Number(qsInst)) : undefined
        const fromStore = rememberedId ? list.find((i) => i.id === Number(rememberedId)) : undefined
        setSelectedId((fromQuery ?? fromStore ?? list[0])?.id ?? null)
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
        setInstitutions([])
      })
      .finally(() => {
        if (!cancelled) setInstLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 拉取指定机构的已接入服务列表（接口②）：分页与筛选条件一并下推接口，total 用响应值驱动分页器 */
  const loadServices = useCallback(
    async (
      institutionId: number,
      targetPage: number,
      targetPageSize: number,
      filters: ServiceFilters,
    ) => {
      const seq = ++serviceSeq.current
      setServiceLoading(true)
      setServices([])
      setSelectedRowKeys([])
      try {
        const res = await institutionApi.getInstitutionServiceList(institutionId, {
          page: targetPage,
          page_size: targetPageSize,
          keyword: filters.keyword || undefined,
          service_type: filters.type ?? undefined,
          status: (filters.status ?? undefined) as CommonStatus | undefined,
        })
        if (seq !== serviceSeq.current) return
        setServices(res.list ?? [])
        setTotal(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        if (seq !== serviceSeq.current) return
        setServices([])
        setTotal(0)
      } finally {
        if (seq === serviceSeq.current) setServiceLoading(false)
      }
    },
    [],
  )

  // 接口②：切换机构时回到第 1 页，携带机构 id / 分页 / 筛选条件拉取其已接入服务列表
  useEffect(() => {
    if (selectedId == null) return
    setPage(1)
    void loadServices(selectedId, 1, pageSize, applied)
    // 仅机构切换时重置页码；筛选条件变化由 applyFilters / handleReset 重新请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, loadServices])

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

  /** 当前页兜底过滤：筛选条件已下推接口，后端支持前对返回的本页数据再过滤一次，避免展示不匹配的行 */
  const filteredServices = useMemo(() => {
    return services.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.service_name.includes(applied.keyword) ||
        item.service_category_name.includes(applied.keyword)
      const typeHit = !applied.type || item.service_type === applied.type
      const statusHit = !applied.status || item.status === applied.status
      return keywordHit && typeHit && statusHit
    })
  }, [applied, services])

  const applyFilters = (next?: Partial<ServiceFilters>) => {
    const nextApplied: ServiceFilters = {
      keyword: (next?.keyword ?? keyword).trim(),
      type: next?.type ?? type,
      status: next?.status ?? status,
    }
    setApplied(nextApplied)
    // 筛选条件变化后回到第 1 页并重新请求
    setPage(1)
    if (selectedId != null) void loadServices(selectedId, 1, pageSize, nextApplied)
  }

  const handleReset = () => {
    const cleared: ServiceFilters = { keyword: '', type: null, status: null }
    setKeyword('')
    setType(null)
    setStatus(null)
    setApplied(cleared)
    setPage(1)
    if (selectedId != null) void loadServices(selectedId, 1, pageSize, cleared)
  }

  /** 翻页 / 改每页条数：保持当前机构的筛选条件重新请求 */
  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setPage(nextPage)
    if (nextPageSize !== pageSize) setPageSize(nextPageSize)
    if (selectedId == null) return
    void loadServices(selectedId, nextPage, nextPageSize, applied)
  }

  const handleSelectInstitution = (id: number) => {
    setSelectedId(id)
    // 记录到 store 并持久化：切到其它页面再回来仍定位到该机构
    rememberSelected(String(id))
  }

  const columns = useMemo<ColumnsType<InstitutionServiceRow>>(
    () => [
      {
        title: '服务项目',
        key: 'name',
        render: (_, record) => (
          <div className="pool-service">
            <div>
              <strong>{record.service_name}</strong>
              <span>{record.service_category_name}</span>
            </div>
          </div>
        ),
      },
      {
        title: '服务方式',
        dataIndex: 'service_type',
        key: 'service_type',
        width: 100,
        render: (value: number) => <Tag variant='outlined' color={serviceTypeText[value]?.color}>{serviceTypeText[value]?.label}</Tag>
      },
      {
        title: '机构价',
        key: 'price',
        width: 120,
        render: (_, record) => `¥${resolvePrice(record)} / ${record.unit}`,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => (
          <span className={`status-btn status--${value === 1 ? 'success' : 'danger'}`}>
            {instServiceStatusText[value]}
          </span>
        ),
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

  /** 状态变更统一入口：调用机构服务关联的上下架接口，成功后重新拉取当前机构当前页的服务列表 */
  const applyServiceStatus = async (ids: number[], nextStatus: CommonStatus) => {
    try {
      await Promise.all(ids.map((id) => institutionApi.updateInstitutionServiceStatus(id, nextStatus)))
      message.success(
        nextStatus === 1
          ? `已上架 ${ids.length} 项服务`
          : `已下架 ${ids.length} 项服务`,
      )
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
    // 重新拉取：保持当前页与筛选条件，同步列表与总数
    if (selectedId != null) {
      await loadServices(selectedId, page, pageSize, applied)
    }
  }

  const openOfflineModal = (record: InstitutionServiceRow) => {
    setStatusTarget({
      ids: [record.id],
      title: `${current?.name ?? ''} · ${record.service_name}`,
      code: record.service_category_name,
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

  const handleEnable = (record: InstitutionServiceRow) => {
    modal.confirm({
      title: '上架服务',
      content: `确认上架 “${record.service_name}” ？上架后用户端可预约该服务。`,
      okText: '确认上架',
      cancelText: '取消',
      onOk: async () => {
        await applyServiceStatus([record.id], 1)
      },
    })
  }

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return
    const nextStatus: CommonStatus = statusTarget.action === 'offline' ? 9 : 1
    await applyServiceStatus(statusTarget.ids, nextStatus)
    setStatusTarget(null)
    setSelectedRowKeys([])
  }


  return (
    <PageContainer
      fixed
      title="机构服务上下架"
      description="以机构为主体管理已接入的服务项目；选择左侧机构后查看其服务，并进行上架 / 下架运营"
    >
      <div className="service-pool inst-service">
        <Card variant="borderless" className="filter-bar inst-service__filter">
          <Input
            allowClear
            placeholder="搜索服务名称、服务分类"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => applyFilters()}
          />
          <Select
            allowClear
            value={type}
            placeholder="服务方式"
            onChange={(value) => setType(value ?? null)}
            options={Object.entries(serviceTypeText).map(([key, item]) => ({
              label: item.label,
              value: Number(key),
            }))}
          />
          <Select
            allowClear
            value={status}
            placeholder="服务状态"
            onChange={(value) => setStatus(value ?? null)}
            options={Object.entries(instServiceStatusText).map(([key, label]) => ({
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
                      <span className="inst-panel__addr">{[inst.province, inst.city, inst.district, inst.address].filter(Boolean).join(' · ')}</span>
                      {/* <div className="inst-panel__stats">
                        <span><i className="dot dot--on" />可预约 {inst.onlineCount}</span>
                        <span>已下架 {inst.offlineCount}</span>
                      </div>
                      <span className="inst-panel__orders">已接入 {inst.serviceCount} 项服务</span> */}
                    </button>
                  ))}
                  {!visibleInstitutions.length && (
                    <p className="inst-panel__empty">未找到匹配机构</p>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card variant="borderless" className="list-card list-card--fill inst-service__detail">
            <div className="list-card__header">
              <div>
                <span className="list-card__header__title">{current?.name ?? '—'}</span>
                {/* <span className="list-card__header__tips">
                  {current ? `${current.address} · 已接入 ${current.serviceCount} 项服务` : '机构加载中…'}
                </span> */}
              </div>
              <div className="inst-service__actions">
                {/* <Button
                  type="link"
                  className="list-card__header__link"
                  disabled={!current}
                  onClick={() => navigate(`/institution/detail/${selectedId}?tab=services`)}
                >
                  进入机构详情
                  <ArrowRightOutlined />
                </Button> */}
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
            <FillTable<InstitutionServiceRow>
              size="small"
              rowKey="id"
              loading={serviceLoading}
              columns={columns}
              dataSource={filteredServices}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
              pagination={{
                current: page,
                pageSize,
                total,
                onChange: handlePageChange,
                showTotal: (count) => `共 ${count} 条`,
              }}
            />
          </Card>
        </div>
      </div>

      <StatusTargetModal
        statusTarget={statusTarget}
        onCancel={() => setStatusTarget(null)}
        onOk={() => handleConfirmStatusChange()}
      />
    </PageContainer>
  )
}
