/**
 * 会员管理 - 注册会员列表
 * 数据来源：memberApi.getMembers（分页 + 实名状态筛选）
 * 关键字：后端仅提供 phone 筛选参数，姓名/手机号关键字由当前页本地兜底过滤（与退款列表同策略）
 * 状态：1-未实名 2-已实名 9-禁用
 * 查看详情：MemberDetailDrawer（memberApi.getMember）
 * Excel 导入：下载模板（getMemberImportTemplate）+ 上传导入（importMembers，multipart/form-data）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Input, Select, Space, Tag, Upload } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { institutionApi, memberApi, tagApi } from '@/api'
import type { MemberDTO } from '@/api/modules/member'
import type { tagItem } from '@/api/modules/tag'
import { downloadBlob } from '@/utils'
import MemberDetailDrawer from './components/MemberDetailDrawer'
import { MEMBER_STATUS_TAG_COLOR, MEMBER_STATUS_TEXT, resolveMemberTags } from './constants'
import './list.less'

const PAGE_SIZE = 10

export default function MemberList() {
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<MemberDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  /** 顶部统计：全部 / 未实名 / 已实名 / 禁用（各状态 page_size=1 取 total） */
  const [stats, setStats] = useState({ all: 0, unverified: 0, verified: 0, disabled: 0 })

  const [keyword, setKeyword] = useState('')
  const [institutionId, setInstitutionId] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [appliedStatus, setAppliedStatus] = useState<number | null>(null)

  /** 会员详情 Drawer */
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  /** 模板下载 / Excel 导入进行中状态 */
  const [templateLoading, setTemplateLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  /** 机构字典：institution_id → 机构名称（列表 / 详情共用） */
  const [institutionMap, setInstitutionMap] = useState<Map<number, string>>(new Map())
  /** 标签字典：tag_id → 标签（tag_name / tag_color，列表 / 详情共用） */
  const [tagMap, setTagMap] = useState<Map<number, tagItem>>(new Map())

  /** 拉取会员列表 */
  const fetchList = useCallback(async (targetPage: number, targetInstitutionId: number | null,  targetStatus: number | null) => {
    setLoading(true)
    try {
      const res = await memberApi.getMembers({
        page: targetPage,
        page_size: PAGE_SIZE,
        status: targetStatus ?? undefined,
        institution_Id: targetInstitutionId ?? undefined,
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
  }, [])

  useEffect(() => {
    void fetchList(1, null, null)
  }, [fetchList])

  // 机构 / 标签字典：挂载时各拉取一次，供列表与详情名称匹配
  useEffect(() => {
    institutionApi
      .getInstitutions({ page: 1, page_size: 200 })
      .then((res) => {
        setInstitutionMap(new Map((res.list ?? []).map((item) => [item.id, item.name])))
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
      })
    tagApi
      .getTags()
      .then((res) => {
        setTagMap(new Map((res.list ?? []).map((item) => [item.id, item])))
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
      })
  }, [])

  const applyFilters = () => {
    setAppliedKeyword(keyword.trim())
    setAppliedStatus(status)
    setPage(1)
    void fetchList(1, institutionId, status)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus(null)
    setAppliedKeyword('')
    setAppliedStatus(null)
    setPage(1)
    void fetchList(1, null, null)
  }

  /** 启用 / 禁用会员 */
  const handleToggleStatus = (record: MemberDTO) => {
    const nextStatus = record.status === 9 ? 1 : 9
    modal.confirm({
      title: record.status === 9 ? '启用会员' : '禁用会员',
      content:
        record.status === 9
          ? `确认恢复会员「${record.name}」的正常状态？`
          : `确认禁用会员「${record.name}」？禁用后该会员将无法使用患者端服务。`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: record.status === 9 ? {} : { danger: true },
      onOk: async () => {
        try {
          await memberApi.updateMemberStatus(record.id, nextStatus)
          message.success(record.status === 9 ? '会员已启用' : '会员已禁用')
          void fetchList(page, institutionId, appliedStatus)
        } catch {
          /* 错误提示由 request 拦截器统一处理 */
        }
      },
    })
  }

  /** 查看会员详情 */
  const handleOpenDetail = (record: MemberDTO) => {
    setDetailId(record.id)
    setDetailOpen(true)
  }

  /** 下载导入模板（拦截器对 blob 响应返回完整 AxiosResponse，失败时错误提示已统一处理） */
  const handleDownloadTemplate = async () => {
    setTemplateLoading(true)
    try {
      const res = await memberApi.getMemberImportTemplate()
      downloadBlob(res.data?.download_url, '会员导入模板.xlsx')
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
      void fetchList(1, institutionId, appliedStatus)
      setPage(1)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setImporting(false)
    }
  }

  /** 当前页兜底过滤：关键字匹配姓名 / 手机号（后端未提供姓名筛选参数） */
  const filteredRows = useMemo(() => {
    const kw = appliedKeyword.trim()
    if (!kw) return rows
    return rows.filter(
      (item) => (item.name ?? '').includes(kw) || (item.phone ?? '').includes(kw),
    )
  }, [appliedKeyword, rows])

  const columns: ColumnsType<MemberDTO> = [
    {
      title: '会员',
      key: 'member',
      render: (_, record) => (
        <div className="member-cell">
          <strong>{record.name}</strong>
          <span>{record.gender === 1 ? '男' : record.gender === 2 ? '女' : '—'}</span>
        </div>
      ),
    },
    {
      title: '所属机构',
      dataIndex: 'institution_id',
      key: 'institution_id',
      render: (value?: number | null) =>
        value ? (institutionMap.get(value) ?? `#${value}`) : '—',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (value?: string) => value || '—',
    },
    {
      title: '会员等级',
      key: 'level',
      dataIndex: 'level',
    },
    // {
    //   title: '标签',
    //   key: 'tags',
    //   width: 180,
    //   render: (_, record) => {
    //     const tags = resolveMemberTags(record, tagMap)
    //     return tags.length ? (
    //       <span className="member-tags">
    //         {tags.map((tag) => (
    //           <Tag key={tag.id} color={tag.color}>
    //             {tag.name}
    //           </Tag>
    //         ))}
    //       </span>
    //     ) : (
    //       '—'
    //     )
    //   },
    // },
    {
      title: '实名状态',
      key: 'status',
      render: (_, record) => (
        <span className={`status-btn status--${MEMBER_STATUS_TAG_COLOR[record.status]}`}>
          {MEMBER_STATUS_TEXT[record.status] ?? record.status}
        </span>
      ),
    },
    // {
    //   title: '注册时间',
    //   key: 'created_at',
    //   width: 150,
    //   render: (_, record) =>
    //     record.created_at ? formatDateTime(record.created_at * 1000, 'YYYY-MM-DD HH:mm') : '—',
    // },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => handleOpenDetail(record)}>
            查看详情
          </Button>
          {/* <Button type="link" size="small" danger={record.status !== 9} onClick={() => handleToggleStatus(record)}>
            {record.status === 9 ? '启用' : '禁用'}
          </Button> */}
        </Space>
      ),
    },
  ]

  const metrics = [
    { key: 'all', label: '全部会员', value: stats.all, note: '平台全部注册会员', tone: 'success' },
    { key: 'verified', label: '已实名', value: stats.verified, note: '已完成实名认证', tone: 'info' },
    { key: 'unverified', label: '未实名', value: stats.unverified, note: '待完成实名认证', tone: 'warning' },
    { key: 'disabled', label: '已禁用', value: stats.disabled, note: '已被平台禁用', tone: 'danger' },
  ]

  return (
    <PageContainer
      fixed
      title="注册会员"
      description="管理平台注册会员的实名状态、等级、标签与启停用"
    >
      <div className="member-list">
        <div className="metric-cards">
          {metrics.map((metric) => (
            <Card variant="borderless" className="metric-card" key={metric.key}>
              <div className="metric-card__head">
                <span className="metric-card__label">{metric.label}</span>
                <i className={`metric-card__icon status--${metric.tone}`}>
                  <BarChartOutlined />
                </i>
              </div>
              <strong className="metric-card__value">{metric.value}</strong>
              <em className={`metric-card__note status--${metric.tone}`}>{metric.note}</em>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar member-list__filter">
          <Input
            allowClear
            placeholder="会员姓名或手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={institutionId}
            onChange={(value) => setInstitutionId(value ?? null)}
            options={Array.from(institutionMap, ([value, label]) => ({ value, label }))}
            allowClear
            placeholder="所属机构"
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value ?? null)}
            options={Object.entries(MEMBER_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="实名状态"
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
                <Button type="primary" icon={<UploadOutlined />} loading={importing}>
                  Excel 导入
                </Button>
              </Upload>
            </div>
          </div>
          <FillTable<MemberDTO>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: (nextPage) => {
                setPage(nextPage)
                void fetchList(nextPage, institutionId, appliedStatus)
              },
              showTotal: (count) => `共 ${count} 条`,
            }}
          />
        </Card>
      </div>

      <MemberDetailDrawer
        memberId={detailId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        institutionMap={institutionMap}
        tagMap={tagMap}
      />
    </PageContainer>
  )
}
