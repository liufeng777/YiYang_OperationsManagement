/**
 * 消息通知管理 - 系统公告（§9.4 / system:announcement）
 * 接口已封装 messageApi.getAnnouncements / create / update / publish / withdraw / delete，后端就绪后替换本地 mock
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, DatePicker, Drawer, Form, Input, Select, Space, Table, Tag, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { AnnouncementDTO } from '@/api/modules/message'
import dayjs, { type Dayjs } from 'dayjs'
import { formatDateTime } from '@/utils'

const announcementTypeMap: Record<number, string> = {
  1: '服务暂停',
  2: '系统维护',
  3: '节假日调整',
  4: '运营通知',
}

const publishStatusMap: Record<AnnouncementDTO['publish_status'], { text: string; color: string }> = {
  1: { text: '草稿', color: 'default' },
  2: { text: '已发布', color: 'success' },
  3: { text: '已撤回', color: 'warning' },
}

/** mock 系统公告（对齐 AnnouncementDTO） */
const mockAnnouncements: AnnouncementDTO[] = [
  { id: 1, title: '受台风影响今日上门服务暂停', content: '已预约订单将由客服逐一联系调整。', announcement_type: 1, priority: 1, cover_image: '', publish_scope: 'patient', target_ids: [], expires_at: 1787904000, publish_status: 2, published_at: 1787792400 },
  { id: 2, title: '系统维护通知', content: '维护期间部分页面可能暂时无法访问。', announcement_type: 2, priority: 2, cover_image: '', publish_scope: 'patient', target_ids: [], expires_at: 1788249600, publish_status: 2, published_at: 1787619600 },
  { id: 3, title: '中秋节服务时间调整', content: '节日期间部分机构服务时间有调整，详见各机构公告。', announcement_type: 3, priority: 3, cover_image: '', publish_scope: 'institution', target_ids: [1, 2, 3], expires_at: 1788409200, publish_status: 1, published_at: null },
  { id: 4, title: '支付系统升级完成', content: '支付与退款服务已恢复正常。', announcement_type: 2, priority: 2, cover_image: '', publish_scope: 'patient', target_ids: [], expires_at: null, publish_status: 3, published_at: 1787011200 },
]

/** mock 机构列表（供定向发布选择） */
const mockInstitutions = [
  { id: 1, name: '幸福护理院' },
  { id: 2, name: '西湖驿站' },
  { id: 3, name: '滨江护理中心' },
]

interface AnnouncementFormValues {
  title: string
  content: string
  announcement_type?: number
  priority?: number
  publish_scope?: string
  cover_image?: string
  target_ids?: number[]
  /** DatePicker 表单值为 dayjs 对象；保存时再转回 UTC 秒 */
  expires_at?: Dayjs | null
}

