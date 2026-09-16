/**
 * 机构管理 - 机构列表
 * 视觉对齐设计稿：统计卡 + 筛选区 + 机构列表表格
 * 数据来源：institutionApi.getInstitutions（分页 + 类型/状态/关键字筛选）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Col, Input, Row, Select, Table, Tag, Space, Tooltip, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { institutionApi } from '@/api'
import type { InstitutionItem, InstitutionType, InstitutionStatus } from '@/api/modules/institution'
import './list.less'

type Tone = 'success' | 'info' | 'warning' | 'danger'

const typeText: Record<InstitutionType, string> = {
  1: '护理院',
  2: '驿站',
}

const statusText: Record<InstitutionStatus, string> = {
  1: '已启用',
  9: '已停用',
}

interface MetricCard {
  key: string
  label: string
  value: number
  badge: string
  tone: Tone
}

/** 上停用目标：action=offline 走「停用原因」流程，action=online 走确认启用流程 */
interface StatusTarget {
  ids: number[]
  title: string
  code?: string
  action: 'online' | 'offline'
}

export default function InstitutionList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [data, setData] = useState<InstitutionItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<InstitutionType | null>(null)
  const [status, setStatus] = useState<InstitutionStatus | null>(null)
  const [applied, setApplied] = useState<{
    keyword: string
    type: InstitutionType | null
    status: InstitutionStatus | null
  }>({ keyword: '', type: null, status: null })
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null)
  const [offlineReason, setOfflineReason] = useState('')

  /** 拉取机构列表（筛选条件由后端处理） */
  const fetchList = useCallback(
    async (targetPage = page) => {
      setLoading(true)
      try {
        const result = await institutionApi.getInstitutions({
          page: targetPage,
          page_size: pageSize,
          keyword: applied.keyword || undefined,
          type: applied.type ?? undefined,
          status: applied.status ?? undefined,
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

  useEffect(() => {
    void fetchList(page)
  }, [fetchList, page])

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
    ? '请先勾机构'
    : selectedStatuses.size > 1
      ? '所选择的机构状态不一致，无法批量启用/停用'
      : ''

  /** 顶部统计：按当前筛选条件下的机构总数分布（基于后端 total 与本页数据汇总） */
  const metrics: MetricCard[] = useMemo(() => {
    const normal = data.filter((item) => item.status === 1).length
    const paused = data.filter((item) => item.status === 9).length
    const nursingHome = data.filter((item) => item.type === 1).length
    const postStation = data.filter((item) => item.type === 2).length
    return [
      { key: 'nursingHome', label: '护理院', value: nursingHome, badge: '本页护理院数量', tone: 'info' },
      { key: 'postStation', label: '驿站', value: postStation, badge: '本页驿站数量', tone: 'info' },
      { key: 'normal', label: '正常经营', value: normal, badge: `当前筛选共 ${total} 家`, tone: 'success' },
      { key: 'paused', label: '暂停经营', value: paused, badge: '用户端已停止展示', tone: 'danger' },
    ]
  }, [data, total])

  const handleQuery = () => {
    setPage(1)
    setApplied({ keyword: keyword.trim(), type, status })
  }

  const handleReset = () => {
    setKeyword('')
    setType(null)
    setStatus(null)
    setPage(1)
    setApplied({ keyword: '', type: null, status: null })
  }

  const handleEnable = (record: InstitutionItem) => {
    modal.confirm({
      title: '启用机构',
      content: `确认启用 “${record.name}” ？`,
      okText: '确认启用',
      cancelText: '取消',
      onOk: async () => {
        try {
          await institutionApi.updateInstitutionStatus(record.id, 1)
          message.success(`${record.name} 已启用`)
        } catch {
          /* 拦截器已提示 */
        }
        void fetchList(page)
      },
    })
  }

  const handleDelete = (record: InstitutionItem) => {
    modal.confirm({
      title: `确认删除机构「${record.name}」？`,
      content: '移除后机构的所有信息将被清空，用户端不可查看和预约',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await institutionApi.deleteInstitution(record.id)
          message.success(`已删除「${record.name}」`)
        } catch {
          /* 拦截器已提示 */
        }
        void fetchList(page)
      },
    })
  }

  const columns = useMemo<ColumnsType<InstitutionItem>>(
    () => [
      {
        title: '机构',
        key: 'name',
        render: (_, record) => (
          <div className="institution-cell">
            <strong>{record.name}</strong>
            <span>{record.name_en || '—'}</span>
          </div>
        ),
      },
      {
        title: '经营地址',
        key: 'address',
        render: (_, record) => (
          <div className="institution-cell">
            <strong>{record.address}</strong>
            <span>{record.province}.{record.city}.{record.district}</span>
          </div>
        ),
      },
      { title: '联系电话', dataIndex: 'contact_phone', key: 'contact_phone', width: 150 },
      // {
      //   title: '已配服务',
      //   dataIndex: 'serviceCount',
      //   key: 'serviceCount',
      //   width: 90,
      //   render: (value: number) => (value ? `${value} 项` : '—'),
      // },
      // {
      //   title: '商品 / 服务',
      //   key: 'productService',
      //   width: 110,
      //   render: (_, record) => (
      //     <div className="institution-cell">
      //       <strong>{record.productCount} / {record.serviceTotal}</strong>
      //       <span>商品 / 服务</span>
      //     </div>
      //   ),
      // },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type: InstitutionType) => (
          <Tag color={type === 1 ? 'blue' : 'purple'} variant='outlined'>{typeText[type]}</Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: InstitutionStatus) => (
          <span className={`status-btn ${status === 1 ? 'status--success' : 'status--danger'}`}>{statusText[status]}</span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 180,
        render: (_, record) => (
          <Space>
            <Button type="link" size="small" onClick={() => navigate(`/institution/detail/${record.id}`)}>
              查看详情
            </Button>
            {record.status === 9 ? (
              <Button type="link" size="small" onClick={() => handleEnable(record)}>
                启用
              </Button>
            ) : <Button type="link" size="small" danger onClick={() => openOfflineModal(record)}>
              停用
            </Button>}
            <Button type="link" size="small" danger onClick={() => handleDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [message, navigate],
  )

  const openOfflineModal = (record: InstitutionItem) => {
    setOfflineReason('')
    setStatusTarget({
      ids: [record.id],
      title: `机构 · ${record.name}`,
      code: typeText[record.type],
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
        ? { ids, title: `批量停用 ${ids.length} 个机构`, action: 'offline' }
        : { ids, title: `批量启用 ${ids.length} 个机构`, action: 'online' },
    )
  }

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return
    const nextStatus: InstitutionStatus = statusTarget.action === 'offline' ? 9 : 1
    if (statusTarget.action === 'offline' && offlineReason.trim().length < 5) {
      message.warning('请填写停用原因，至少 5 个字')
      return
    }
    try {
      if (statusTarget.ids.length === 1) {
        await institutionApi.updateInstitutionStatus(statusTarget.ids[0], nextStatus)
      } else {
        await institutionApi.batchUpdateInstitutionStatus(statusTarget.ids, nextStatus)
      }
      message.success(
        statusTarget.action === 'offline'
          ? `已停用 ${statusTarget.ids.length} 个机构`
          : `已启用 ${statusTarget.ids.length} 个机构`,
      )
    } catch {
      /* 拦截器已提示 */
    }
    setStatusTarget(null)
    setSelectedRowKeys([])
    void fetchList(page)
  }

  return (
    <PageContainer
      title="机构管理"
      description="护理院与健康驿站作为自营机构参与平台经营，机构信息由平台直接维护"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/institution/create')}>
          添加机构
        </Button>
      }
    >
      <div className="institution-page">
        <Row gutter={[16, 16]}>
          {metrics.map((metric) => (
            <Col xs={24} sm={12} lg={6} key={metric.key}>
              <Card variant="borderless" className="metric-card">
                <div className="metric-card__head">
                  <span className="metric-card__label">{metric.label}</span>
                  <i className={`metric-card__icon status--${metric.tone}`}>
                    <BarChartOutlined />
                  </i>
                </div>
                <div className="metric-card__value">{metric.value}</div>
                <span className={`metric-card__note status--${metric.tone}`}>
                  {metric.badge}
                </span>
              </Card>
            </Col>
          ))}
        </Row>

        <Card variant="borderless" className="filter-bar">
          <Input
            allowClear
            placeholder="搜索机构名称、编码、地址"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={handleQuery}
          />
          <Select
            placeholder='机构类型'
            allowClear
            value={type}
            onChange={setType}
            options={([1, 2] as InstitutionType[]).map((key) => ({
              label: typeText[key],
              value: key,
            }))}
          />
          <Select
            placeholder='机构状态'
            allowClear
            value={status}
            onChange={setStatus}
            options={([1, 9] as InstitutionStatus[]).map((key) => ({
              label: statusText[key],
              value: key,
            }))}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={handleQuery}>查询</Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <span className='list-card__header__title'>机构列表</span>
            <Tooltip title={batchTooltip}>
              {/* disabled 按钮不触发鼠标事件，需包一层 span 才能展示 Tooltip */}
              <span>
                <Button disabled={!batchEnabled} onClick={openBatchStatusModal}>
                  批量启用/停用
                </Button>
              </span>
            </Tooltip>
          </div>
          <Table<InstitutionItem>
            rowKey="id"
            size='small'
            loading={loading}
            columns={columns}
            dataSource={data}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`
            }}
          />
        </Card>
      </div>

      <Modal
        open={!!statusTarget}
        title={statusTarget?.action === 'online' ? '启用机构' : '停用机构'}
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
                  <label>停用原因</label>
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
