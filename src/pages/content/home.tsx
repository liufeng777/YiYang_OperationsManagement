/**
 * 内容配置 - 患者端首页配置
 * 首页轮播图：cmsApi.getBanners / createBanner / updateBanner / updateBannerStatus / deleteBanner
 *   - 固定投放端 platform=1（用户小程序）、投放位置 position=home_top
 *   - 新增 / 编辑抽屉（图片走上传接口 useImageUpload），状态切换、删除二次确认
 *   - 最多展示 5 张（设计稿约束，超出时阻止新增）
 * 右侧患者端实时预览：轮播区按「启用中 + 排序升序」渲染（antd Carousel）
 * 首页快捷入口 / 推荐内容：接口未对接，按设计稿静态占位
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Carousel,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Select,
  Space,
  Upload,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { HolderOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { cmsApi } from '@/api'
import type { BannerDTO, BannerLinkType } from '@/api/modules/cms'
import type { CommonStatus } from '@/types/api'
import { useImageUpload } from '@/hooks'
import './home.less'

const STATUS_ENABLED: CommonStatus = 1
const STATUS_DISABLED: CommonStatus = 9

/** 轮播图数量上限（设计稿：最多展示 5 张） */
const BANNER_LIMIT = 5

/** 跳转类型：1-无跳转 2-站内内容 3-活动详情 4-服务详情 5-外链 */
const linkTypeText: Record<number, string> = {
  1: '无跳转',
  2: '站内内容',
  3: '活动详情',
  4: '服务详情',
  5: '外链',
}

/** 首页快捷入口（设计稿固定四项，接口未对接） */
const ENTRY_PLACEHOLDERS = ['机构服务', '线上服务', '活动报名', '康养旅游']

interface BannerFormValues {
  title: string
  link_type: BannerLinkType
  link_value?: string
  sort: number
  range?: [Dayjs | null, Dayjs | null] | null
}

