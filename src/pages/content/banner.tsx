/**
 * 内容配置 - Banner 配置
 * 数据来源：cmsApi.getBanners / createBanner / updateBanner / updateBannerStatus / deleteBanner
 * 交互：状态筛选 + 列表（缩略图 / 投放端 / 跳转 / 排序 / 生效时间）+ 新建 / 编辑抽屉（图片走上传接口）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Upload,
} from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { cmsApi } from '@/api'
import type { BannerDTO, BannerLinkType, BannerPlatform } from '@/api/modules/cms'
import type { CommonStatus } from '@/types/api'
import { useImageUpload } from '@/hooks'
import { formatDateTime } from '@/utils'

/** 投放端：1-用户小程序 2-医护小程序 3-管理后台 */
const platformText: Record<number, string> = {
  1: '用户小程序',
  2: '医护小程序',
  3: '管理后台',
}

/** 跳转类型：1-无跳转 2-站内内容 3-活动详情 4-服务详情 5-外链 */
const linkTypeText: Record<number, string> = {
  1: '无跳转',
  2: '站内内容',
  3: '活动详情',
  4: '服务详情',
  5: '外链',
}

const STATUS_ENABLED: CommonStatus = 1
const STATUS_DISABLED: CommonStatus = 9

const PAGE_SIZE = 10

interface BannerFormValues {
  title: string
  platform: BannerPlatform
  position: string
  link_type: BannerLinkType
  link_value?: string
  sort: number
  range?: [Dayjs | null, Dayjs | null] | null
}

