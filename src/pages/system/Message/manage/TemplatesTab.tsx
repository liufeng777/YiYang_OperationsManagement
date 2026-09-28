/**
 * 消息通知管理 - 消息模板（§9.2 / system:message-template）
 * 数据来源：messageApi.getMessageTemplates / createMessageTemplate / updateMessageTemplate /
 *          updateMessageTemplateStatus / deleteMessageTemplate
 * 字段按后端实测：id / name / code / content / channel(数字) / type(数字) / status / variables
 * 筛选：关键字 / 类型 / 状态全部下推后端（前端不做本地过滤）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Drawer, Form, Input, Select, Space, Tag } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { messageApi } from '@/api'
import type { MessageTemplateDTO } from '@/api/modules/message'
import type { CommonStatus } from '@/types/api'
import './TemplatesTab.less'

/** 发送渠道（后端返回数字）：1-站内 2-微信 3-短信 */
const channelMap: Record<number, { text: string; color: string }> = {
  1: { text: '站内', color: 'blue' },
  2: { text: '微信', color: 'green' },
  3: { text: '短信', color: 'orange' },
}

/** 模板类型（后端返回数字，当前实测 1 与 2） */
const templateTypeMap: Record<number, string> = {
  1: '订单支付成功',
  2: '服务开始提醒',
  3: '退款结果通知',
  4: '账户安全提醒',
}

/** 模板状态：1 启用 / 9 停用（后端 CommonStatus） */
const STATUS_ENABLED: CommonStatus = 1
const STATUS_DISABLED: CommonStatus = 9

interface TemplateFormValues {
  name: string
  code: string
  content: string
  channel: number
  type: number
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

  /** 组装查询参数：筛选条件全部下推后端 */
  const buildParams = useCallback(
    (targetPage: number, filters: TemplateFilters, size: number = PAGE_SIZE) => ({
      page: targetPage,
      page_size: size,
      keyword: filters.keyword || undefined,
      template_type: filters.template_type ?? undefined,
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
    void fetchList(1, emptyFilters)
  }, [fetchList])

  const applyFilters = () => {
    const nextFilters: TemplateFilters = {
      keyword: keyword.trim(),
      template_type: templateType,
      status,
    }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setKeyword('')
    setTemplateType(null)
    setStatus('all')
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  const openCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const openEdit = (record: MessageTemplateDTO) => {
    setEditingRecord(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      content: record.content,
      channel: record.channel,
      type: record.type,
    })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingRecord(null)
    form.resetFields()
  }

  const handleSave = async () => {
    let values: TemplateFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSubmitting(true)
    try {
      if (editingRecord) {
        await messageApi.updateMessageTemplate(editingRecord.id, {
          name: values.name.trim(),
          content: values.content.trim(),
          channel: values.channel,
          type: values.type,
        })
        message.success(`模板「${values.name.trim()}」已保存`)
      } else {
        await messageApi.createMessageTemplate({
          name: values.name.trim(),
          code: values.code.trim(),
          content: values.content.trim(),
          channel: values.channel,
          type: values.type,
          status: STATUS_ENABLED,
        })
        message.success(`模板「${values.name.trim()}」已创建并启用`)
      }
      closeDrawer()
      void fetchList(page, applied)
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
      void fetchList(page, applied)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }

  const confirmDelete = (record: MessageTemplateDTO) => {
    modal.confirm({
      title: `确认删除模板「${record.name}」？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await messageApi.deleteMessageTemplate(record.id)
        message.success('模板已删除')
        void fetchList(page, applied)
      },
    })
  }

  const columns = useMemo<ColumnsType<MessageTemplateDTO>>(
    () => [
      {
        title: '模板名称',
        key: 'name',
        render: (_, record) => (
          <div className="template-name">
            <strong>{record.name}</strong>
            <span>{record.code}</span>
          </div>
        ),
      },
      { title: '模板内容', dataIndex: 'content', key: 'content', ellipsis: true },
      {
        title: '发送渠道',
        dataIndex: 'channel',
        key: 'channel',
        width: 110,
        render: (value: number) => {
          const meta = channelMap[value]
          return <Tag color={meta?.color ?? 'default'}>{meta?.text ?? value}</Tag>
        },
      },
      {
        title: '模板类型',
        dataIndex: 'type',
        key: 'type',
        width: 140,
        render: (value: number) => templateTypeMap[value] ?? value,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (value: CommonStatus) =>
          value === STATUS_ENABLED ? <Tag color="success">启用</Tag> : <Tag color="default">停用</Tag>,
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
            <Button type="link" size="small" onClick={() => toggleStatus(record)}>
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

  return (
    <>
      <div className="message-add-btn">
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增模板
        </Button>
      </div>
      <Card variant="borderless" className="filter-bar">
        <Input
          allowClear
          placeholder="请输入模板名称或编码"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={applyFilters}
        />
        <Select
          value={templateType}
          onChange={(value) => setTemplateType(value ?? null)}
          allowClear
          placeholder="模板类型"
          options={Object.entries(templateTypeMap).map(([value, label]) => ({
            label,
            value: Number(value),
          }))}
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
        </div>
        <FillTable<MessageTemplateDTO>
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage) => {
              setPage(nextPage)
              void fetchList(nextPage, applied)
            },
            showTotal: (count) => `共 ${count} 条`,
          }}
        />
      </Card>

      {/* 编辑/新建 Drawer */}
      <Drawer
        open={drawerOpen}
        width={560}
        title={
          <div className="template-drawer__title">
            <h3>{editingRecord ? '编辑消息模板' : '新建消息模板'}</h3>
            {editingRecord && (
              <span className="template-drawer__subtitle">
                {editingRecord.name} · {editingRecord.code}
              </span>
            )}
          </div>
        }
        onClose={closeDrawer}
        footer={
          <div className="template-drawer__footer">
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSave}>
              保存
            </Button>
          </div>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark={false} className="template-drawer__form">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="模板编码"
            extra="唯一标识，创建后不可修改"
            rules={[{ required: true, message: '请输入模板编码' }]}
          >
            <Input placeholder="如 ORDER_PAID" disabled={!!editingRecord} />
          </Form.Item>
          <div className="form-grid form-grid--two">
            <Form.Item name="channel" label="发送渠道" rules={[{ required: true, message: '请选择渠道' }]}>
              <Select
                options={Object.entries(channelMap).map(([value, meta]) => ({
                  label: meta.text,
                  value: Number(value),
                }))}
              />
            </Form.Item>
            <Form.Item name="type" label="模板类型" rules={[{ required: true, message: '请选择类型' }]}>
              <Select
                options={Object.entries(templateTypeMap).map(([value, label]) => ({
                  label,
                  value: Number(value),
                }))}
              />
            </Form.Item>
          </div>
          <Form.Item name="content" label="模板内容" rules={[{ required: true, message: '请输入模板内容' }]}>
            <Input.TextArea rows={4} placeholder="支持 {{变量}} 占位，如：您的服务订单{{order_no}}已支付成功" />
          </Form.Item>
          {editingRecord?.variables ? (
            <p className="template-drawer__hint">模板变量：{editingRecord.variables}</p>
          ) : null}
        </Form>
      </Drawer>
    </>
  )
}
