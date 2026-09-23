/**
 * 消息通知管理 - 系统公告（§9.4 / system:announcement）
 * 数据来源：messageApi.getAnnouncements / createAnnouncement / updateAnnouncement /
 *          publishAnnouncement / withdrawAnnouncement / deleteAnnouncement
 * 说明：后端当前列表为空，字段按接口文档契约；关键字 / 类型 / 发布状态全部下推后端（前端不做本地过滤）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, DatePicker, Drawer, Form, Input, Select, Space, Tag, Upload } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { institutionApi, messageApi } from '@/api'
import { useImageUpload } from '@/hooks'
import type { AnnouncementDTO } from '@/api/modules/message'
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

/** 公告封面受控上传（配合 Form.Item）：本地预览 + 后台上传，value 为服务器的封面地址 */
function AnnouncementCoverUpload({
  value,
  uploading,
  onUpload,
}: {
  value?: string
  uploading?: boolean
  onUpload: (file: File) => void
}) {
  const [preview, setPreview] = useState<string | undefined>(value)
  return (
    <Upload
      listType="picture-card"
      accept="image/*"
      showUploadList={false}
      disabled={uploading}
      beforeUpload={(file) => {
        setPreview(URL.createObjectURL(file))
        onUpload(file)
        return Upload.LIST_IGNORE
      }}
    >
      {preview || value ? (
        <img
          src={preview || value}
          alt="公告封面"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
        />
      ) : (
        <div>
          <UploadOutlined />
          <div style={{ marginTop: 8 }}>{uploading ? '上传中…' : '上传封面'}</div>
        </div>
      )}
    </Upload>
  )
}

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

interface AnnouncementFilters {
  keyword: string
  announcement_type: number | null
  publish_status: number | null
}

const emptyFilters: AnnouncementFilters = {
  keyword: '',
  announcement_type: null,
  publish_status: null,
}

const PAGE_SIZE = 10

export default function AnnouncementsTab() {
  const { message, modal } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const [rows, setRows] = useState<AnnouncementDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [applied, setApplied] = useState<AnnouncementFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [institutions, setInstitutions] = useState<Array<{ label: string; value: number }>>([])
  const [form] = Form.useForm<AnnouncementFormValues>()

  /** 组装查询参数：筛选条件全部下推后端 */
  const buildParams = useCallback(
    (targetPage: number, filters: AnnouncementFilters) => ({
      page: targetPage,
      page_size: PAGE_SIZE,
      keyword: filters.keyword || undefined,
      announcement_type: filters.announcement_type ?? undefined,
      publish_status: filters.publish_status ?? undefined,
    }),
    [],
  )

  const fetchList = useCallback(
    async (targetPage: number, filters: AnnouncementFilters) => {
      setLoading(true)
      try {
        const res = await messageApi.getAnnouncements(buildParams(targetPage, filters))
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

  /** 定向发布机构候选：来自机构列表接口 */
  useEffect(() => {
    let cancelled = false
    institutionApi
      .getInstitutions({ page: 1, page_size: 1000 })
      .then((res) => {
        if (cancelled) return
        setInstitutions((res.list ?? []).map((item) => ({ label: item.name, value: item.id })))
      })
      .catch(() => {
        if (!cancelled) setInstitutions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const applyFilters = () => {
    const nextFilters: AnnouncementFilters = {
      keyword: keyword.trim(),
      announcement_type: type,
      publish_status: status,
    }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setKeyword('')
    setType(null)
    setStatus(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  const closeDrawer = () => {
    setEditOpen(false)
    form.resetFields()
    setEditingId(null)
  }

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
    let values: AnnouncementFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    // DatePicker dayjs → 存储用 UTC 秒；未选/清空为 null
    const expiresNext = values.expires_at ? Math.floor(values.expires_at.valueOf() / 1000) : null
    const body = {
      title: values.title.trim(),
      content: values.content.trim(),
      announcement_type: values.announcement_type ?? 1,
      priority: values.priority ?? 2,
      publish_scope: values.publish_scope ?? 'patient',
      cover_image: values.cover_image || '',
      target_ids: values.target_ids ?? [],
      expires_at: expiresNext,
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await messageApi.updateAnnouncement(editingId, body)
        message.success(`公告「${body.title}」已保存`)
      } else {
        await messageApi.createAnnouncement(body)
        message.success(`公告「${body.title}」已创建`)
      }
      closeDrawer()
      void fetchList(page, applied)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = (record: AnnouncementDTO) => {
    modal.confirm({
      title: `确认发布公告「${record.title}」？`,
      content: '发布后公告将展示在对应范围内的用户端。',
      okText: '确认发布',
      cancelText: '取消',
      onOk: async () => {
        await messageApi.publishAnnouncement(record.id)
        message.success('公告已发布')
        void fetchList(page, applied)
      },
    })
  }

  const handleWithdraw = (record: AnnouncementDTO) => {
    modal.confirm({
      title: `确认撤回公告「${record.title}」？`,
      content: '撤回后公告将不再展示在用户端。',
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        await messageApi.withdrawAnnouncement(record.id)
        message.success('公告已撤回')
        void fetchList(page, applied)
      },
    })
  }

  const confirmDelete = (record: AnnouncementDTO) => {
    modal.confirm({
      title: `确认删除公告「${record.title}」？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await messageApi.deleteAnnouncement(record.id)
        message.success('公告已删除')
        void fetchList(page, applied)
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
          <Tag color={publishStatusMap[value]?.color}>{publishStatusMap[value]?.text ?? value}</Tag>
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
        width: 200,
        render: (_, record) => (
          <Space size={0}>
            {record.publish_status !== 2 && (
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
          新建公告
        </Button>
      </div>
      <Card variant="borderless" className="filter-bar">
        <Input
          allowClear
          placeholder="搜索公告标题"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={applyFilters}
        />
        <Select
          value={type}
          onChange={(value) => setType(value ?? null)}
          allowClear
          placeholder="公告类型"
          options={Object.entries(announcementTypeMap).map(([value, label]) => ({
            label,
            value: Number(value),
          }))}
        />
        <Select
          value={status}
          onChange={(value) => setStatus(value ?? null)}
          allowClear
          placeholder="发布状态"
          options={[
            { label: '草稿', value: 1 },
            { label: '已发布', value: 2 },
            { label: '已撤回', value: 3 },
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
            <span className="list-card__header__title">系统公告</span>
            <span className="list-card__header__tips">共 {total} 条</span>
          </div>
        </div>
        <FillTable<AnnouncementDTO>
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

      <Drawer
        open={editOpen}
        width={560}
        title={editingId ? '编辑公告' : '新建公告'}
        onClose={closeDrawer}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
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
            <Select mode="multiple" placeholder="不选则按发布范围全量推送" options={institutions} />
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
            <AnnouncementCoverUpload
              uploading={uploading}
              onUpload={(file) =>
                upload(file, {
                  onUploaded: (url) => form.setFieldValue('cover_image', url),
                  onError: () => form.setFieldValue('cover_image', ''),
                })
              }
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
