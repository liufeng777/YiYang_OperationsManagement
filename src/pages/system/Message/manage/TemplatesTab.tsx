/**
 * 消息通知管理 - 消息模板（§9.2 / system:message-template）
 * 接口：GET /admin/message-templates、GET/POST /admin/message-templates、
 *      PUT/DELETE /admin/message-templates/{id}、POST /admin/message-templates/{id}/status
 * 字段对齐 swagger admin.ReqCreateMessageTemplate：
 *   必填 name / type / content；可选 code / title / channel / status / variables / remark
 * 说明：本页不再嵌在 Tabs 中（原 Tabs 隐藏态导致容器高度为 0，表格会先塌成一行再逐行撑开）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Drawer, Form, Input, Radio, Select, Space, Tag } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { messageApi } from '@/api'
import type { MessageTemplateDTO, MessageTemplateSaveBody } from '@/api/modules/message'
import type { CommonStatus } from '@/types/api'
import './TemplatesTab.less'

/** 发送渠道：1-站内 2-微信 3-短信（swagger channel，默认 1） */
const channelMap: Record<number, { text: string; color: string }> = {
  1: { text: '站内', color: 'blue' },
  2: { text: '微信', color: 'green' },
  3: { text: '短信', color: 'orange' },
}

/** 消息类型（swagger message_type 枚举，具体取值以后端返回为准） */
const templateTypeMap: Record<number, string> = {
  1: '订单支付成功',
  2: '服务开始提醒',
  3: '退款结果通知',
  4: '账户安全提醒',
}

/** 模板状态：1 启用 / 9 停用（后端 CommonStatus） */
const STATUS_ENABLED: CommonStatus = 1
const STATUS_DISABLED: CommonStatus = 9

const channelOptions = Object.entries(channelMap).map(([value, meta]) => ({
  label: meta.text,
  value: Number(value),
}))

const templateTypeOptions = Object.entries(templateTypeMap).map(([value, label]) => ({
  label,
  value: Number(value),
}))

interface TemplateFormValues {
  name: string
  type: number
  content: string
  code?: string
  title?: string
  channel?: number
  status?: CommonStatus
  variables?: string
  remark?: string
}

interface TemplateFilters {
  keyword: string
  template_type: number | null
  status: 'all' | 'enabled' | 'disabled'
}

const emptyFilters: TemplateFilters = { keyword: '', template_type: null, status: 'all' }

const PAGE_SIZE = 10

