/**
 * 消息通知管理 - 站内消息（§9.1 / system:message）
 * 数据来源：messageApi.getMessages / sendMessage / pushMessage
 * 说明：后端当前列表为空，字段按接口文档契约；关键字 / 类型 / 已读状态全部下推后端（前端不做本地过滤）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Drawer, Form, Input, Radio, Select, Space, Tag } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { memberApi, messageApi } from '@/api'
import type { MessageDTO } from '@/api/modules/message'
import { formatDateTime } from '@/utils'

const messageTypeMap: Record<number, { text: string; color: string }> = {
  1: { text: '业务通知', color: 'blue' },
  2: { text: '系统提醒', color: 'orange' },
  3: { text: '运营消息', color: 'purple' },
}

interface MessageFormValues {
  title: string
  content: string
  message_type: number
  send_mode: 'broadcast' | 'target'
  receiver_ids?: number[]
}

interface MessageFilters {
  keyword: string
  message_type: number | null
  is_read: 'all' | 'unread' | 'read'
}

const emptyFilters: MessageFilters = { keyword: '', message_type: null, is_read: 'all' }

const PAGE_SIZE = 10

export default function MessagesTab() {
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<MessageDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [messageType, setMessageType] = useState<number | null>(null)
  const [isRead, setIsRead] = useState<MessageFilters['is_read']>('all')
  const [applied, setApplied] = useState<MessageFilters>(emptyFilters)
  const [sendOpen, setSendOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [members, setMembers] = useState<Array<{ label: string; value: number }>>([])
  const [form] = Form.useForm<MessageFormValues>()
  const [sendMode, setSendMode] = useState<'broadcast' | 'target'>('broadcast')
  const [page, setPage] = useState(1)

  /** 组装查询参数：筛选条件全部下推后端 */
  const buildParams = useCallback(
    (targetPage: number, filters: MessageFilters) => ({
      page: targetPage,
      page_size: PAGE_SIZE,
      keyword: filters.keyword || undefined,
      message_type: filters.message_type ?? undefined,
      is_read: filters.is_read === 'all' ? undefined : ((filters.is_read === 'read' ? 1 : 0) as 0 | 1),
    }),
    [],
  )

  const fetchList = useCallback(
    async (targetPage: number, filters: MessageFilters) => {
      setLoading(true)
      try {
        const res = await messageApi.getMessages(buildParams(targetPage, filters))
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

  /** 接收者候选：来自会员列表接口 */
  useEffect(() => {
    let cancelled = false
    memberApi
      .getMembers({ page: 1, page_size: 1000 })
      .then((res) => {
        if (cancelled) return
        setMembers((res.list ?? []).map((item) => ({ label: item.name, value: item.id })))
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const applyFilters = () => {
    const nextFilters: MessageFilters = {
      keyword: keyword.trim(),
      message_type: messageType,
      is_read: isRead,
    }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setKeyword('')
    setMessageType(null)
    setIsRead('all')
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  const closeSendDrawer = () => {
    setSendOpen(false)
    form.resetFields()
    setSendMode('broadcast')
  }

  const handleSend = async () => {
    let values: MessageFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSending(true)
    try {
      await messageApi.sendMessage({
        title: values.title.trim(),
        content: values.content.trim(),
        message_type: values.message_type,
        receiver_ids: values.send_mode === 'target' ? (values.receiver_ids ?? []) : [],
      })
      message.success('站内消息已发送')
      closeSendDrawer()
      void fetchList(1, applied)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSending(false)
    }
  }

  const handlePushWechat = (record: MessageDTO) => {
    modal.confirm({
      title: '确认推送微信？',
      content: `将消息「${record.title}」通过微信模板消息推送给接收者。`,
      okText: '确认推送',
      cancelText: '取消',
      onOk: async () => {
        await messageApi.pushMessage(record.id)
        message.success(`消息「${record.title}」已推送微信`)
      },
    })
  }

  const columns = useMemo<ColumnsType<MessageDTO>>(
    () => [
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        render: (value: string) => <strong>{value}</strong>,
      },
      { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
      {
        title: '类型',
        dataIndex: 'message_type',
        key: 'message_type',
        width: 100,
        render: (value: number) => (
          <Tag color={messageTypeMap[value]?.color}>{messageTypeMap[value]?.text ?? value}</Tag>
        ),
      },
      {
        title: '接收者',
        key: 'receiver',
        width: 110,
        render: (_, record) =>
          record.receiver_name ??
          (record.receiver_id ? `会员ID ${record.receiver_id}` : <Tag>全部用户</Tag>),
      },
      {
        title: '已读',
        dataIndex: 'is_read',
        key: 'is_read',
        width: 80,
        render: (value: 0 | 1) =>
          value === 0 ? (
            <Tag color="warning" variant="solid">
              未读
            </Tag>
          ) : (
            <Tag color="success" variant="solid">
              已读
            </Tag>
          ),
      },
      {
        title: '发送时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 170,
        render: (value: number) => (value ? formatDateTime(value * 1000) : '—'),
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        render: (_, record) => (
          <Space size={0}>
            <Button type="link" size="small" onClick={() => handlePushWechat(record)}>
              推送微信
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSendOpen(true)}>
          发送站内消息
        </Button>
      </div>
      <Card variant="borderless" className="filter-bar">
        <Input
          allowClear
          placeholder="搜索标题或接收者"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={applyFilters}
        />
        <Select
          value={messageType}
          onChange={(value) => setMessageType(value ?? null)}
          allowClear
          placeholder="消息类型"
          options={[
            { label: '业务通知', value: 1 },
            { label: '系统提醒', value: 2 },
            { label: '运营消息', value: 3 },
          ]}
        />
        <Select
          value={isRead}
          onChange={setIsRead}
          options={[
            { label: '全部已读状态', value: 'all' },
            { label: '未读', value: 'unread' },
            { label: '已读', value: 'read' },
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
            <span className="list-card__header__title">站内消息</span>
            <span className="list-card__header__tips">共 {total} 条消息</span>
          </div>
        </div>
        <FillTable<MessageDTO>
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

      {/* 发送站内消息 Drawer */}
      <Drawer
        open={sendOpen}
        title="发送站内消息"
        width={520}
        onClose={closeSendDrawer}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={closeSendDrawer}>取消</Button>
            <Button type="primary" loading={sending} onClick={handleSend}>
              发送
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ message_type: 1, send_mode: 'broadcast' }}
          onValuesChange={(changed) => {
            if (changed.send_mode) {
              setSendMode(changed.send_mode)
            }
          }}
        >
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入消息标题" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={4} placeholder="请输入消息内容" />
          </Form.Item>
          <Form.Item name="message_type" label="消息类型">
            <Select
              options={[
                { label: '业务通知', value: 1 },
                { label: '系统提醒', value: 2 },
                { label: '运营消息', value: 3 },
              ]}
            />
          </Form.Item>
          <Form.Item name="send_mode" label="发送方式">
            <Radio.Group
              options={[
                { label: '群发（全部用户）', value: 'broadcast' },
                { label: '指定用户', value: 'target' },
              ]}
            />
          </Form.Item>
          {sendMode === 'target' && (
            <Form.Item
              name="receiver_ids"
              label="选择接收者"
              rules={[{ required: true, message: '请选择至少一个接收者' }]}
            >
              <Select mode="multiple" placeholder="请选择接收者" options={members} />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </>
  )
}
