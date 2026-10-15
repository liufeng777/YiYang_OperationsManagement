/**
 * 内容配置 - 科普内容管理
 * 视觉对齐设计稿：筛选 + 状态文字 Tabs + 文章表格（批量发布 / 下架）+ 底部提示条
 * 数据来源：cmsApi.getCmsContents（服务端分页，关键字 / 分类 / 状态下推后端）
 *          cmsApi.getCmsCategories（分类下拉与列展示）
 *          publishCmsContent / offlineCmsContent / deleteCmsContent / batchDeleteCmsContents
 * 说明：DTO 无「首页推荐」字段，设计稿中的推荐筛选 / 列在后端补齐前不展示
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Input, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { cmsApi } from '@/api'
import type { CmsCategoryDTO, CmsContentDTO, CmsPublishStatus } from '@/api/modules/cms'
import { formatDateTime } from '@/utils'
import './article.less'

/** 发布状态：1-草稿 2-已发布 3-已下线 */
const statusText: Record<number, string> = {
  1: '草稿',
  2: '已发布',
  3: '已下架',
}

/** 发布状态 → 样式修饰类（对齐设计稿 article-status--*） */
const statusClass: Record<number, string> = {
  1: 'draft',
  2: 'published',
  3: 'offline',
}

const statusTabs: Array<{ key: 'all' | CmsPublishStatus; label: string }> = [
  { key: 'all', label: '全部内容' },
  { key: 2, label: '已发布' },
  { key: 1, label: '草稿' },
  { key: 3, label: '已下架' },
]

interface ArticleFilters {
  keyword: string
  categoryId: number | null
  status: 'all' | CmsPublishStatus
}

const emptyFilters: ArticleFilters = { keyword: '', categoryId: null, status: 'all' }

const PAGE_SIZE = 10