export default function TemplatesTab() {
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<MessageTemplateDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [templateType, setTemplateType] = useState<number | null>(null)
  const [status, setStatus] = useState<TemplateFilters['status']>('all')
  const [applied, setApplied] = useState<TemplateFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MessageTemplateDTO | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<TemplateFormValues>()

  /** 组装查询参数：type / status 下推后端（swagger query 均为字符串） */
  const buildParams = useCallback(
    (targetPage: number, filters: TemplateFilters, size: number = PAGE_SIZE) => ({
      page: targetPage,
      page_size: size,
      type: filters.template_type != null ? String(filters.template_type) : undefined,
      status:
        filters.status === 'all'
          ? undefined
          : filters.status === 'enabled'
            ? STATUS_ENABLED
            : STATUS_DISABLED,
    }),
    [],
  )

  const fetchList = useCallback(
    async (targetPage: number, filters: TemplateFilters, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await messageApi.getMessageTemplates(buildParams(targetPage, filters, size))
        setRows(res.list ?? [])
        setTotal(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setRows([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [buildParams],
  )

  useEffect(() => {
    void fetchList(1, emptyFilters, pageSize)
  }, [fetchList])

  const applyFilters = () => {
    const nextFilters: TemplateFilters = {
      keyword: keyword.trim(),
      template_type: templateType,
      status,
    }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters, pageSize)
  }

  const handleReset = () => {
    setKeyword('')
    setTemplateType(null)
    setStatus('all')
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  const openCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ status: STATUS_ENABLED, channel: 1 })
    setDrawerOpen(true)
  }

  const openEdit = (record: MessageTemplateDTO) => {
    setEditingRecord(record)
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      content: record.content,
      code: record.code,
      title: record.title,
      channel: record.channel ?? 1,
      status: record.status,
      variables: record.variables,
      remark: record.remark,
    })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingRecord(null)
    form.resetFields()
  }

  /** 保存：type / channel / status 按 swagger 传数字（channel 为必填以外的可选项） */
  const handleSave = async () => {
    let values: TemplateFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    const body: MessageTemplateSaveBody = {
      name: values.name.trim(),
      type: values.type,
      content: values.content.trim(),
      channel: values.channel ?? 1,
      status: values.status ?? STATUS_ENABLED,
      code: values.code?.trim() || undefined,
      title: values.title?.trim() || undefined,
      variables: values.variables?.trim() || undefined,
      remark: values.remark?.trim() || undefined,
    }
    setSubmitting(true)
    try {
      if (editingRecord) {
        await messageApi.updateMessageTemplate(editingRecord.id, body)
        message.success(`模板「${body.name}」已保存`)
      } else {
        await messageApi.createMessageTemplate(body)
        message.success(`模板「${body.name}」已创建`)
      }
      closeDrawer()
      void fetchList(page, applied, pageSize)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (record: MessageTemplateDTO) => {
    const next: CommonStatus = record.status === STATUS_ENABLED ? STATUS_DISABLED : STATUS_ENABLED
    try {
      await messageApi.updateMessageTemplateStatus(record.id, next)
      message.success(`「${record.name}」已${next === STATUS_ENABLED ? '启用' : '停用'}`)
      void fetchList(page, applied, pageSize)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }

  const confirmDelete = (record: MessageTemplateDTO) => {
    modal.confirm({
      title: `确认删除模板「${record.name}」？`,
      content: '删除后使用该模板的业务通知将无法发送，请确认无业务引用。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await messageApi.deleteMessageTemplate(record.id)
        message.success('模板已删除')
        void fetchList(page, applied, pageSize)
      },
    })
  }

  const columns = useMemo<ColumnsType<MessageTemplateDTO>>(
    () => [
      {
        title: '模板名称',
        key: 'name',
        width: 220,
        render: (_, record) => (
          <div className="template-name">
            <strong>{record.name}</strong>
            <span>{record.code || '—'}</span>
          </div>
        ),
      },
      {
        title: '模板内容',
        dataIndex: 'content',
        key: 'content',
        ellipsis: true,
        render: (value: string, record) => (
          <div className="template-content">
            <span>{value || '—'}</span>
            {record.title ? <em>标题：{record.title}</em> : null}
          </div>
        ),
      },
      {
        title: '消息类型',
        dataIndex: 'type',
        key: 'type',
        width: 140,
        render: (value: number) => templateTypeMap[value] ?? value ?? '—',
      },
      {
        title: '发送渠道',
        dataIndex: 'channel',
        key: 'channel',
        width: 110,
        render: (value: number) => {
          const meta = channelMap[value]
          return <Tag color={meta?.color ?? 'default'}>{meta?.text ?? value ?? '—'}</Tag>
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (value: CommonStatus) => (
          <span className={`status-btn status--${value === STATUS_ENABLED ? 'success' : 'cancel'}`}>
            {value === STATUS_ENABLED ? '启用' : '停用'}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_, record) => (
          <Space size={0}>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => void toggleStatus(record)}>
              {record.status === STATUS_ENABLED ? '停用' : '启用'}
            </Button>
            <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modal, message],
  )

  /** 关键字后端未提供查询参数，对当前页结果本地过滤 */
  const filteredRows = useMemo(() => {
    const kw = applied.keyword
    if (!kw) return rows
    return rows.filter(
      (r) => (r.name ?? '').includes(kw) || (r.code ?? '').includes(kw) || (r.title ?? '').includes(kw),
    )
  }, [rows, applied.keyword])

  return (
    <>
      <Card variant="borderless" className="filter-bar">
        <Input
          allowClear
          placeholder="请输入模板名称 / 编码 / 标题"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={applyFilters}
        />
        <Select
          value={templateType}
          onChange={(value) => setTemplateType(value ?? null)}
          allowClear
          placeholder="消息类型"
          options={templateTypeOptions}
        />
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '启用', value: 'enabled' },
            { label: '停用', value: 'disabled' },
          ]}
        />
        <Button onClick={handleReset}>重置</Button>
        <Button type="primary" onClick={applyFilters}>
          查询
        </Button>
      </Card>

      <Card variant="borderless" className="list-card list-card--fill">
        <div className="list-card__header">
          <div>
            <span className="list-card__header__title">消息模板</span>
            <span className="list-card__header__tips">共 {total} 个模板</span>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增模板
          </Button>
        </div>
        <FillTable<MessageTemplateDTO>
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={filteredRows}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
              void fetchList(nextPage, applied, nextPageSize)
            },
            showTotal: (count) => `共 ${count} 条`,
          }}
        />
      </Card>

      {/* 新增 / 编辑模板 */}
      <Drawer
        open={drawerOpen}
        width={560}
        title={
          <div className="template-drawer__title">
            <h3>{editingRecord ? '编辑消息模板' : '新建消息模板'}</h3>
            {editingRecord && (
              <span className="template-drawer__subtitle">
                {editingRecord.name} · {editingRecord.code || '—'}
              </span>
            )}
          </div>
        }
        onClose={closeDrawer}
        footer={
          <div className="template-drawer__footer">
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => void handleSave()}>
              保存
            </Button>
          </div>
        }
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} className="template-drawer__form">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, whitespace: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" maxLength={50} />
          </Form.Item>
          <div className="form-grid form-grid--two">
            <Form.Item
              name="type"
              label="消息类型"
              rules={[{ required: true, message: '请选择消息类型' }]}
            >
              <Select options={templateTypeOptions} placeholder="请选择消息类型" />
            </Form.Item>
            <Form.Item name="channel" label="发送渠道" extra="不选默认站内消息">
              <Select options={channelOptions} placeholder="请选择发送渠道" allowClear />
            </Form.Item>
          </div>
          <div className="form-grid form-grid--two">
            <Form.Item name="code" label="模板编码" extra="唯一标识，如 ORDER_PAID">
              <Input placeholder="可选" maxLength={50} />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Radio.Group
                options={[
                  { label: '启用', value: STATUS_ENABLED },
                  { label: '停用', value: STATUS_DISABLED },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="title" label="模板标题" extra="可含占位符，如：订单{order_no}支付成功">
            <Input placeholder="可选" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="content"
            label="模板内容"
            rules={[{ required: true, whitespace: true, message: '请输入模板内容' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="支持 {变量} 占位，如：您的服务订单 {order_no} 已支付成功"
            />
          </Form.Item>
          <Form.Item
            name="variables"
            label="模板变量"
            extra='变量列表（JSON 数组字符串），如 ["order_no","amount"]'
          >
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input placeholder="可选" maxLength={100} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
