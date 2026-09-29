/**
 * 会员管理 - 线索管理
 * 权威依据：《线索-前端对接与测试指南》（2026-09-26）
 * 列表 GET /admin/leads：分页 + keyword（姓名/手机号）+ 状态/来源/机构过滤（指南 §4.1）
 * 工具栏：新增线索（§4.2）/ CSV 导入（§4.9）/ CSV 导出（§4.10，携带当前过滤条件）
 * 状态枚举（指南 §2.1）：1-待跟进 2-跟进中 3-已转化 4-转化失败 9-流失（3/9 终态）
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Button, Card, Drawer, Form, Input, Select, Space } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { institutionApi, leadApi } from '@/api'
import type { InstitutionItem } from '@/api/modules/institution'
import type { LeadDTO, LeadListParams } from '@/api/modules/lead'
import { formatDateTime } from '@/utils'
import { LEAD_SOURCE_TEXT, LEAD_STATUS_TEXT, LEAD_TASK_TYPE_TEXT } from './constants'
import './index.less'

const DEFAULT_PAGE_SIZE = 10

interface LeadFilters {
  keyword: string
  status: number | null
  source_type: number | null
  institution_id: number | null
}

const emptyFilters: LeadFilters = {
  keyword: '',
  status: null,
  source_type: null,
  institution_id: null,
}

/** 将筛选条件转为接口入参 */
const toParams = (filters: LeadFilters): LeadListParams => ({
  keyword: filters.keyword || undefined,
  status: (filters.status ?? undefined) as LeadDTO['status'] | undefined,
  source_type: filters.source_type ?? undefined,
  institution_id: filters.institution_id ?? undefined,
})

interface CreateLeadForm {
  name: string
  phone: string
  source_type?: number
  institution_id?: number
  remark?: string
}

