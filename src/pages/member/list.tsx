/**
 * 会员管理 - 注册会员列表
 * 数据来源：memberApi.getUsers（GET /admin/users，swagger：会员管理-注册用户）
 *   下推后端的筛选：keyword（昵称或手机号模糊）/ wx_openid（微信 OpenID）/ register_source（注册来源）
 * 保留能力：会员档案 Excel 导入 / 模板下载
 * 注：导出拉新明细已迁移至「会员管理 - 推荐与奖励」页（GET /admin/referral-events/export）
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Input, Select, Upload } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { memberApi } from '@/api'
import { registerSourceText } from '@/api/modules/memberOperation'
import type { RegisteredUserRow } from '@/api/modules/memberOperation'
import { downloadBlob, formatAmount, formatDateTime } from '@/utils'
import './list.less'

const PAGE_SIZE = 10

/** 注册来源选项（swagger：1-员工邀请 2-会员邀请 3-客服邀请 4-无邀请归因，下推后端 register_source） */
const SOURCE_OPTIONS = [
  { value: 1, label: '员工邀请' },
  { value: 2, label: '会员邀请' },
  { value: 3, label: '客服邀请' },
  { value: 4, label: '无邀请归因' },
]

/** 已应用的后端筛选快照（查询 / 重置 / 翻页时生效） */
interface AppliedFilters {
  keyword: string
  openid: string
  sourceType: number | null
}

const emptyFilters: AppliedFilters = { keyword: '', openid: '', sourceType: null }

export default function MemberList() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()

  const [rows, setRows] = useState<RegisteredUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  /** 筛选条件（全部下推后端） */
  const [keyword, setKeyword] = useState('')
  const [openid, setOpenid] = useState('')
  const [sourceType, setSourceType] = useState<number | null>(null)
  const [applied, setApplied] = useState<AppliedFilters>(emptyFilters)

  /** 模板下载 / Excel 导入进行中状态 */
  const [templateLoading, setTemplateLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  /**
   * 拉取注册会员列表（GET /admin/users）
   * keyword / wx_openid / register_source 下推后端
   */
  const fetchList = useCallback(
    async (targetPage: number, filters: AppliedFilters, size: number) => {
      setLoading(true)
      try {
        const res = await memberApi.getUsers({
          page: targetPage,
          page_size: size,
          keyword: filters.keyword || undefined,
          wx_openid: filters.openid || undefined,
          register_source: filters.sourceType ?? undefined,
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
    void fetchList(1, emptyFilters, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFilters = () => {
    const next: AppliedFilters = {
      keyword: keyword.trim(),
      openid: openid.trim(),
      sourceType,
    }
    setApplied(next)
    setPage(1)
    void fetchList(1, next, pageSize)
  }

  const handleReset = () => {
    setKeyword('')
    setOpenid('')
    setSourceType(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  /** 查看会员详情（跳转详情页） */
  const handleOpenDetail = (record: RegisteredUserRow) => {
    navigate(`/member/registered/detail/${record.id}`)
  }

  /** 下载导入模板（拦截器对 blob 响应返回完整 AxiosResponse，失败时错误提示已统一处理） */
  const handleDownloadTemplate = async () => {
    setTemplateLoading(true)
    try {
      const res = await memberApi.getMemberImportTemplate()
      downloadBlob(res.data, '会员导入模板.xlsx')
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setTemplateLoading(false)
    }
  }

  /** Excel 导入会员：成功后刷新列表；存在失败行时弹出明细 */
  const handleImport = async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      message.error('请上传 Excel 文件（.xlsx / .xls）')
      return
    }
    setImporting(true)
    try {
      const result = await memberApi.importMembers(file)
      const failList = result.fail_list ?? []
      if (failList.length > 0) {
        modal.warning({
          title: '导入完成，部分数据失败',
          content: (
            <div>
              <p>
                成功 {result.success_count} 条，失败 {result.fail_count} 条
              </p>
              <ul className="import-fail-list">
                {failList.map((item) => (
                  <li key={item.row}>
                    第 {item.row} 行：{item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ),
        })
      } else {
        message.success(`导入成功 ${result.success_count} 条`)
      }
      setPage(1)
      void fetchList(1, applied, pageSize)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setImporting(false)
    }
  }

  const columns: ColumnsType<RegisteredUserRow> = [
    {
      title: '注册会员 / 手机号',
      key: 'member',
      render: (_, record) => (
        <div className="member-cell">
          <strong>{record.nickname || '—'}</strong>
          <span>{record.phone || '—'}</span>
        </div>
      ),
    },
    {
      title: '注册来源 / 邀请人',
      key: 'source',
      render: (_, record) => (
        <div className="member-cell">
          <strong>{registerSourceText(record)}</strong>
          <span>{record.inviter_name || '—'}</span>
        </div>
      ),
    },
    {
      title: '微信OpenID',
      key: 'openid',
      dataIndex: 'openid',
      render: (value: string) => value || '—',
    },
    {
      title: '有效订单数',
      key: 'valid_order_count',
      width: 100,
      render: (_, record) => record.valid_order_count ?? '—',
    },
    {
      title: '实付金额',
      key: 'paid_amount',
      width: 120,
      render: (_, record) => (record.paid_amount ? formatAmount(record.paid_amount) : '—'),
    },
    {
      title: '注册时间',
      key: 'created_at',
      width: 150,
      render: (_, record) =>
        record.created_at ? formatDateTime(record.created_at * 1000, 'YYYY-MM-DD HH:mm') : '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => handleOpenDetail(record)}>
          查看详情
        </Button>
      ),
    },
  ]

  return (
    <PageContainer
      fixed
      title="注册会员管理"
      description="查看注册会员来源与下单结果，支持档案导入"
    >
      <div className="member-list">
        <Card variant="borderless" className="filter-bar member-list__filter">
          <Input
            allowClear
            placeholder="注册会员昵称或手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Input
            allowClear
            placeholder="微信OpenID"
            value={openid}
            onChange={(event) => setOpenid(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={sourceType}
            onChange={(value) => setSourceType(value ?? null)}
            options={SOURCE_OPTIONS}
            allowClear
            placeholder="全部注册来源"
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">注册会员列表</span>
            </div>
            <div className="member-list__actions">
              <Button
                icon={<DownloadOutlined />}
                loading={templateLoading}
                onClick={() => void handleDownloadTemplate()}
              >
                下载模板
              </Button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                disabled={importing}
                beforeUpload={(file) => {
                  void handleImport(file)
                  return Upload.LIST_IGNORE
                }}
              >
                <Button icon={<UploadOutlined />} loading={importing}>
                  Excel 导入
                </Button>
              </Upload>
            </div>
          </div>
          <FillTable<RegisteredUserRow>
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
                void fetchList(nextPage, applied, nextPageSize)
              },
              showTotal: (count) => `共 ${count} 条`,
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
