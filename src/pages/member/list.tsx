/**
 * 会员管理 - 注册会员列表（注册会员管理 / 我的会员 双视图）
 * 数据来源：memberApi.getMembers（分页 + keyword 姓名/手机号 + 实名状态）
 * 视图：
 *   - 注册会员管理：导出拉新明细、记录沟通跟进
 *   - 我的会员（普通运营）：owner_id 归属过滤参数已预留，swagger 未支持（页面有 Alert 提示）
 * 接口缺口（swagger.json 未提供，详见 api/modules/memberOperation.ts）：
 *   分配状态/购买状态/注册来源/运营归属等列表字段与筛选、导出拉新明细、沟通跟进保存
 * 保留能力：会员档案 Excel 导入 / 模板下载（memberApi）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, App, Button, Card, Input, Segmented, Select, Space, Upload } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { institutionApi, memberApi, systemApi, tagApi } from '@/api'
import type { tagItem } from '@/api/modules/tag'
import type { RegisteredMemberRow } from '@/api/modules/memberOperation'
import { downloadBlob, formatAmount, formatDateTime } from '@/utils'
import { useUserStore } from '@/store/modules/user'
import FollowupDrawer from './components/FollowupDrawer'
import ExportRecruitModal from './components/ExportRecruitModal'
import './list.less'

const PAGE_SIZE = 10

/** 列表快捷范围 Tab */
type RangeTab = 'all' | 'unassigned' | 'due'
/** 页面视图：all-注册会员管理 / mine-我的会员（普通运营） */
type ViewMode = 'all' | 'mine'

/** 分配状态选项（字段待后端返回，当前为当前页本地兜底过滤） */
const ASSIGN_STATUS_OPTIONS = [
  { value: 1, label: '已分配' },
  { value: 2, label: '未分配' },
]

/** 购买状态选项（字段待后端返回） */
const PURCHASE_STATUS_OPTIONS = [
  { value: 1, label: '已购买' },
  { value: 2, label: '未购买' },
]

/** 注册来源选项（字典待后端定义，按设计稿文案占位） */
const SOURCE_OPTIONS = [
  { value: 1, label: '员工邀请' },
  { value: 2, label: '会员邀请' },
  { value: 3, label: '无邀请归因' },
]

