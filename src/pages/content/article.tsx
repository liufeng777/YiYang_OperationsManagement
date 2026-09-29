/**
 * 内容配置 - 科普内容管理
 * 视觉对齐设计稿：筛选 + 状态文字 Tabs + 文章表格（批量发布 / 下架）+ 底部提示条
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据；接口就绪后接入 contentApi.getArticleList
 */
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Input, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import type { ArticleItem } from '@/api/modules/content'
import './article.less'

type ArticleStatus = ArticleItem['status']

const statusText: Record<ArticleStatus, string> = {
  published: '已发布',
  draft: '草稿',
  offline: '已下架',
}

const statusTabs = [
  { key: 'all', label: '全部内容' },
  { key: 'published', label: '已发布' },
  { key: 'draft', label: '草稿' },
  { key: 'offline', label: '已下架' },
]

interface ArticleFilters {
  keyword: string
  category: string
  status: ArticleStatus | 'all'
  recommended: 'all' | 'yes' | 'no'
}

export default function ArticleList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  /** 接口未对接：无列表数据，操作统一提示 */
  const [data] = useState<ArticleItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState<ArticleStatus | 'all'>('all')
  const [recommended, setRecommended] = useState<'all' | 'yes' | 'no'>('all')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<ArticleFilters>({
    keyword: '',
    category: 'all',
    status: 'all',
    recommended: 'all',
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.title.includes(applied.keyword) ||
        item.author.includes(applied.keyword)
      const categoryHit = applied.category === 'all' || item.category === applied.category
      const statusHit = applied.status === 'all' || item.status === applied.status
      const recommendHit =
        applied.recommended === 'all' ||
        (applied.recommended === 'yes' ? item.recommended : !item.recommended)
      const tabHit = tab === 'all' || item.status === tab
      return keywordHit && categoryHit && statusHit && recommendHit && tabHit
    })
  }, [applied, data, tab])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), category, status, recommended })
  }

  const handleReset = () => {
    setKeyword('')
    setCategory('all')
    setStatus('all')
    setRecommended('all')
    setApplied({ keyword: '', category: 'all', status: 'all', recommended: 'all' })
  }

  /** 接口未对接：操作统一提示（列表为空时行内操作不可达，仅批量按钮可点） */
  const notReady = () => {
    message.warning('接口未对接，功能暂未开放')
  }

  const columns = useMemo<ColumnsType<ArticleItem>>(
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
      { title: '分类', dataIndex: 'category', key: 'category', width: 110 },
      { title: '来源 / 作者', dataIndex: 'source', key: 'source', width: 150 },
      { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 160 },
      {
        title: '首页推荐',
        dataIndex: 'recommended',
        key: 'recommended',
        width: 100,
        render: (value: boolean) => (
          <span className={`recommend-pill${value ? ' is-yes' : ''}`}>{value ? '是' : '否'}</span>
        ),
      },
      {
        title: '发布状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: ArticleStatus) => (
          <span className={`article-status article-status--${value}`}>{statusText[value]}</span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 190,
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
            {record.status === 'published' && (
              <Button
                type="link"
                size="small"
                onClick={notReady}
              >
                下架
              </Button>
            )}
            {record.status === 'draft' && (
              <Button
                type="link"
                size="small"
                onClick={notReady}
              >
                发布
              </Button>
            )}
            {record.status === 'offline' && (
              <Button
                type="link"
                size="small"
                onClick={notReady}
              >
                重新发布
              </Button>
            )}
          </div>
        ),
      },
    ],
    [message, navigate],
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
          onClick={notReady}
        >
          新建科普内容
        </Button>
      }
    >
      <div className="article-list">
        <ApiPendingAlert feature="科普内容管理" />
        <Card variant="borderless" className="article-list__filter">
          <div className="filter-row">
            <Input
              allowClear
              placeholder="请输入标题或作者"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={applyFilters}
            />
            <Select
              value={category}
              onChange={setCategory}
              options={[
                { label: '全部分类', value: 'all' },
                { label: '慢病管理', value: '慢病管理' },
                { label: '居家照护', value: '居家照护' },
                { label: '健康科普', value: '健康科普' },
                { label: '照护指南', value: '照护指南' },
                { label: '季节养生', value: '季节养生' },
              ]}
            />
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { label: '全部状态', value: 'all' },
                { label: '已发布', value: 'published' },
                { label: '草稿', value: 'draft' },
                { label: '已下架', value: 'offline' },
              ]}
            />
            <Select
              value={recommended}
              onChange={setRecommended}
              options={[
                { label: '全部', value: 'all' },
                { label: '首页推荐', value: 'yes' },
                { label: '未推荐', value: 'no' },
              ]}
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
                onClick={() => setTab(item.key)}
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
              <span className="list-card__header__tips">共 {filteredData.length} 篇</span>
            </div>
            <div className="article-table__batch">
              <Button
                type="link"
                size="small"
                onClick={notReady}
              >
                批量发布
              </Button>
              <Button
                type="link"
                size="small"
                onClick={notReady}
              >
                批量下架
              </Button>
            </div>
          </div>
          <FillTable<ArticleItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={{
              current: page,
              pageSize,
              total: filteredData.length,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
              },
              showTotal: (total) => `共 ${total} 条`
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