export default function LeadList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [rows, setRows] = useState<LeadDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  /** 顶部统计：全部 / 待跟进(1) / 跟进中(2) / 已转化(3) */
  // const [stats, setStats] = useState({ all: 0, pending: 0, following: 0, converted: 0 })

  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | null>(null)
  const [sourceType, setSourceType] = useState<number | null>(null)
  const [institutionId, setInstitutionId] = useState<number | null>(null)
  /** 机构筛选项（新增线索共用） */
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([])
  const [applied, setApplied] = useState<LeadFilters>(emptyFilters)
  /** 新增线索弹窗 */
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm<CreateLeadForm>()
  const [createSubmitting, setCreateSubmitting] = useState(false)
  /** CSV 导入 / 导出 */
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  /** 拉取线索列表（关键字/筛选全部走后端分页查询） */
  const fetchList = useCallback(async (targetPage: number, size: number, filters: LeadFilters) => {
    setLoading(true)
    try {
      const res = await leadApi.getLeads({
        page: targetPage,
        page_size: size,
        ...toParams(filters),
      })
      setRows(res.list ?? [])
      setTotal(res.total ?? 0)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList(1, DEFAULT_PAGE_SIZE, emptyFilters)
    /** 机构选项（筛选 + 新增线索共用，前 100 条） */
    void (async () => {
      try {
        const res = await institutionApi.getInstitutions({ page: 1, page_size: 100 })
        setInstitutions(res.list ?? [])
      } catch {
        setInstitutions([])
      }
    })()
  }, [fetchList])

  const applyFilters = () => {
    const nextFilters: LeadFilters = {
      keyword: keyword.trim(),
      status,
      source_type: sourceType,
      institution_id: institutionId,
    }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, pageSize, nextFilters)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus(null)
    setSourceType(null)
    setInstitutionId(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, pageSize, emptyFilters)
  }

  const refresh = () => {
    void fetchList(page, pageSize, applied)
  }

  /** 新增线索（指南 §4.2：name/phone 必填） */
  const handleCreate = async () => {
    let values: CreateLeadForm
    try {
      values = await createForm.validateFields()
    } catch {
      return
    }
    setCreateSubmitting(true)
    try {
      await leadApi.createLead({
        name: values.name.trim(),
        phone: values.phone.trim(),
        source_type: values.source_type,
        institution_id: values.institution_id,
        remark: values.remark?.trim() || undefined,
      })
      message.success('线索已创建')
      setCreateOpen(false)
      createForm.resetFields()
      setPage(1)
      void fetchList(1, pageSize, applied)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setCreateSubmitting(false)
    }
  }

  /** CSV 导入（指南 §4.9：仅 .csv，重复手机号跳过不报错） */
  const handleImportFile = async (file: File) => {
    if (!/\.csv$/i.test(file.name)) {
      message.warning('仅支持 .csv 文件')
      return
    }
    setImporting(true)
    try {
      await leadApi.importLeads(file)
      message.success('导入完成（重复手机号已自动跳过）')
      refresh()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setImporting(false)
    }
  }

  /** CSV 导出（指南 §4.10：文件流，携带当前过滤条件） */
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await leadApi.exportLeads(toParams(applied))
      const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? ''
      const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition)
      const filename = match
        ? decodeURIComponent(match[1])
        : `线索导出_${formatDateTime(Date.now(), 'YYYYMMDD-HHmm')}.csv`
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      /* 错误提示由 request 拦截器统一处理（blob 错误已解 JSON message） */
    } finally {
      setExporting(false)
    }
  }

  const columns: ColumnsType<LeadDTO> = [
    {
      title: '联系人',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        <div className="lead-contact">
          <strong>{record.name}</strong>
          <span>{record.phone || '—'}</span>
        </div>
      ),
    },
    {
      title: '任务类型',
      key: 'task_type',
      width: 120,
      render: (_, record) => LEAD_TASK_TYPE_TEXT[record.task_type] ?? record.task_type ?? '—',
    },
    {
      title: '线索来源',
      key: 'source_type',
      width: 110,
      render: (_, record) => LEAD_SOURCE_TEXT[record.source_type] ?? record.source_type ?? '—',
    },
    {
      title: '负责人',
      key: 'assignee',
      width: 110,
      render: (_, record) =>
        record.assignee_name || <span className="lead-owner--empty">待认领</span>,
    },
    {
      title: '线索状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <span className={`lead-status lead-status--${record.status}`}>
          {LEAD_STATUS_TEXT[record.status] ?? record.status}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: '创建时间',
      key: 'created_at',
      width: 150,
      render: (_, record) =>
        record.created_at ? formatDateTime(record.created_at * 1000, 'YYYY-MM-DD HH:mm') : '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/member/leads/detail/${record.id}`)}>
          查看详情
        </Button>
      ),
    },
  ]

  /** 顶部统计：全部线索取列表接口 total（真实数据）；分状态统计接口未提供，展示 — */
  const metrics = [
    { key: 'all', label: '全部线索', value: total, note: '运营线索总量', tone: 'success' },
    { key: 'pending', label: '待跟进', value: '—', note: '待认领的新线索', tone: 'warning' },
    { key: 'following', label: '跟进中', value: '—', note: '已认领正在跟进', tone: 'info' },
    { key: 'converted', label: '已转化', value: '—', note: '复核达成的线索', tone: 'success' },
  ]

  return (
    <PageContainer
      fixed
      title="线索管理"
      description="运营手动建档或事件自动建线，认领/转派后由负责人跟进，转化由系统按任务类型自动复核"
    >
      <div className="lead-list">
        <div className="metric-cards">
          {metrics.map((metric) => (
            <Card variant="borderless" className="metric-card" key={metric.key}>
              <div className="metric-card__head">
                <span className="metric-card__label">{metric.label}</span>
                <i className={`metric-card__icon status--${metric.tone}`}>
                  <BarChartOutlined />
                </i>
              </div>
              <strong className="metric-card__value">{metric.value}</strong>
              <em className={`metric-card__note status--${metric.tone}`}>{metric.note}</em>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar lead-list__filter">
          <Input
            allowClear
            placeholder="姓名 / 手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value ?? null)}
            options={Object.entries(LEAD_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="全部线索状态"
          />
          <Select
            value={sourceType}
            onChange={(value) => setSourceType(value ?? null)}
            options={Object.entries(LEAD_SOURCE_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="全部线索来源"
          />
          <Select
            value={institutionId}
            onChange={(value) => setInstitutionId(value ?? null)}
            options={institutions.map((item) => ({ label: item.name, value: item.id }))}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="全部机构"
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">运营线索列表</span>
              <span className="list-card__header__tips">
                {applied.keyword ? ` · 关键字“${applied.keyword}”` : ''}
              </span>
            </div>
            <div className="list-card__header__actions">
              <Button icon={<UploadOutlined />} loading={importing} onClick={() => fileInputRef.current?.click()}>
                CSV 导入
              </Button>
              <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
                导出 CSV
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                新增线索
              </Button>
            </div>
          </div>
          <FillTable<LeadDTO>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
                void fetchList(nextPage, nextPageSize, applied)
              },
              showTotal: (count) => `共 ${count} 条`,
            }}
          />
        </Card>
      </div>

      {/* CSV 导入隐藏文件框（指南 §4.9：仅 .csv） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void handleImportFile(file)
        }}
      />

      {/* 新增线索抽屉（指南 §4.2；新建/编辑统一使用 Drawer） */}
      <Drawer
        title="新增线索"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        width={480}
        destroyOnHidden
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button type="primary" loading={createSubmitting} onClick={handleCreate}>
              确认创建
            </Button>
          </Space>
        }
      >
        <Form form={createForm} layout="vertical" preserve={false} initialValues={{ source_type: 4 }}>
          <Form.Item name="name" label="联系人姓名" rules={[{ required: true, message: '请输入联系人姓名' }]}>
            <Input maxLength={50} placeholder="请输入联系人姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="联系电话"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
            ]}
          >
            <Input maxLength={11} placeholder="手机号用于线索去重与转化判定" />
          </Form.Item>
          <Form.Item name="source_type" label="线索来源">
            <Select
              options={Object.entries(LEAD_SOURCE_TEXT).map(([key, label]) => ({
                label,
                value: Number(key),
              }))}
              placeholder="请选择线索来源"
            />
          </Form.Item>
          <Form.Item name="institution_id" label="归属机构">
            <Select
              options={institutions.map((item) => ({ label: item.name, value: item.id }))}
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="请选择归属机构"
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={200} showCount placeholder="选填" />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