export default function MemberList() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const userInfo = useUserStore((state) => state.userInfo)

  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [rows, setRows] = useState<RegisteredMemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  /** 筛选条件（分配状态/购买状态/注册来源/运营人员的后端参数缺失，当前页本地兜底） */
  const [keyword, setKeyword] = useState('')
  const [assignStatus, setAssignStatus] = useState<number | null>(null)
  const [purchaseStatus, setPurchaseStatus] = useState<number | null>(null)
  const [sourceType, setSourceType] = useState<number | null>(null)
  const [operatorId, setOperatorId] = useState<number | null>(null)

  const [rangeTab, setRangeTab] = useState<RangeTab>('all')

  /** 记录沟通跟进 Drawer */
  const [followupOpen, setFollowupOpen] = useState(false)
  const [followupMember, setFollowupMember] = useState<RegisteredMemberRow | null>(null)
  /** 导出拉新明细 Modal */
  const [exportOpen, setExportOpen] = useState(false)
  /** 模板下载 / Excel 导入进行中状态 */
  const [templateLoading, setTemplateLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  /** 机构 / 标签字典：挂载时拉取一次（详情展示备用） */
  const [, setInstitutionMap] = useState<Map<number, string>>(new Map())
  const [, setTagMap] = useState<Map<number, tagItem>>(new Map())
  /** 运营人员候选（筛选下拉，数据源为管理员列表） */
  const [operatorOptions, setOperatorOptions] = useState<{ value: number; label: string }[]>([])

  /** 拉取注册会员列表（keyword 由后端筛选；我的会员视图预留 owner_id，swagger 未支持） */
  const fetchList = useCallback(
    async (targetPage: number, kw: string, size: number, mode: ViewMode) => {
      setLoading(true)
      try {
        const res = await memberApi.getMembers({
          page: targetPage,
          page_size: size,
          keyword: kw || undefined,
          // TODO(接口缺失)：我的会员归属过滤，swagger 未支持 owner_id，当前会被后端忽略
          ...(mode === 'mine' && userInfo ? { owner_id: userInfo.id } : {}),
        } as Parameters<typeof memberApi.getMembers>[0])
        setRows((res.list ?? []) as RegisteredMemberRow[])
        setTotal(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setRows([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [userInfo],
  )

  useEffect(() => {
    void fetchList(1, '', pageSize, viewMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  // 机构 / 标签 / 运营人员字典：挂载时各拉取一次
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
    systemApi
      .getAdminList({ page: 1, page_size: 100, status: 1 })
      .then((res) => {
        setOperatorOptions(
          (res.list ?? []).map((item) => ({
            value: item.id,
            label: item.nickname || item.username,
          })),
        )
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
      })
  }, [])

  const applyFilters = () => {
    setPage(1)
    void fetchList(1, keyword.trim(), pageSize, viewMode)
  }

  const handleReset = () => {
    setKeyword('')
    setAssignStatus(null)
    setPurchaseStatus(null)
    setSourceType(null)
    setOperatorId(null)
    setPage(1)
    void fetchList(1, '', pageSize, viewMode)
  }

  /** 查看会员详情（跳转详情页） */
  const handleOpenDetail = (record: RegisteredMemberRow) => {
    navigate(`/member/registered/detail/${record.id}`)
  }

  /** 记录沟通跟进 */
  const handleFollowup = (record: RegisteredMemberRow) => {
    setFollowupMember(record)
    setFollowupOpen(true)
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
      void fetchList(1, keyword.trim(), pageSize, viewMode)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setImporting(false)
    }
  }

  /**
   * 当前页兜底过滤：Tab（全部 / 未分配 / 到期需联系）与分配状态 / 购买状态 / 运营人员
   * 注意：运营归属、购买等字段 swagger 未返回，相关过滤在字段就绪前不产生效果
   */
  const filteredRows = useMemo(() => {
    let list = rows
    if (rangeTab === 'unassigned') {
      list = list.filter((item) => item.operator_id == null && !item.operator_name)
    } else if (rangeTab === 'due') {
      const now = Date.now()
      list = list.filter(
        (item) => item.next_contact_at != null && item.next_contact_at * 1000 <= now,
      )
    }
    if (assignStatus === 1) {
      list = list.filter((item) => item.operator_id != null || !!item.operator_name)
    } else if (assignStatus === 2) {
      list = list.filter((item) => item.operator_id == null && !item.operator_name)
    }
    if (purchaseStatus === 1) {
      list = list.filter((item) => (item.valid_order_count ?? 0) > 0)
    } else if (purchaseStatus === 2) {
      list = list.filter((item) => !item.valid_order_count)
    }
    if (operatorId != null) {
      list = list.filter((item) => item.operator_id === operatorId)
    }
    return list
  }, [rows, rangeTab, assignStatus, purchaseStatus, operatorId])

  const columns: ColumnsType<RegisteredMemberRow> = [
    {
      title: '注册会员 / 手机号',
      key: 'member',
      render: (_, record) => (
        <div className="member-cell">
          <strong>{record.name}</strong>
          <span>{record.phone || '—'}</span>
        </div>
      ),
    },
    {
      title: '注册来源 / 邀请人',
      key: 'source',
      render: (_, record) => (
        <div className="member-cell">
          <strong>{record.source_text || '—'}</strong>
          <span>{record.inviter_name || '—'}</span>
        </div>
      ),
    },
    {
      title: '负责运营',
      key: 'operator',
      render: (_, record) => record.operator_name || '未分配',
    },
    {
      title: '最近联系',
      key: 'last_contact_at',
      width: 120,
      render: (_, record) =>
        record.last_contact_at
          ? formatDateTime(record.last_contact_at * 1000, 'MM-DD HH:mm')
          : '—',
    },
    {
      title: '下次联系',
      key: 'next_contact_at',
      width: 120,
      render: (_, record) =>
        record.next_contact_at
          ? formatDateTime(record.next_contact_at * 1000, 'MM-DD HH:mm')
          : '—',
    },
    {
      title: '有效订单数',
      key: 'valid_order_count',
      width: 100,
      render: (_, record) => record.valid_order_count ?? '—',
    },
    {
      title: '实付金额',
      key: 'paid_amount_total',
      width: 110,
      render: (_, record) =>
        record.paid_amount_total != null ? formatAmount(record.paid_amount_total / 100) : '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => handleOpenDetail(record)}>
            查看详情
          </Button>
          <Button type="link" size="small" onClick={() => handleFollowup(record)}>
            记录跟进
          </Button>
        </Space>
      ),
    },
  ]

  const rangeTabOptions: { value: RangeTab; label: string }[] =
    viewMode === 'all'
      ? [
          { value: 'all', label: '全部' },
          { value: 'unassigned', label: '未分配' },
          { value: 'due', label: '到期需联系' },
        ]
      : [
          { value: 'all', label: '全部' },
          { value: 'due', label: '到期需联系' },
        ]

  return (
    <PageContainer
      fixed
      title={viewMode === 'all' ? '注册会员管理' : '我的会员'}
      description={
        viewMode === 'all'
          ? '记录沟通与服务推荐，查看会员下单结果。'
          : '联系您负责的会员，记录沟通与服务推荐，查看下单结果'
      }
      extra={<Button color="primary" variant='outlined' icon={<DownloadOutlined />} onClick={() => setExportOpen(true)}>导出拉新明细</Button>}
    >
      <div className="member-list">
        <div className="member-list__view-switch">
          <Segmented<ViewMode>
            value={viewMode}
            onChange={(value) => {
              setViewMode(value)
              setRangeTab('all')
              setPage(1)
            }}
            options={[
              { value: 'all', label: '注册会员管理' },
              { value: 'mine', label: '我的会员' },
            ]}
          />
        </div>

        {viewMode === 'mine' && (
          <Alert
            className="member-list__pending-alert"
            type="warning"
            showIcon
            message="接口未对接"
            description="「我的会员」的运营归属过滤（owner_id）尚未在 swagger.json 中提供，当前列表为全量会员；归属过滤将在接口对接后生效。"
          />
        )}

        <Card variant="borderless" className="filter-bar member-list__filter">
          <Input
            allowClear
            placeholder="注册会员姓名或手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          {viewMode === 'all' && (
            <Select
              value={assignStatus}
              onChange={(value) => setAssignStatus(value ?? null)}
              options={ASSIGN_STATUS_OPTIONS}
              allowClear
              placeholder="全部分配状态"
            />
          )}
          <Select
            value={purchaseStatus}
            onChange={(value) => setPurchaseStatus(value ?? null)}
            options={PURCHASE_STATUS_OPTIONS}
            allowClear
            placeholder="全部购买状态"
          />
          <Select
            value={sourceType}
            onChange={(value) => setSourceType(value ?? null)}
            options={SOURCE_OPTIONS}
            allowClear
            placeholder="全部注册来源"
          />
          {viewMode === 'all' && (
            <Select
              value={operatorId}
              onChange={(value) => setOperatorId(value ?? null)}
              options={operatorOptions}
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部运营人员"
            />
          )}
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">注册会员列表</span>
              <p className="list-card__header__sub">
                {viewMode === 'all'
                  ? '本月工作：联系 / 跟进 / 推荐 / 下单统计接口待补充'
                  : '仅统计本人负责的会员及沟通、推荐与下单结果（归属过滤接口待补充）'}
              </p>
            </div>
            <div className="member-list__actions">
              <Segmented<RangeTab>
                value={rangeTab}
                onChange={setRangeTab}
                options={rangeTabOptions}
              />
              {viewMode === 'all' && (
                <>
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
                </>
              )}
            </div>
          </div>
          <FillTable<RegisteredMemberRow>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
                void fetchList(nextPage, keyword.trim(), nextPageSize, viewMode)
              },
              showTotal: (count) => `共 ${count} 条`,
            }}
          />
        </Card>
      </div>

      <FollowupDrawer
        open={followupOpen}
        member={followupMember}
        onClose={() => setFollowupOpen(false)}
      />
      <ExportRecruitModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </PageContainer>
  )
}
