/**
 * 服务项目 - 机构服务
 * 以机构为主体的主从视图：左侧选择机构，右侧维护该机构已接入服务的预约状态
 * 与集团服务池（服务定义视角）区分：本页不维护服务定义与分类，仅做跨机构状态运营
 * 接口逻辑：① 进入页面先拉机构列表渲染左侧；② 切换机构时携带机构 id 拉取其服务列表
 * 数据来源：institutionApi.getInstitutions / getInstitutionServiceList / updateInstitutionServiceStatus
 *           serviceApi.getServices / getServiceCategories（拼装服务名称与分类）
 */
import { useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Input, Select, Spin, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowRightOutlined, BankOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { useServiceInstitutionStore } from '@/store/modules/serviceInstitution'
import { institutionApi, serviceApi } from '@/api'
import type { CommonStatus } from '@/types/api'
import { typeText, typeColor } from '../list'
import StatusTargetModal from '../components/StatusTargetModal'
import '../list.less'
import './index.less'


/** 机构列表项：GET /admin/institutions 返回（聚合统计在服务拉取后回填） */
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
}

/** 机构已接入服务：机构服务关联 + 服务池明细拼装 */
interface InstitutionService {
  /** 关联记录 id（上下架/删除以此为准） */
  id: number
  service_id: number
  code: string
  name: string
  categoryName: string
  /** 服务方式：1 上门 / 2 到店 */
  type: number
  /** 机构价（price_override 为空时取集团价） */
  price: number
  unit: string
  /** 预约状态：1 可预约 / 9 已下架 */
  status: number
}

interface ServiceFilters {
  keyword: string
  type: number | null
  status: number | null
}

/** 机构服务预约状态（关联维度）：1-可预约 9-已下架 */
const instServiceStatusText: Record<number, string> = {
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

  /** 服务池与分类缓存：用于把机构服务关联拼装为可读行 */
  const [poolMap, setPoolMap] = useState<Map<number, { name: string; type: number; price: number; unit: string; category_id: number }>>(new Map())
  const [catMap, setCatMap] = useState<Map<number, string>>(new Map())

  // 接口①：进入页面拉取机构列表；完成后确定初始选中（URL 参数 > store 记忆 > 第一项）
  useEffect(() => {
    let cancelled = false
    setInstLoading(true)
    institutionApi
      .getInstitutions({ page: 1, page_size: 100 })
      .then((res) => {
        if (cancelled) return
        const list: InstitutionSummary[] = (res.list ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          address: [item.province, item.city, item.district, item.address].filter(Boolean).join(' · '),
          serviceCount: 0,
          onlineCount: 0,
          offlineCount: 0,
        }))
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

  // 服务池 + 分类：一次性拉取用于拼装服务名称/分类（机构服务关联接口只返回 service_id）
  useEffect(() => {
    void (async () => {
      try {
        const [poolRes, catRes] = await Promise.all([
          serviceApi.getServices({ page: 1, page_size: 100 }),
          serviceApi.getServiceCategories({ page: 1, page_size: 100 }),
        ])
        setPoolMap(
          new Map(
            (poolRes.list ?? []).map((item) => [
              item.id,
              {
                name: item.name,
                type: item.service_type,
                price: item.price,
                unit: item.unit,
                category_id: item.category_id,
              },
            ]),
          ),
        )
        setCatMap(new Map((catRes.list ?? []).map((item) => [item.id, item.name])))
      } catch {
        /* 拼装信息缺失时降级展示 */
      }
    })()
  }, [])

  // 接口②：选中机构后，携带机构 id 拉取其已接入服务列表
  useEffect(() => {
    if (selectedId == null) return
    let cancelled = false
    setServiceLoading(true)
    setServices([])
    setSelectedRowKeys([])
    institutionApi
      .getInstitutionServiceList(selectedId, { page: 1, page_size: 100 })
      .then((res) => {
        if (cancelled) return
        const list: InstitutionService[] = (res.list ?? []).map((item) => {
          const svc = poolMap.get(item.service_id)
          return {
            id: item.id,
            service_id: item.service_id,
            code: svc ? String(item.service_id) : '',
            name: svc?.name ?? `服务 ${item.service_id}`,
            categoryName: svc ? (catMap.get(svc.category_id) ?? '—') : '—',
            type: svc?.type ?? 1,
            price: item.price_override || svc?.price || 0,
            unit: svc?.unit ?? '次',
            status: item.status,
          }
        })
        setServices(list)
        // 回填左侧机构聚合统计
        setInstitutions((prev) =>
          prev.map((inst) =>
            inst.id === selectedId
              ? {
                  ...inst,
                  serviceCount: list.length,
                  onlineCount: list.filter((s) => s.status === 1).length,
                  offlineCount: list.filter((s) => s.status === 9).length,
                }
              : inst,
          ),
        )
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
        setServices([])
      })
      .finally(() => {
        if (!cancelled) setServiceLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, poolMap, catMap])

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
        title: '机构价',
        dataIndex: 'price',
        key: 'price',
        width: 120,
        render: (value: number, record) => `¥${value} / ${record.unit}`,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => (
          <span className={`status-btn status--${value === 1 ? 'success' : 'danger'}`}>
            {value === 1 ? '可预约' : '已下架'}
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

  /** 状态变更统一入口：调用机构服务关联的上下架接口，成功后重新拉取当前机构服务列表 */
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
    // 重新拉取（触发接口②）以同步列表与左侧聚合统计
    if (selectedId != null) {
      const res = await institutionApi.getInstitutionServiceList(selectedId, { page: 1, page_size: 100 })
      const list: InstitutionService[] = (res.list ?? []).map((item) => {
        const svc = poolMap.get(item.service_id)
        return {
          id: item.id,
          service_id: item.service_id,
          code: svc ? String(item.service_id) : '',
          name: svc?.name ?? `服务 ${item.service_id}`,
          categoryName: svc ? (catMap.get(svc.category_id) ?? '—') : '—',
          type: svc?.type ?? 1,
          price: item.price_override || svc?.price || 0,
          unit: svc?.unit ?? '次',
          status: item.status,
        }
      })
      setServices(list)
      setInstitutions((prev) =>
        prev.map((inst) =>
          inst.id === selectedId
            ? {
                ...inst,
                serviceCount: list.length,
                onlineCount: list.filter((s) => s.status === 1).length,
                offlineCount: list.filter((s) => s.status === 9).length,
              }
            : inst,
        ),
      )
    }
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
                      <span className="inst-panel__addr">{inst.address}</span>
                      <div className="inst-panel__stats">
                        <span><i className="dot dot--on" />可预约 {inst.onlineCount}</span>
                        <span>已下架 {inst.offlineCount}</span>
                      </div>
                      <span className="inst-panel__orders">已接入 {inst.serviceCount} 项服务</span>
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
        onOk={() => handleConfirmStatusChange()}
      />
    </PageContainer>
  )
}