export default function ArticleList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [data, setData] = useState<CmsContentDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CmsCategoryDTO[]>([])
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [tab, setTab] = useState<'all' | CmsPublishStatus>('all')
  const [applied, setApplied] = useState<ArticleFilters>(emptyFilters)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  /** 分类 id → 名称（列展示与下拉共用） */
  const categoryMap = useMemo(
    () => new Map(categories.map((item) => [item.id, item.name])),
    [categories],
  )

  /** 拉取内容列表（筛选条件全部下推后端） */
  const fetchList = useCallback(
    async (targetPage: number, filters: ArticleFilters, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await cmsApi.getCmsContents({
          page: targetPage,
          page_size: size,
          keyword: filters.keyword || undefined,
          category_id: filters.categoryId ?? undefined,
          status: filters.status === 'all' ? undefined : filters.status,
        })
        setData(res.list ?? [])
        setTotal(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setData([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void fetchList(1, emptyFilters, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchList])

  /** 分类下拉数据源（一次性拉取） */
  useEffect(() => {
    let cancelled = false
    cmsApi
      .getCmsCategories({ page: 1, page_size: 100 })
      .then((res) => {
        if (!cancelled) setCategories(res.list ?? [])
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const applyFilters = () => {
    const next: ArticleFilters = { keyword: keyword.trim(), categoryId, status: tab }
    setApplied(next)
    setPage(1)
    void fetchList(1, next, pageSize)
  }

  const handleReset = () => {
    setKeyword('')
    setCategoryId(null)
    setTab('all')
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  /** 状态 Tab：与筛选条共用一个状态维度，切换即查询 */
  const changeTab = (key: 'all' | CmsPublishStatus) => {
    setTab(key)
    const next: ArticleFilters = { ...applied, status: key }
    setApplied(next)
    setPage(1)
    void fetchList(1, next, pageSize)
  }

  /** 发布 / 下架 / 重新发布 */
  const changePublishStatus = async (record: CmsContentDTO, action: 'publish' | 'offline') => {
    try {
      if (action === 'publish') {
        await cmsApi.publishCmsContent(record.id)
        message.success(`「${record.title}」已发布`)
      } else {
        await cmsApi.offlineCmsContent(record.id)
        message.success(`「${record.title}」已下架`)
      }
      void fetchList(page, applied, pageSize)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }

  const confirmDelete = (record: CmsContentDTO) => {
    modal.confirm({
      title: `确认删除「${record.title}」？`,
      content: '删除后患者端将不再展示该内容。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await cmsApi.deleteCmsContent(record.id)
        message.success('内容已删除')
        void fetchList(page, applied, pageSize)
      },
    })
  }

  /** 批量发布 / 下架：swagger 无批量接口，逐条调用 */
  const handleBatch = async (action: 'publish' | 'offline') => {
    if (!selectedRowKeys.length) {
      message.warning('请先勾选内容')
      return
    }
    try {
      await Promise.all(
        selectedRowKeys.map((id) =>
          action === 'publish'
            ? cmsApi.publishCmsContent(Number(id))
            : cmsApi.offlineCmsContent(Number(id)),
        ),
      )
      message.success(action === 'publish' ? '批量发布完成' : '批量下架完成')
      setSelectedRowKeys([])
      void fetchList(page, applied, pageSize)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }

  const columns = useMemo<ColumnsType<CmsContentDTO>>(
    () => [
      {
        title: '内容标题',
        key: 'title',
        render: (_, record) => (
          <div className="article-title">
            <i>{record.title.slice(0, 1)}</i>
            <strong>{record.title}</strong>
          </div>
        ),
      },
      {
        title: '分类',
        dataIndex: 'category_id',
        key: 'category_id',
        width: 110,
        render: (value: number) => categoryMap.get(value) ?? '—',
      },
      {
        title: '来源 / 作者',
        key: 'source',
        width: 150,
        render: (_, record) =>
          [record.source, record.author_name].filter(Boolean).join(' / ') || '—',
      },
      {
        title: '发布时间',
        dataIndex: 'publish_at',
        key: 'publish_at',
        width: 160,
        render: (value: number | null) => (value ? formatDateTime(value * 1000) : '—'),
      },
      {
        title: '发布状态',
        dataIndex: 'publish_status',
        key: 'publish_status',
        width: 100,
        render: (value: CmsPublishStatus) => (
          <span className={`article-status article-status--${statusClass[value] ?? 'draft'}`}>
            {statusText[value] ?? value}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 210,
        render: (_, record) => (
          <div className="article-actions">
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/content/article/edit/${record.id}`)}
            >
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => message.info('预览开发中')}>
              预览
            </Button>
            {record.publish_status === 2 && (
              <Button type="link" size="small" onClick={() => changePublishStatus(record, 'offline')}>
                下架
              </Button>
            )}
            {record.publish_status === 1 && (
              <Button type="link" size="small" onClick={() => changePublishStatus(record, 'publish')}>
                发布
              </Button>
            )}
            {record.publish_status === 3 && (
              <Button type="link" size="small" onClick={() => changePublishStatus(record, 'publish')}>
                重新发布
              </Button>
            )}
            <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
              删除
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message, navigate, categoryMap, page, pageSize, applied],
  )

  return (
    <PageContainer
      fixed
      title="科普内容管理"
      description="维护患者端健康科普文章，支持分类、发布及首页推荐"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/content/article/edit/new')}
        >
          新建科普内容
        </Button>
      }
    >
      <div className="article-list">
        <Card variant="borderless" className="article-list__filter">
          <div className="filter-row">
            <Input
              allowClear
              placeholder="请输入标题"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={applyFilters}
            />
            <Select
              value={categoryId}
              onChange={(value) => setCategoryId(value ?? null)}
              allowClear
              placeholder="全部分类"
              options={categories.map((item) => ({ label: item.name, value: item.id }))}
            />
            <Button onClick={handleReset}>重置</Button>
            <Button type="primary" onClick={applyFilters}>
              查询
            </Button>
          </div>
          <div className="filter-tabs">
            {statusTabs.map((item) => (
              <button
                type="button"
                key={item.key}
                className={tab === item.key ? 'is-active' : ''}
                onClick={() => changeTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">科普内容列表</span>
              <span className="list-card__header__tips">共 {total} 篇</span>
            </div>
            <div className="article-table__batch">
              <Button type="link" size="small" onClick={() => handleBatch('publish')}>
                批量发布
              </Button>
              <Button type="link" size="small" onClick={() => handleBatch('offline')}>
                批量下架
              </Button>
            </div>
          </div>
          <FillTable<CmsContentDTO>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={data}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
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
          <div className="article-list__tip">
            提示：内容发布后同步至患者端“健康科普”；设为首页推荐后进入首页内容位。
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
