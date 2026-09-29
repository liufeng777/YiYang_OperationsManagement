/**
 * 机构详情 - 服务项目 Tab
 * 机构已添加服务 + 添加服务项目 Drawer（从集团服务池勾选）+ 删除确认
 * 数据来源：institutionApi.getInstitutionServiceList / batchCreateInstitutionService / deleteInstitutionService
 *           serviceApi.getServices / getServiceCategories（服务池与分类）
 * 说明：
 * - 后端活动与机构服务为「关联表」模型（institution_service），添加 = 新增关联，删除 = 删除关联；
 * - 机构已添加服务为**服务端分页**列表（Tab 角标取接口 total）；
 * - 服务池仅在点击「添加服务项目」时**一次性拉取全量**，抽屉内的搜索与分类为前端过滤。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useServiceInstitutionStore } from '@/store/modules/serviceInstitution'
import { App, Alert, Button, Card, Checkbox, Drawer, Input, Modal, Select, Table, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, ArrowRightOutlined, PlusOutlined } from '@ant-design/icons'
import { institutionApi, serviceApi } from '@/api'
import type { InstitutionItem, InstitutionServiceRow } from '@/api/modules/institution'
import type { ServiceCategory, ServiceItem } from '@/api/modules/service'
import { serviceTypeText } from '@/pages/service/list'
import { instServiceStatusText } from '@/pages/service/institution'

interface ServicesTabProps {
  detail: InstitutionItem
  /** 服务项目数量回传给父级（Tab 角标） */
  onCountChange?: (count: number) => void
}

/** 已添加服务列表分页大小 */
const PAGE_SIZE = 10
/** 服务池一次性拉取条数（点击「添加服务项目」时请求全量，抽屉内本地筛选） */
const POOL_PAGE_SIZE = 1000

