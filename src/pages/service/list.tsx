/**
 * 服务项目 - 集团服务池
 * 视觉对齐设计稿：顶部统计 + 筛选 + 左侧服务分类 + 右侧服务项目表格
 * 数据来源：serviceApi.getServices / getServiceCategories / updateServiceStatus / batchUpdateServiceStatus / deleteService
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Dropdown, Input, Select, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, EllipsisOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { MenuProps } from 'antd'
import { serviceApi } from '@/api'
import type { CommonStatus } from '@/types/api'
import type { ServiceCategory, ServiceItem } from '@/api/modules/service'
import ServiceCategoryEditor, { type ServiceCategoryFill } from './components/ServiceCategoryEditor';
import StatusTargetModal from './components/StatusTargetModal'
import './list.less'

export const statusText: Record<number, string> = {
  1: '已启用',
  9: '已停用'
}

export const serviceTypeText: Record<number, any> = {
  1: {
    label: '上门',
    color: 'geekblue',
  },
  2: {
    label: '到店',
    color: 'purple',
  },
}

interface ServiceFilters {
  keyword: string
  category: number | null
  type: number | null
  status: number | null
}

/** 上停用目标：action=offline 走「停用原因」流程，action=online 走确认启用流程 */
export interface StatusTarget {
  ids: number[]
  title: string
  code?: string
  action: 'online' | 'offline'
}