export default function ContentHome() {
  const { message, modal } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const [rows, setRows] = useState<BannerDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<BannerDTO | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** 图片地址：本地预览或服务器地址（提交时写 image_url） */
  const [imageUrl, setImageUrl] = useState('')
  const [form] = Form.useForm<BannerFormValues>()
  const linkType = Form.useWatch('link_type', form)

  /** 拉取首页轮播（固定用户小程序 / home_top，一次性拉全量按排序升序） */
  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await cmsApi.getBanners({ page: 1, page_size: 100 })
      const list = (res.list ?? [])
        .filter((item) => item.position === 'home_top' && item.platform === 1)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      setRows(list)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  /** 预览轮播：启用中且已过生效起始、未过生效结束 */
  const previewBanners = useMemo(() => {
    const now = Date.now() / 1000
    return rows.filter(
      (item) =>
        item.status === STATUS_ENABLED &&
        (item.start_at == null || item.start_at <= now) &&
        (item.end_at == null || item.end_at >= now),
    )
  }, [rows])

  const openCreate = () => {
    if (rows.length >= BANNER_LIMIT) {
      message.warning(`首页轮播图最多展示 ${BANNER_LIMIT} 张，请先删除或停用后再添加`)
      return
    }
    setEditing(null)
    setImageUrl('')
    form.resetFields()
    form.setFieldsValue({ link_type: 1, sort: 0 })
    setDrawerOpen(true)
  }

  const openEdit = (record: BannerDTO) => {
    setEditing(record)
    setImageUrl(record.image_url)
    form.setFieldsValue({
      title: record.title,
      link_type: record.link_type,
      link_value: record.link_value,
      sort: record.sort,
      range:
        record.start_at || record.end_at
          ? [
              record.start_at ? dayjs(record.start_at * 1000) : null,
              record.end_at ? dayjs(record.end_at * 1000) : null,
            ]
          : null,
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
      message.warning('请上传轮播图图片')
      return
    }
    setSubmitting(true)
    try {
      const body = {
        title: values.title.trim(),
        image_url: imageUrl,
        platform: 1 as const,
        position: 'home_top',
        link_type: values.link_type,
        link_value: values.link_type === 1 ? '' : (values.link_value?.trim() ?? ''),
        sort: values.sort ?? 0,
        start_at: values.range?.[0] ? values.range[0].unix() : null,
        end_at: values.range?.[1] ? values.range[1].unix() : null,
        status: editing?.status ?? STATUS_ENABLED,
      }
      if (editing) {
        await cmsApi.updateBanner(editing.id, body)
        message.success(`轮播图「${body.title}」已保存`)
      } else {
        await cmsApi.createBanner(body)
        message.success(`轮播图「${body.title}」已创建`)
      }
      closeDrawer()
      void fetchList()
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
      void fetchList()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }

  const confirmDelete = (record: BannerDTO) => {
    modal.confirm({
      title: `确认删除轮播图「${record.title}」？`,
      content: '删除后患者端首页将不再展示该轮播图。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await cmsApi.deleteBanner(record.id)
        message.success('轮播图已删除')
        void fetchList()
      },
    })
  }

  return (
    <PageContainer
      title="患者端首页配置"
      description="配置轮播图、快捷入口与推荐内容，右侧实时查看患者端展示效果"
    >
      <div className="content-home">
        <div className="content-home__form">
          {/* 首页轮播图 */}
          <Card variant="borderless" className="home-card" loading={loading}>
            <div className="home-card__header">
              <div>
                <h3>首页轮播图</h3>
                <span className="home-card__header__label">
                  建议 750 × 360px，最多展示 {BANNER_LIMIT} 张
                </span>
              </div>
              <Button color="primary" variant="outlined" icon={<PlusOutlined />} onClick={openCreate}>
                添加轮播图
              </Button>
            </div>
            <div className="banner-list">
              {rows.map((record) => (
                <div className="banner-row" key={record.id}>
                  <HolderOutlined className="banner-row__drag" />
                  <i className={`banner-row__thumb${record.image_url ? ' has-image' : ''}`}>
                    {record.image_url ? <img src={record.image_url} alt={record.title} /> : '图'}
                  </i>
                  <div className="banner-row__info">
                    <strong>{record.title}</strong>
                    <span>
                      跳转至：
                      {record.link_type === 1
                        ? '无跳转'
                        : `${linkTypeText[record.link_type] ?? record.link_type}${record.link_title || record.link_value ? `（${record.link_title ?? record.link_value}）` : ''}`}
                      {' · 排序 '}
                      {record.sort ?? 0}
                    </span>
                  </div>
                  <div className="banner-row__actions">
                    <em>{record.status === STATUS_ENABLED ? '展示中' : '已停用'}</em>
                    <Button type="link" size="small" onClick={() => openEdit(record)}>
                      编辑
                    </Button>
                    <Button type="link" size="small" onClick={() => void toggleStatus(record)}>
                      {record.status === STATUS_ENABLED ? '停用' : '启用'}
                    </Button>
                    <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
                      删除
                    </Button>
                  </div>
                </div>
              ))}
              {!rows.length && !loading && (
                <Empty description="暂无轮播图，点击右上角「添加轮播图」创建" />
              )}
            </div>
          </Card>

          {/* 首页快捷入口（接口未对接，静态占位） */}
          <Card variant="borderless" className="home-card">
            <div className="home-card__header">
              <div>
                <h3>首页快捷入口</h3>
                <span className="home-card__header__label">
                  入口固定，仅支持调整显示与排序（接口未对接，当前为设计稿占位）
                </span>
              </div>
            </div>
            <div className="entry-grid">
              {ENTRY_PLACEHOLDERS.map((name) => (
                <div className="entry-tile" key={name}>
                  <HolderOutlined className="entry-tile__drag" />
                  <i>{name.slice(0, 1)}</i>
                  <strong>{name}</strong>
                  <em>已显示</em>
                </div>
              ))}
            </div>
          </Card>

          {/* 首页推荐内容（接口未对接，静态占位） */}
          <Card variant="borderless" className="home-card">
            <div className="home-card__header">
              <div>
                <h3>首页推荐内容</h3>
                <span className="home-card__header__label">
                  从已上架服务和已发布活动中选择（接口未对接，当前为设计稿占位）
                </span>
              </div>
              <Button color="primary" variant="outlined" icon={<PlusOutlined />} disabled>
                选择内容
              </Button>
            </div>
            <Empty description="推荐内容配置接口未对接，待后端补充后开放" />
          </Card>
        </div>

        {/* 患者端首页实时预览 */}
        <Card variant="borderless" className="home-card content-home__preview">
          <div className="home-preview__header">
            <h3>患者端首页实时预览</h3>
          </div>
          <div className="home-phone">
            <div className="home-phone__bar">
              <strong>幸福颐养</strong>
              <span>•••</span>
            </div>
            {previewBanners.length ? (
              <Carousel autoplay dots>
                {previewBanners.map((item) => (
                  <div key={item.id}>
                    <div
                      className="home-phone__hero"
                      style={
                        item.image_url
                          ? {
                              backgroundImage: `url(${item.image_url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : undefined
                      }
                    >
                      <strong>{item.title}</strong>
                      {item.link_type !== 1 && <em>查看详情 →</em>}
                    </div>
                  </div>
                ))}
              </Carousel>
            ) : (
              <div className="home-phone__hero">
                <strong>暂无展示中的轮播图</strong>
                <span>启用轮播图后将在此预览</span>
              </div>
            )}
            <div className="home-phone__entries">
              {ENTRY_PLACEHOLDERS.map((name) => (
                <div key={name}>
                  <i>{name.slice(0, 1)}</i>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 新增 / 编辑轮播图 */}
      <Drawer
        open={drawerOpen}
        width={520}
        title={editing ? '编辑轮播图' : '添加轮播图'}
        onClose={closeDrawer}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => void handleSave()}>
              保存
            </Button>
          </Space>
        }
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="title"
            label="轮播图标题"
            rules={[{ required: true, whitespace: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入轮播图标题" maxLength={50} />
          </Form.Item>
          <Form.Item label="轮播图图片" required extra="建议 750 × 360px">
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