export default function ServicesTab({ detail, onCountChange }: ServicesTabProps) {
  const navigate = useNavigate()
  const { message } = App.useApp()

  const [rows, setRows] = useState<InstitutionServiceRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<InstitutionServiceRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /** 服务池（Drawer 内） */
  const [pool, setPool] = useState<ServiceItem[]>([])
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolKeyword, setPoolKeyword] = useState('')
  const [poolCategory, setPoolCategory] = useState<number | 'all'>('all')
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])

  /** 已添加服务：服务端分页查询（角标取 total） */
  const fetchRows = useCallback(
    async (targetPage = 1, size: number = PAGE_SIZE) => {
      if (!detail?.id) return
      setLoading(true)
      try {
        const res = await institutionApi.getInstitutionServiceList(detail.id, {
          page: targetPage,
          page_size: size,
        })
        setRows(res.list ?? [])
        setTotal(res.total ?? 0)
        onCountChange?.(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setRows([])
        setTotal(0)
        onCountChange?.(0)
      } finally {
        setLoading(false)
      }
    },
    [detail?.id, onCountChange],
  )

  useEffect(() => {
    setPage(1)
    void fetchRows(1, pageSize)
  }, [fetchRows])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await serviceApi.getServiceCategories({ page: 1, page_size: 100 })
      setCategories(res.list ?? [])
    } catch {
      setCategories([])
    } finally {
    }
  }, [])

  /** 服务池：仅在点击「添加服务项目」时请求一次（全量） */
  const fetchPool = useCallback(async () => {
    setPoolLoading(true)
    try {
      const res = await serviceApi.getServices({ page: 1, page_size: POOL_PAGE_SIZE })
      setPool(res.list ?? [])
    } catch {
      setPool([])
    } finally {
      setPoolLoading(false)
    }
  }, [])

  /** 打开「添加服务项目」Drawer：重置勾选与筛选，并拉取全量服务池 */
  const openPoolDrawer = () => {
    setSelectedServiceIds([])
    setPoolKeyword('')
    setPoolCategory('all')
    setDrawerOpen(true)
    void fetchPool()
    void fetchCategories()
  }

  /** 服务池前端过滤：名称 / 编码 + 分类 */
  const filteredPool = useMemo(() => {
    const kw = poolKeyword.trim().toLowerCase()
    return pool.filter((item) => {
      const keywordHit =
        !kw ||
        String(item.name ?? '').toLowerCase().includes(kw) ||
        String(item.code ?? '').toLowerCase().includes(kw)
      const categoryHit = poolCategory === 'all' || item.category_id === poolCategory
      return keywordHit && categoryHit
    })
  }, [pool, poolKeyword, poolCategory])

  const existingServiceIds = useMemo(() => new Set(rows.map((item) => item.service_id)), [rows])

  const togglePoolService = (id: number, checked: boolean) => {
    setSelectedServiceIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id),
    )
  }

  /** 添加服务：为每个选中服务新增一条机构服务关联 */
  const handleAddServices = async () => {
    const targets = selectedServiceIds.filter((id) => !existingServiceIds.has(id))
    if (!targets.length) {
      message.warning('所选服务均已添加，请选择其他服务')
      return
    }
    setSubmitting(true)
    try {
      const items = targets.map((serviceId) => ({
        service_id: serviceId,
        institution_id: detail.id,
      }))
      await institutionApi.batchCreateInstitutionService({
        institution_id: detail.id,
        items,
      })
      message.success(`已添加 ${targets.length} 项服务`)
      setDrawerOpen(false)
      setSelectedServiceIds([])
      setPage(1)
      void fetchRows(1, pageSize)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  /** 删除服务关联 */
  const handleDeleteService = async () => {
    if (!deleting) return
    try {
      await institutionApi.deleteInstitutionService(deleting.id)
      message.success(`已删除 ${deleting.service_name}`)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
    setDeleting(null)
    // 删除后如当前页已空则回退一页
    const nextPage = rows.length === 1 && page > 1 ? page - 1 : page
    setPage(nextPage)
    void fetchRows(nextPage)
  }

  /** 上架/下架机构服务（关联维度） */
  // const handleToggleStatus = (record: ServiceRow) => {
  //   const nextStatus = record.status === 1 ? 9 : 1
  //   modal.confirm({
  //     title: nextStatus === 9 ? '下架服务' : '上架服务',
  //     content: `确认${nextStatus === 9 ? '下架' : '上架'}「${record.service_name}」？`,
  //     okText: `确认${nextStatus === 9 ? '下架' : '上架'}`,
  //     cancelText: '取消',
  //     onOk: async () => {
  //       try {
  //         await institutionApi.updateInstitutionServiceStatus(record.id, nextStatus)
  //         message.success(`已${nextStatus === 9 ? '下架' : '上架'}「${record.service_name}」`)
  //       } catch {
  //         /* 错误提示由 request 拦截器统一处理 */
  //       }
  //       void fetchRows(page)
  //     },
  //   })
  // }

  const serviceColumns = useMemo<ColumnsType<InstitutionServiceRow>>(
    () => [
      {
        title: '服务项目',
        key: 'name',
        render: (_, record) => (
          <div className="service-cell">
            <strong>{record.service_name}</strong>
            <span>{record.service_category_name}</span>
          </div>
        ),
      },
      {
        title: '服务方式',
        key: 'service_type',
        dataIndex: 'service_type',
        render: (value: number) => <Tag variant='outlined' color={serviceTypeText[value]?.color}>{serviceTypeText[value]?.label}</Tag>,
      },
      {
        title: '定价',
        key: 'price',
        render: (_, record) => `¥${record.price} / ${record.unit}`,
      },
      {
        title: '状态',
        key: 'status',
        dataIndex: 'status',
        render: (value: number) => (
          <span className={`status-btn status--${value === 1 ? 'success' : 'cancel'}`}>
            {instServiceStatusText[value]}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: (_, record) => (
          <div className="service-actions">
            {/* <Button type="link" size="small" onClick={() => handleToggleStatus(record)}>
              {record.status === 1 ? '下架' : '上架'}
            </Button> */}
            <Button type="link" size="small" danger onClick={() => setDeleting(record)}>
              删除
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  )

  const poolColumns = useMemo(
    () => [
      {
        title: '',
        key: 'checked',
        width: 44,
        render: (_: unknown, record: ServiceItem) => {
          const added = existingServiceIds.has(record.id)
          return (
            <Checkbox
              disabled={added}
              checked={added || selectedServiceIds.includes(record.id)}
              onChange={(event) => togglePoolService(record.id, event.target.checked)}
            />
          )
        },
      },
      {
        title: '服务项目',
        key: 'name',
        render: (_: unknown, record: ServiceItem) => (
          <div className="service-cell">
            <strong>{record.name}</strong>
            <span>{categories.find((item) => item.id === record.category_id)?.name ?? '—'}</span>
          </div>
        ),
      },
      {
        title: '服务方式',
        key: 'service_type',
        dataIndex: 'service_type',
        width: 100,
        render: (value: number) => <Tag variant='outlined' color={serviceTypeText[value]?.color}>{serviceTypeText[value]?.label}</Tag>,
      },
      {
        title: '集团定价',
        key: 'price',
        width: 120,
        render: (_: unknown, record: ServiceItem) => `¥${record.price} / ${record.unit}`,
      },
      {
        title: '选择状态',
        key: 'selected',
        width: 100,
        render: (_: unknown, record: ServiceItem) => {
          // 三态区分：已添加（完成，绿）/ 已选择（本次已勾选，蓝）/ 未选择（灰）
          const added = existingServiceIds.has(record.id)
          const checked = selectedServiceIds.includes(record.id)
          const tone = added ? 'success' : checked ? 'info' : 'cancel'
          const label = added ? '已添加' : checked ? '已选择' : '未选择'
          return <span className={`status-btn status--${tone}`}>{label}</span>
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedServiceIds, existingServiceIds, categories],
  )

  return (
    <>
      <Card variant="borderless" className="detail-card">
        <div className="detail-card__header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3>机构已添加服务</h3>
            <Button
              type="link"
              style={{ fontSize: 12 }}
              onClick={() => {
                // 记录到机构选择 store 并持久化：目标页据此定位（不依赖 URL 参数）
                if (detail?.id != null) {
                  useServiceInstitutionStore.getState().setSelectedServiceInstitutionId(String(detail.id))
                }
                navigate('/service/institution')
              }}
            >
              前往服务项目管理上下架服务
              <ArrowRightOutlined />
            </Button>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openPoolDrawer}>
            添加服务项目
          </Button>
        </div>
        <Table<InstitutionServiceRow>
          rowKey="id"
          size="small"
          loading={loading}
          columns={serviceColumns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (count) => `共 ${count} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
              void fetchRows(nextPage, nextPageSize)
            },
          }}
        />
      </Card>

      <Drawer
        width={720}
        open={drawerOpen}
        rootClassName="service-drawer"
        onClose={() => setDrawerOpen(false)}
        title={
          <div className="service-drawer__title">
            <h3>添加服务项目</h3>
            <p>从集团服务池选择，可勾选一项或多项</p>
          </div>
        }
        footer={
          <div className="service-drawer__footer">
            <span>已选择 {selectedServiceIds.length} 项服务</span>
            <div>
              <Button onClick={() => setDrawerOpen(false)}>取消</Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={submitting}
                onClick={handleAddServices}
              >
                确认添加 {selectedServiceIds.length} 项
              </Button>
            </div>
          </div>
        }
      >
          <Alert
            className="service-drawer__alert"
            type="info"
            showIcon
            message={
              <span>
                <strong>{detail.name}</strong> 所选服务将自动继承机构默认预约配置与线上履约范围
              </span>
            }
          />
          <div className="service-drawer__search">
            <Input
              allowClear
              placeholder="搜索服务名称、项目编码"
              value={poolKeyword}
              onChange={(event) => setPoolKeyword(event.target.value)}
            />
            <Select
              value={poolCategory}
              onChange={setPoolCategory}
              options={[
                { label: '全部分类', value: 'all' as const },
                ...categories.map((item) => ({ label: item.name, value: item.id })),
              ]}
            />
          </div>
          <div className="service-drawer__categories">
            <button
              type="button"
              className={poolCategory === 'all' ? 'is-active' : ''}
              onClick={() => setPoolCategory('all')}
            >
              全部
            </button>
            {categories.map((item) => (
              <button
                type="button"
                key={item.id}
                className={poolCategory === item.id ? 'is-active' : ''}
                onClick={() => setPoolCategory(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <Table<ServiceItem>
            rowKey="id"
            size="small"
            loading={poolLoading}
            columns={poolColumns}
            dataSource={filteredPool}
            pagination={false}
          />
      </Drawer>

      <Modal
        open={!!deleting}
        title="删除服务项目"
        onCancel={() => setDeleting(null)}
        footer={
          <div className="delete-modal__footer">
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button danger type="primary" onClick={handleDeleteService}>
              确认删除
            </Button>
          </div>
        }
      >
        {deleting && (
          <div className="delete-modal">
            <div className="delete-modal__warning">
              <strong>确认从该机构删除此服务项目？</strong>
              <p>删除仅解除机构关联，不删除集团服务定义；历史订单仍可查询。</p>
            </div>
            <div className="delete-modal__service">
              <span>
                {detail.name} · {deleting.service_name}
              </span>
              <span>
                {deleting.service_category_name} · 关联 #{deleting.id}
              </span>
            </div>
            <div className="delete-modal__conditions">
              <p>
                删除条件 <Tag color="green">已满足</Tag>
              </p>
              <div>
                <span>
                  <CheckOutlined /> 删除前请确认服务已下架
                </span>
                <span>
                  <CheckOutlined /> 当前机构无待履约订单
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
