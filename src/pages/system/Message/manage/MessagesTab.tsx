/**
 * 消息通知管理 - 站内消息（§9.1 / system:message）
 * 接口已封装 messageApi.getMessages / sendMessage / pushMessage / batchPushMessages，后端就绪后替换本地 mock
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Drawer, Form, Input, Radio, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import type { MessageDTO } from '@/api/modules/message'
import { formatDateTime } from '@/utils'

const messageTypeMap: Record<number, { text: string; color: string }> = {
  1: { text: '业务通知', color: 'blue' },
  2: { text: '系统提醒', color: 'orange' },
  3: { text: '运营消息', color: 'purple' },
}

/** mock 站内消息（对齐 MessageDTO） */
const mockMessages: MessageDTO[] = [
  { id: 1, title: '您的预约已确认', content: '您预约的「上门康复护理」已确认，请于 2026-08-20 10:00 前做好准备。', message_type: 1, receiver_id: 1, receiver_name: '张大爷', is_read: 0, created_at: 1787875200 },
  { id: 2, title: '退款到账通知', content: '订单 SO20260820001 退款 300.00 元已到账。', message_type: 2, receiver_id: 1, receiver_name: '张大爷', is_read: 0, created_at: 1787792400 },
  { id: 3, title: '健康讲座报名成功', content: '您已成功报名 9 月健康讲座，请按时参加。', message_type: 3, receiver_id: 3, receiver_name: '王阿姨', is_read: 1, created_at: 1787706000 },
  { id: 4, title: '用户服务协议更新', content: '平台用户服务协议已更新至 V1.2，请阅读并确认。', message_type: 2, receiver_id: null, is_read: 1, created_at: 1787619600 },
]

/** mock 用户列表（供指定发送时选择） */
const mockUsers = [
  { id: 1, name: '张大爷' },
  { id: 2, name: '李奶奶' },
  { id: 3, name: '王阿姨' },
  { id: 4, name: '赵爷爷' },
  { id: 5, name: '陈奶奶' },
]

interface MessageFormValues {
  title: string
  content: string
  message_type: number
  send_mode: 'broadcast' | 'target'
  receiver_ids?: number[]
}

export default function MessagesTab() {
  const { message, modal } = App.useApp()
  const [data, setData] = useState(mockMessages)
  const [keyword, setKeyword] = useState('')
  const [messageType, setMessageType] = useState('all')
  const [isRead, setIsRead] = useState('all')
  const [sendOpen, setSendOpen] = useState(false)
  const [form] = Form.useForm<MessageFormValues>()
  const [sendMode, setSendMode] = useState<'broadcast' | 'target'>('broadcast')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const filtered = useMemo(
    () =>
      data.filter((item) => {
        const keywordHit = !keyword.trim() || item.title.includes(keyword.trim()) || item.receiver_name?.includes(keyword.trim())
        const typeHit = messageType === 'all' || item.message_type === Number(messageType)
        const readHit = isRead === 'all' || item.is_read === (isRead === 'read' ? 1 : 0)
        return keywordHit && typeHit && readHit
      }),
    [data, isRead, keyword, messageType],
  )

  const handleSend = async () => {
    try {
      const values = await form.validateFields()
      const receiverIds = values.send_mode === 'target' ? values.receiver_ids ?? [] : undefined
      setData((prev) => [
        {
          id: Date.now(),
          title: values.title.trim(),
          content: values.content.trim(),
          message_type: values.message_type,
          receiver_id: receiverIds && receiverIds.length > 0 ? receiverIds[0] : null,
          receiver_name: receiverIds && receiverIds.length > 0 ? mockUsers.find((u) => u.id === receiverIds[0])?.name : undefined,
          is_read: 0,
          created_at: Math.floor(Date.now() / 1000),
        },
        ...prev,
      ])
      message.success('站内消息已发送（mock）')
      form.resetFields()
      setSendOpen(false)
    } catch {
      // 校验失败就地提示
    }
  }

  const handlePushWechat = (record: MessageDTO) => {
    modal.confirm({
      title: '确认推送微信？',
      content: `将消息「${record.title}」通过微信模板消息推送给接收者。`,
      okText: '确认推送',
      onOk: () => message.success(`消息「${record.title}」已推送微信（mock）`),
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
        dataIndex: 'receiver_name',
        key: 'receiver_name',
        width: 110,
        render: (value?: string) => value ?? <Tag>全部用户</Tag>,
      },
      {
        title: '已读',
        dataIndex: 'is_read',
        key: 'is_read',
        width: 80,
        render: (value: 0 | 1) =>
          value === 0 ? <Tag color="warning" variant='solid'>未读</Tag> : <Tag color="success" variant='solid'>已读</Tag>,
      },
      {
        title: '发送时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 170,
        render: (value: number) => formatDateTime(value * 1000),
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
      <div className='message-add-btn'>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSendOpen(true)}>
          发送站内消息
        </Button>
      </div>
      <Card
        variant="borderless"
        className="filter-bar"
      >
        <Input
          allowClear
          placeholder="搜索标题或接收者"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          value={messageType}
          onChange={setMessageType}
          options={[
            { label: '全部类型', value: 'all' },
            { label: '业务通知', value: '1' },
            { label: '系统提醒', value: '2' },
            { label: '运营消息', value: '3' },
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
        <Button>重置</Button>
        <Button type="primary">查询</Button>
      </Card>

      <Card variant="borderless" className="list-card">
        <div className="list-card__header">
          <div>
            <span className="list-card__header__title">站内消息</span>
          </div>
        </div>
        <Table<MessageDTO>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          pagination={{
            current: page,
            pageSize,
            total: filtered.length,
            onChange: setPage,
            showTotal: (total) => `共 ${total} 条`
          }}
        />
      </Card>

      {/* 发送站内消息 Drawer */}
      <Drawer
        open={sendOpen}
        title="发送站内消息"
        width={520}
        onClose={() => {
          setSendOpen(false)
          form.resetFields()
          setSendMode('broadcast')
        }}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button
              onClick={() => {
                setSendOpen(false)
                form.resetFields()
                setSendMode('broadcast')
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleSend}>
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
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入消息标题" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
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
              <Select
                mode="multiple"
                placeholder="请选择接收者"
                options={mockUsers.map((u) => ({ label: u.name, value: u.id }))}
              />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </>
  )
}