export default function AnnouncementsTab() {
  const { message, modal } = App.useApp()
  const [data, setData] = useState(mockAnnouncements)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm<AnnouncementFormValues>()

  const filtered = useMemo(
    () =>
      data.filter((item) => {
        const keywordHit = !keyword.trim() || item.title.includes(keyword.trim())
        const typeHit = type === 'all' || item.announcement_type === Number(type)
        const statusHit = status === 'all' || item.publish_status === Number(status)
        return keywordHit && typeHit && statusHit
      }),
    [data, keyword, status, type],
  )

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    setEditOpen(true)
  }

  const openEdit = (record: AnnouncementDTO) => {
    setEditingId(record.id)
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      announcement_type: record.announcement_type,
      priority: record.priority,
      publish_scope: record.publish_scope,
      cover_image: record.cover_image,
      target_ids: record.target_ids,
      expires_at: record.expires_at ? dayjs(record.expires_at * 1000) : undefined,
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      // DatePicker dayjs → 存储用 UTC 秒；未选/清空为 null
      const expiresNext = values.expires_at
        ? Math.floor(values.expires_at.valueOf() / 1000)
        : null
      if (editingId) {
        setData((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? { ...item, ...values, expires_at: expiresNext, updated_at: Math.floor(Date.now() / 1000) }
              : item,
          ),
        )
        message.success(`公告「${values.title.trim()}」已保存（mock）`)
      } else {
        const newItem: AnnouncementDTO = {
          id: Date.now(),
          title: values.title,
          content: values.content,
          announcement_type: values.announcement_type ?? 1,
          priority: values.priority ?? 2,
          publish_scope: values.publish_scope ?? 'patient',
          cover_image: values.cover_image || '',
          target_ids: values.target_ids || [],
          expires_at: expiresNext,
          publish_status: 1,
          published_at: null,
        }
        setData((prev) => [newItem, ...prev])
        message.success(`公告「${values.title.trim()}」已创建（mock）`)
      }
      setEditOpen(false)
      form.resetFields()
      setEditingId(null)
    } catch {
      // 校验失败就地提示
    }
  }

  const handlePublish = (record: AnnouncementDTO) => {
    modal.confirm({
      title: `确认发布公告「${record.title}」？`,
      content: '发布后公告将展示在对应范围内的用户端。',
      okText: '确认发布',
      onOk: () => {
        setData((prev) =>
          prev.map((item) =>
            item.id === record.id
              ? { ...item, publish_status: 2 as const, published_at: Math.floor(Date.now() / 1000) }
              : item,
          ),
        )
        message.success('公告已发布（mock）')
      },
    })
  }

  const handleWithdraw = (record: AnnouncementDTO) => {
    modal.confirm({
      title: `确认撤回公告「${record.title}」？`,
      content: '撤回后公告将不再展示在用户端。',
      okText: '确认撤回',
      onOk: () => {
        setData((prev) =>
          prev.map((item) =>
            item.id === record.id ? { ...item, publish_status: 3 as const } : item,
          ),
        )
        message.success('公告已撤回（mock）')
      },
    })
  }

  const confirmDelete = (record: AnnouncementDTO) => {
    modal.confirm({
      title: `确认删除公告「${record.title}」？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setData((prev) => prev.filter((item) => item.id !== record.id))
        message.success('公告已删除（mock）')
      },
    })
  }

  const columns = useMemo<ColumnsType<AnnouncementDTO>>(
    () => [
      {
        title: '公告标题',
        key: 'title',
        render: (_, record) => <strong>{record.title}</strong>,
      },
      { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
      {
        title: '类型',
        dataIndex: 'announcement_type',
        key: 'announcement_type',
        width: 110,
        render: (value: number) => announcementTypeMap[value] ?? value,
      },
      {
        title: '发布状态',
        dataIndex: 'publish_status',
        key: 'publish_status',
        width: 100,
        render: (value: AnnouncementDTO['publish_status']) => (
          <Tag color={publishStatusMap[value]?.color}>{publishStatusMap[value]?.text}</Tag>
        ),
      },
      {
        title: '过期时间',
        dataIndex: 'expires_at',
        key: 'expires_at',
        width: 170,
        render: (value: number | null) => (value ? formatDateTime(value * 1000) : '长期'),
      },
      {
        title: '发布时间',
        dataIndex: 'published_at',
        key: 'published_at',
        width: 170,
        render: (value: number | null) => (value ? formatDateTime(value * 1000) : '—'),
      },
      {
        title: '操作',
        key: 'action',
        width: 220,
        render: (_, record) => (
          <Space size={0}>
            {record.publish_status === 1 && (
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                编辑
              </Button>
            )}
            {record.publish_status === 1 && (
              <Button type="link" size="small" onClick={() => handlePublish(record)}>
                发布
              </Button>
            )}
            {record.publish_status === 2 && (
              <Button type="link" size="small" onClick={() => handleWithdraw(record)}>
                撤回
              </Button>
            )}
            {record.publish_status === 3 && (
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                编辑
              </Button>
            )}
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
      <div className='message-add-btn'>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建公告
        </Button>
      </div>
      <Card
        variant="borderless"
        className="filter-bar"
      >
        <Input
          allowClear
          placeholder="搜索公告标题"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          value={type}
          onChange={setType}
          options={[
            { label: '全部类型', value: 'all' },
            ...Object.entries(announcementTypeMap).map(([value, label]) => ({
              label,
              value,
            })),
          ]}
        />
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '草稿', value: '1' },
            { label: '已发布', value: '2' },
            { label: '已撤回', value: '3' },
          ]}
        />
        <Button>重置</Button>
        <Button type="primary">查询</Button>
      </Card>

      <Card variant="borderless" className="list-card">
        <div className="list-card__header">
          <div>
            <span className="list-card__header__title">系统公告</span>
            <span className="list-card__header__tips">共 {filtered.length} 条</span>
          </div>
        </div>
        <Table<AnnouncementDTO>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          pagination={false}
        />
      </Card>

      <Drawer
        open={editOpen}
        width={560}
        title={editingId ? '编辑公告' : '新建公告'}
        onClose={() => {
          setEditOpen(false)
          form.resetFields()
          setEditingId(null)
        }}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button
              onClick={() => {
                setEditOpen(false)
                form.resetFields()
                setEditingId(null)
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ announcement_type: 1, priority: 2, publish_scope: 'patient' }}
        >
          <Form.Item
            name="title"
            label="公告标题"
            rules={[{ required: true, message: '请输入公告标题' }]}
          >
            <Input placeholder="请输入公告标题" />
          </Form.Item>
          <Form.Item
            name="content"
            label="公告内容"
            rules={[{ required: true, message: '请输入公告内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入公告内容" />
          </Form.Item>
          <Form.Item name="announcement_type" label="公告类型">
            <Select
              options={Object.entries(announcementTypeMap).map(([value, label]) => ({
                label,
                value: Number(value),
              }))}
            />
          </Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select
              options={[
                { label: '高', value: 1 },
                { label: '中', value: 2 },
                { label: '低', value: 3 },
              ]}
            />
          </Form.Item>
          <Form.Item name="publish_scope" label="发布范围">
            <Select
              options={[
                { label: '患者端', value: 'patient' },
                { label: '机构端', value: 'institution' },
              ]}
            />
          </Form.Item>
          <Form.Item name="target_ids" label="定向发布（可选）">
            <Select
              mode="multiple"
              placeholder="不选则按发布范围全量推送"
              options={mockInstitutions.map((i) => ({ label: i.name, value: i.id }))}
            />
          </Form.Item>
          <Form.Item name="expires_at" label="过期时间（可选）">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="不设置则长期有效"
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>
          <Form.Item name="cover_image" label="封面图（可选）">
            <Upload
              name="file"
              listType="picture-card"
              maxCount={1}
              beforeUpload={() => false}
            >
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>上传封面</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