export default function ServicePoolList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [data, setData] = useState<ServiceItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<number | null>(null)
  const [type, setType] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [applied, setApplied] = useState<ServiceFilters>({
    keyword: '',
    category: null,
    type: null,
    status: null,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10
  /** 服务分类（来自后端 /admin/service-categories） */
  const [catList, setCatList] = useState<ServiceCategory[]>([])
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)

  /** 拉取服务列表（keyword/category/status 由后端筛选） */
  const fetchList = useCallback(
    async (targetPage = page) => {
      setLoading(true)
      try {
        const result = await serviceApi.getServices({
          page: targetPage,
          page_size: pageSize,
          keyword: applied.keyword || undefined,
          category: applied.category ?? undefined,
          status: (applied.status ?? undefined) as CommonStatus | undefined,
        })
        setData(result.list ?? [])
        setTotal(result.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setData([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [applied, page],
  )

  /** 拉取服务分类（左侧分类列表与筛选项） */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await serviceApi.getServiceCategories({ page: 1, page_size: 100 })
      setCatList(res.list ?? [])
    } catch {
      setCatList([])
    }
  }, [])

  useEffect(() => {
    void fetchList(page)
  }, [fetchList, page])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

  /** 服务方式（type）后端不支持筛选，仅对当前页做过滤 */
  const filteredData = useMemo(() => {
    if (!applied.type) return data
    return data.filter((item) => item.service_type === applied.type)
  }, [applied.type, data])

  /** 顶部统计：服务总数取自后端 total，其余按当前页分布统计 */
  const metrics = useMemo(() => {
    const countBy = (target: number) => data.filter((item) => item.status === target).length
    return [
      { key: 'all', label: '服务项目', value: total, note: '集团统一定义' },
      { key: 'on', label: '已启用', value: countBy(1), note: '机构可选择添加' },
      { key: 'draft', label: '草稿', value: countBy(2), note: '尚未对机构开放' },
      { key: 'off', label: '已停用', value: countBy(9), note: '不可新增使用' },
    ]
  }, [data, total])

  /** 应用到过滤：把当前输入的筛选条件一次性生效（重置到第 1 页） */
  const applyFilters = () => {
    setPage(1)
    setApplied({
      keyword: keyword.trim(),
      category: category ?? null,
      type: type ?? null,
      status: status ?? null,
    })
  }

  const handleReset = () => {
    setKeyword('')
    setCategory(null)
    setType(null)
    setStatus(null)
    setPage(1)
    setApplied({ keyword: '', category: null, type: null, status: null })
  }

  /** 点击左侧分类仅更新选中态（与顶部 Select 联动），由「查询」应用过滤 */
  const handleCategoryClick = (id?: number | null) => {
    setCategory(id ?? null)
    setPage(1)
  }

  /* ---- 服务分类：新增 / 编辑 / 停用 ---- */
  const openCategoryCreate = () => {
    setEditingCategory(null)
    setCategoryEditorOpen(true)
  }
  const openCategoryEdit = (item: ServiceCategory) => {
    setEditingCategory(item)
    setCategoryEditorOpen(true)
  }
  /** 保存分类：新增 / 编辑（后端 PUT 为全量覆盖，需带全部字段） */
  const handleCategorySaved = async (values: ServiceCategoryFill) => {
    const payload = {
      name: values.name,
      name_en: values.name_en ?? '',
      code: values.code,
      brief: values.brief,
      brief_en: values.brief_en ?? '',
      sort_order: values.sort_order,
      status: values.status,
    }
    try {
      if (editingCategory) {
        await serviceApi.updateServiceCategory(editingCategory.id, payload)
        message.success('服务分类已更新')
      } else {
        await serviceApi.createServiceCategory(payload)
        message.success('服务分类已创建')
      }
      void fetchCategories()
    } catch {
      /* 错误提示由 request 拦截器统一提示 */
    }
  }
  /** 停用分类：后端无删除端点，改为禁用（status=9） */
  const confirmCategoryDelete = (item: ServiceCategory) => {
    modal.confirm({
      title: '确认停用分类',
      content: `确认停用服务分类“${item.name}”？停用后不影响已有服务，仅在新建服务时不再可选。`,
      okText: '确认停用',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await serviceApi.updateServiceCategoryStatus(item.id, 9)
          message.success(`已停用分类“${item.name}”`)
        } catch {
          /* 错误提示由 request 拦截器统一提示 */
        }
        if (category === item.id) {
          setCategory(null)
          setApplied((prev) => ({ ...prev, category: null }))
        }
        void fetchCategories()
      },
    })
  }
  const buildCategoryMenu = (item: ServiceCategory): MenuProps => ({
    items: [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => openCategoryEdit(item),
      },
      { type: 'divider' },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '停用',
        danger: true,
        onClick: () => confirmCategoryDelete(item),
      },
    ],
  })

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
    setStatusTarget({
      ids: [record.id],
      title: `集团服务池 · ${record.name}`,
      code: `${serviceTypeText[record.service_type]?.label ?? ''} · ${catList.find((v) => v.id === record.category_id)?.name ?? '未分类'}`,
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
      onOk: async () => {
        try {
          await serviceApi.updateServiceStatus(record.id, 1)
          message.success(`${record.name} 已启用`)
        } catch {
          /* 错误提示由 request 拦截器统一提示 */
        }
        void fetchList(page)
      },
    })
  }

  /** 单条/批量 上停用（批量走后端 batch-status） */
  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return
    const nextStatus: CommonStatus = statusTarget.action === 'offline' ? 9 : 1
    try {
      if (statusTarget.ids.length === 1) {
        await serviceApi.updateServiceStatus(statusTarget.ids[0], nextStatus)
      } else {
        await serviceApi.batchUpdateServiceStatus(statusTarget.ids, nextStatus)
      }
      message.success(
        statusTarget.action === 'offline'
          ? `已停用 ${statusTarget.ids.length} 项服务`
          : `已启用 ${statusTarget.ids.length} 项服务`,
      )
    } catch {
      /* 错误提示由 request 拦截器统一提示 */
    }
    setStatusTarget(null)
    setSelectedRowKeys([])
    void fetchList(page)
  }

  /** 删除服务（软删，后端校验无在途订单引用） */
  const handleDeleteService = (record: ServiceItem) => {
    modal.confirm({
      title: '确认删除',
      content: `确认删除 “${record.name}” ？删除后机构端将不可再使用该服务。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await serviceApi.deleteService(record.id)
          message.success(`已删除 “${record.name}”`)
        } catch {
          /* 错误提示由 request 拦截器统一提示 */
        }
        void fetchList(page)
      },
    })
  }

  const columns = useMemo<ColumnsType<ServiceItem>>(
    () => [
      {
        title: '服务项目',
        key: 'name',
        render: (_, record) => (
          <div className="pool-service">
            <div>
              <strong>{record.name}</strong>
              <span>
                {catList.find((v) => v.id === record.category_id)?.name ?? '—'}
                {/* {record.name_en ? ` · ${record.name_en}` : ''} */}
              </span>
            </div>
          </div>
        ),
      },
      {
        title: '服务方式',
        dataIndex: 'service_type',
        key: 'service_type',
        width: 110,
        render: (value: number) => <Tag variant='outlined' color={serviceTypeText[value].color}>{serviceTypeText[value].label}</Tag>
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
        render: (value: number) => <span className={`status-btn status--${value === 1 ? 'success' : 'danger'}`}>{statusText[value] ?? '已停用'}</span>,
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
            <Button type="link" size="small" danger onClick={() => handleDeleteService(record)}>
              删除
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, catList, page, fetchList],
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
            options={catList.map((item) => ({
              label: item.status === 9 ? `${item.name}（禁用）` : item.name,
              value: item.id,
            }))}
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
            <div className="pool-category__header">
              <h3>服务分类</h3>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCategoryCreate}>
                新增分类
              </Button>
            </div>
            <div className="pool-category__list">
              <button
                type="button"
                className={`pool-category__level${!category ? ' is-active' : ''}`}
                onClick={() => handleCategoryClick(null)}
              >
                <span>全部服务</span>
              </button>
              {catList.map((item) => (
                <div
                  key={item.id}
                  className={`pool-category__row${category === item.id ? ' is-active' : ''}`}
                  onClick={() => handleCategoryClick(item.id)}
                >
                  <span className="pool-category__name">
                    {item.brief ? <Tooltip>{item.name}</Tooltip> : <span>{item.name}</span>}
                  </span>
                  <Dropdown
                    menu={buildCategoryMenu(item)}
                    trigger={['click']}
                    // placement="bottomRight"
                  >
                    <Button
                      className="pool-category__more"
                      type="text"
                      icon={<EllipsisOutlined />}
                    />
                  </Dropdown>
                </div>
              ))}
            </div>
            {/* <div className="pool-category__tip">
              <h4>集团服务池定义什么？</h4>
              <ul>
                <li>服务名称、编码与分类</li>
                <li>服务方式、集团价格与单位</li>
                <li>患者端封面、摘要和详情</li>
                <li>适用人群、服务时长与须知</li>
              </ul>
              <h4 className="is-danger">不在这里配置</h4>
              <p>机构服务半径、日容量、接单时间与预约上停用状态。</p>
            </div> */}
          </Card>

          <Card variant="borderless" className="list-card" style={{marginTop: 0}}>
            <div className="list-card__header">
              <div>
                <span className="list-card__header__title">服务项目</span>
              </div>
              <Tooltip title={batchTooltip}>
                {/* disabled 按钮不触发鼠标事件，需包一层 span 才能展示 Tooltip */}
                <span>
                  <Button color="primary" variant="outlined" disabled={!batchEnabled} onClick={openBatchStatusModal}>
                    批量启用/停用
                  </Button>
                </span>
              </Tooltip>
            </div>
            <Table<ServiceItem>
              size="small"
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={filteredData}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
              pagination={{
                current: page,
                pageSize,
                total: applied.type ? filteredData.length : total,
                onChange: setPage,
                showTotal: (total) => `共 ${total} 条`
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

      <ServiceCategoryEditor
        open={categoryEditorOpen}
        category={editingCategory}
        onClose={() => setCategoryEditorOpen(false)}
        onSaved={handleCategorySaved}
      />
    </PageContainer>
  )
}