export default function ContentBanner() {
  const { message, modal } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const [rows, setRows] = useState<BannerDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'all' | CommonStatus>('all')
  const [appliedStatus, setAppliedStatus] = useState<'all' | CommonStatus>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<BannerDTO | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** 图片地址：本地预览或服务器地址（提交时写 image_url） */
  const [imageUrl, setImageUrl] = useState('')
  const [form] = Form.useForm<BannerFormValues>()
  const linkType = Form.useWatch('link_type', form)

  const fetchList = useCallback(
    async (targetPage: number, targetStatus: 'all' | CommonStatus, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await cmsApi.getBanners({
          page: targetPage,
          page_size: size,
          status: targetStatus === 'all' ? undefined : targetStatus,
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
    },
    [],
  )

  useEffect(() => {
    void fetchList(1, 'all', pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchList])

  const applyFilters = () => {
    setAppliedStatus(status)
    setPage(1)
    void fetchList(1, status, pageSize)
  }

  const handleReset = () => {
    setStatus('all')
    setAppliedStatus('all')
    setPage(1)
    void fetchList(1, 'all', pageSize)
  }

  const openCreate = () => {
    setEditing(null)
    setImageUrl('')
    form.resetFields()
    form.setFieldsValue({
      platform: 1,
      position: 'home_top',
      link_type: 1,
      sort: 0,
    })
    setDrawerOpen(true)
  }

  const openEdit = (record: BannerDTO) => {
    setEditing(record)
    setImageUrl(record.image_url)
    form.setFieldsValue({
      title: record.title,
      platform: record.platform,
      position: record.position,
      link_type: record.link_type,
      link_value: record.link_value,
      sort: record.sort,
      range: null,
    })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditing(null)
    setImageUrl('')
    form.resetFields()
  }

  /** 图片选择：本地预览 + 上传后端，成功后保存服务器地址 */
  const handlePickImage = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => setImageUrl(localUrl),
      onUploaded: (serverUrl) => setImageUrl(serverUrl),
      onError: () => setImageUrl(editing?.image_url ?? ''),
    })
    return false
  }

  const handleSave = async () => {
    let values: BannerFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (!imageUrl) {
      message.warning('请上传 Banner 图片')
      return
    }
    setSubmitting(true)
    try {
      const body = {
        title: values.title.trim(),
        image_url: imageUrl,
        platform: values.platform,
        position: values.position.trim() || 'home_top',
        link_type: values.link_type,
        link_value: values.link_type === 1 ? '' : (values.link_value?.trim() ?? ''),
        sort: values.sort ?? 0,
        start_at: values.range?.[0] ? values.range[0].unix() : null,
        end_at: values.range?.[1] ? values.range[1].unix() : null,
        status: editing?.status ?? STATUS_ENABLED,
      }
      if (editing) {
        await cmsApi.updateBanner(editing.id, body)
        message.success(`Banner「${body.title}」已保存`)
      } else {
        await cmsApi.createBanner(body)
        message.success(`Banner「${body.title}」已创建`)
      }
      closeDrawer()
      void fetchList(page, appliedStatus, pageSize)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (record: BannerDTO) => {
    const next: CommonStatus = record.status === STATUS_ENABLED ? STATUS_DISABLED : STATUS_ENABLED
    try {
      await cmsApi.updateBannerStatus(record.id, next)
      message.success(`「${record.title}」已${next === STATUS_ENABLED ? '启用' : '停用'}`)
      void fetchList(page, appliedStatus, pageSize)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }

  const confirmDelete = (record: BannerDTO) => {
    modal.confirm({
      title: `确认删除 Banner「${record.title}」？`,
      content: '删除后患者端将不再展示该轮播图。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await cmsApi.deleteBanner(record.id)
        message.success('Banner 已删除')
        void fetchList(page, appliedStatus, pageSize)
      },
    })
  }

  const columns = useMemo<ColumnsType<BannerDTO>>(
    () => [
      {
        title: 'Banner',
        key: 'image',
        width: 220,
        render: (_, record) => (
          <Space>
            <Image src={record.image_url} width={96} height={48} style={{ objectFit: 'cover' }} />
            <strong>{record.title}</strong>
          </Space>
        ),
      },
      {
        title: '投放端',
        dataIndex: 'platform',
        key: 'platform',
        width: 110,
        render: (value: number) => platformText[value] ?? value,
      },
      {
        title: '投放位置',
        dataIndex: 'position',
        key: 'position',
        width: 110,
        render: (value: string) => value || '—',
      },
      {
        title: '跳转',
        key: 'link',
        render: (_, record) =>
          record.link_type === 1 ? (
            '无跳转'
          ) : (
            <span>
              {linkTypeText[record.link_type] ?? record.link_type}
              {record.link_value ? `：${record.link_title ?? record.link_value}` : ''}
            </span>
          ),
      },
      {
        title: '排序',
        dataIndex: 'sort',
        key: 'sort',
        width: 70,
      },
      {
        title: '生效时间',
        key: 'range',
        width: 200,
        render: (_, record) => {
          const start = record.start_at ? formatDateTime(record.start_at * 1000) : '立即'
          const end = record.end_at ? formatDateTime(record.end_at * 1000) : '长期'
          return `${start} ~ ${end}`
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (value: CommonStatus) =>
          value === STATUS_ENABLED ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>,
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
    <PageContainer
      fixed
      title="Banner 配置"
      description="管理患者端首页轮播 Banner，支持投放端、跳转与生效时间配置"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增 Banner
        </Button>
      }
    >
      <Card variant="borderless" className="filter-bar">
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '启用', value: STATUS_ENABLED },
            { label: '停用', value: STATUS_DISABLED },
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
            <span className="list-card__header__title">Banner 列表</span>
            <span className="list-card__header__tips">共 {total} 条</span>
          </div>
        </div>
        <FillTable<BannerDTO>
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
              void fetchList(nextPage, appliedStatus, nextPageSize)
            },
            showTotal: (count) => `共 ${count} 条`,
          }}
        />
      </Card>

      {/* 新建 / 编辑 Banner */}
      <Drawer
        open={drawerOpen}
        width={560}
        title={editing ? '编辑 Banner' : '新增 Banner'}
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
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="title" label="Banner 标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入 Banner 标题" maxLength={50} />
          </Form.Item>
          <Form.Item label="Banner 图片" required>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                void handlePickImage(file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                {imageUrl ? '重新上传' : '上传图片'}
              </Button>
            </Upload>
            {imageUrl && (
              <div style={{ marginTop: 8 }}>
                <Image src={imageUrl} width={240} style={{ objectFit: 'cover' }} />
              </div>
            )}
          </Form.Item>
          <Form.Item name="platform" label="投放端" rules={[{ required: true, message: '请选择投放端' }]}>
            <Select
              options={Object.entries(platformText).map(([value, label]) => ({
                label,
                value: Number(value),
              }))}
            />
          </Form.Item>
          <Form.Item name="position" label="投放位置" extra="如 home_top（首页顶部）/ activity_ad（活动广告位）">
            <Input placeholder="home_top" />
          </Form.Item>
          <Form.Item name="link_type" label="跳转类型" rules={[{ required: true, message: '请选择跳转类型' }]}>
            <Select
              options={Object.entries(linkTypeText).map(([value, label]) => ({
                label,
                value: Number(value),
              }))}
            />
          </Form.Item>
          {linkType !== 1 && (
            <Form.Item
              name="link_value"
              label="跳转目标"
              extra="站内内容 / 活动 / 服务填对应 ID，外链填完整 URL"
              rules={[{ required: true, message: '请输入跳转目标' }]}
            >
              <Input placeholder="内容 ID / 活动 ID / 服务 ID / https://..." />
            </Form.Item>
          )}
          <Form.Item name="sort" label="排序" extra="数字越小越靠前，0 置顶">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="range" label="生效时间" extra="不填表示立即生效、长期有效">
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
