/**
 * 活动管理 - 报名查询（活动详情页）
 * 从活动列表「报名查询」进入：活动摘要统计 + 报名记录筛选 / Tabs + 签到 / 取消报名 / 导出
 * 数据来源：activityApi.getActivity / getActivityRegistrations（跨活动接口 + activity_id）/
 *           checkinRegistration / cancelRegistration / exportActivityRegistrations
 * 操作规则：已报名（status=1）可「签到」或「取消」；已签到（status=2）后不能再取消
 * 筛选：报名状态下推接口（status），关键字 / 机构 / 报名日期对当前页做本地兜底过滤
 * 字段以后端实测返回为准：name / phone / registered_source / unregistered_at / remark
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Col, Input, Modal, Radio, Row, Select, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, BarChartOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { activityApi, institutionApi } from '@/api'
import type { ActivityItem, ActivityRegistrationDTO } from '@/api/modules/activity'
import type { InstitutionItem } from '@/api/modules/institution'
import { downloadBlob, formatDateTime } from '@/utils'
import './index.less'

/** 报名状态：1-已报名 2-已签到 3-已取消 */
const registrationStatusText: Record<number, string> = {
  1: '已报名',
  2: '已签到',
  3: '已取消',
}

/** 状态 → 样式修饰（对应 index.less 的 .signup-status--*） */
const statusTone: Record<number, string> = { 1: 'signed', 2: 'checked', 3: 'cancelled' }

/** 报名来源文案 */
const sourceText: Record<string, string> = {
  miniapp: '患者端小程序',
  admin: '运营后台',
}

interface SignupFilters {
  keyword: string
  institution_id: number | null
  status: number | null
  date: string
}

const emptyFilters: SignupFilters = {
  keyword: '',
  institution_id: null,
  status: null,
  date: '',
}

const PAGE_SIZE = 10

export default function ActivitySignups() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const params = useParams<{ id: string }>()
  const activityId = Number(params.id)

  /** 活动信息（标题 / 编号 / 区域 / 报名时间 / 参与机构） */
  const [activity, setActivity] = useState<ActivityItem | null>(null)
  /** 参与机构：用于筛选项与报名记录里的机构名展示 */
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([])
  const [rows, setRows] = useState<ActivityRegistrationDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  /** 顶部统计：报名人数 / 待签到 / 已签到 / 已取消（接口 total） */
  const [stats, setStats] = useState({ total: 0, signed: 0, checked: 0, cancelled: 0 })

  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [date, setDate] = useState('')
  const [applied, setApplied] = useState<SignupFilters>(emptyFilters)

  /** 取消报名弹窗：目标记录 + 取消原因 */
  const [cancelTarget, setCancelTarget] = useState<ActivityRegistrationDTO | null>(null)
  const [cancelRemark, setCancelRemark] = useState('')

  const instMap = useMemo(
    () => new Map(institutions.map((item) => [item.id, item.name])),
    [institutions],
  )
  const institutionName = (record: ActivityRegistrationDTO) =>
    instMap.get(record.institution_id) ?? `机构 ${record.institution_id}`

  // 活动信息 + 参与机构（页面描述与筛选下拉）
  useEffect(() => {
    if (!activityId) return
    let cancelled = false
    activityApi
      .getActivity(activityId)
      .then((detail) => {
        if (!cancelled) setActivity(detail)
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
      })
    institutionApi
      .getInstitutions({ page: 1, page_size: 1000 })
      .then((res) => {
        if (!cancelled) setInstitutions(res.list ?? [])
      })
      .catch(() => {
        if (!cancelled) setInstitutions([])
      })
    return () => {
      cancelled = true
    }
  }, [activityId])

  /** 顶部统计：各状态各取 1 条拿 total，避免拉全量名单 */
  const fetchStats = useCallback(async () => {
    if (!activityId) return
    try {
      const [all, signed, checked, cancelled] = await Promise.all([
        activityApi.getActivityRegistrations({ activity_id: activityId, page: 1, page_size: 1 }),
        activityApi.getActivityRegistrations({ activity_id: activityId, page: 1, page_size: 1, status: 1 }),
        activityApi.getActivityRegistrations({ activity_id: activityId, page: 1, page_size: 1, status: 2 }),
        activityApi.getActivityRegistrations({ activity_id: activityId, page: 1, page_size: 1, status: 3 }),
      ])
      setStats({
        total: all.total ?? 0,
        signed: signed.total ?? 0,
        checked: checked.total ?? 0,
        cancelled: cancelled.total ?? 0,
      })
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }, [activityId])

  /** 报名列表：分页与报名状态下推接口（跨活动接口 + activity_id） */
  const fetchList = useCallback(
    async (targetPage: number, filters: SignupFilters) => {
      if (!activityId) return
      setLoading(true)
      try {
        const res = await activityApi.getActivityRegistrations({
          activity_id: activityId,
          page: targetPage,
          page_size: PAGE_SIZE,
          status: filters.status ?? undefined,
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
    [activityId],
  )

  // 进入页面 / 切换活动：加载第 1 页与统计
  useEffect(() => {
    setPage(1)
    void fetchList(1, emptyFilters)
    void fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId])

  /** 刷新当前页与统计（签到 / 取消报名后） */
  const refresh = useCallback(async () => {
    await fetchList(page, applied)
    void fetchStats()
  }, [fetchList, fetchStats, page, applied])

  /** 当前页兜底过滤：关键字 / 机构 / 报名日期后端未提供筛选参数，先对返回的本页数据过滤 */
  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.phone.includes(applied.keyword) ||
        String(item.id).includes(applied.keyword)
      const institutionHit =
        !applied.institution_id || item.institution_id === applied.institution_id
      const statusHit = !applied.status || item.status === applied.status
      const dateHit =
        !applied.date ||
        formatDateTime(item.registered_at && item.registered_at * 1000, 'YYYY-MM-DD').includes(
          applied.date,
        )
      return keywordHit && institutionHit && statusHit && dateHit
    })
  }, [applied, rows])

  /** 报名状态变化（Tabs 与下拉共用）：回到第 1 页并重新请求 */
  const changeStatus = (nextStatus: number | null) => {
    setStatus(nextStatus)
    const nextFilters: SignupFilters = { ...applied, status: nextStatus }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
    void fetchStats()
  }

  const applyFilters = () => {
    const nextFilters: SignupFilters = {
      keyword: keyword.trim(),
      institution_id: institution,
      status,
      date: date.trim(),
    }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setKeyword('')
    setInstitution(null)
    setStatus(null)
    setDate('')
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters)
    void fetchStats()
  }

  /**
   * 导出报名记录：后端返回 CSV 文件流（Content-Disposition 带文件名），成功即触发下载
   * 失败（含后端未实现时返回的 501）由 request 拦截器统一提示错误
   */
  const handleExport = async () => {
    if (!activityId) return
    setExporting(true)
    try {
      const res = await activityApi.exportActivityRegistrations(activityId)
      const blob = res.data
      if (!blob || blob.size === 0) {
        message.warning('导出内容为空')
        return
      }
      // 文件名优先取后端 Content-Disposition，取不到时用活动标题兜底
      const disposition = String(res.headers?.['content-disposition'] ?? '')
      const matched = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)
      const filename = matched?.[1]
        ? decodeURIComponent(matched[1])
        : `${activity?.title ?? '活动'}_报名记录.csv`
      downloadBlob(blob, filename)
      message.success('导出成功，已开始下载')
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setExporting(false)
    }
  }

  /** 签到：二次确认后调用接口；签到后该记录不能再取消 */
  const handleCheckin = (record: ActivityRegistrationDTO) => {
    modal.confirm({
      title: '确认签到',
      content: `确认为「${record.name}」完成签到？签到后不能再取消报名。`,
      okText: '确认签到',
      cancelText: '取消',
      onOk: async () => {
        try {
          await activityApi.checkinRegistration(record.id)
          message.success(`「${record.name}」已签到`)
        } catch {
          /* 错误提示由 request 拦截器统一处理 */
        }
        await refresh()
      },
    })
  }

  const closeCancelModal = () => {
    setCancelTarget(null)
    setCancelRemark('')
  }

  /** 取消报名：写入取消原因（选填），成功后刷新名单与统计 */
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await activityApi.cancelRegistration(cancelTarget.id, cancelRemark.trim() || '运营后台取消')
      message.success(`已取消 ${cancelTarget.name} 的报名`)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
    closeCancelModal()
    await refresh()
  }

  const metrics = [
    { key: 'total', label: '报名人数', value: stats.total, badge: '含已签到与已取消', tone: 'primary' },
    { key: 'signed', label: '待签到', value: stats.signed, badge: '可签到或取消', tone: 'warning' },
    { key: 'checked', label: '已签到', value: stats.checked, badge: '已签到不可取消', tone: 'info' },
    { key: 'cancelled', label: '已取消', value: stats.cancelled, badge: '不涉及退款', tone: 'danger' },
  ]

  const tabItems = [
    { value: 'all', label: `全部 ${stats.total}` },
    { value: '1', label: `待签到 ${stats.signed}` },
    { value: '2', label: `已签到 ${stats.checked}` },
    { value: '3', label: `已取消 ${stats.cancelled}` },
  ]

  const columns: ColumnsType<ActivityRegistrationDTO> = useMemo(
    () => [
      {
        title: '报名 / 参与人',
        key: 'name',
        render: (_, record) => (
          <div className="signup-user">
            <strong>{record.name || '—'}</strong>
            <span>报名 #{record.id}</span>
          </div>
        ),
      },
      {
        title: '联系方式',
        dataIndex: 'phone',
        key: 'phone',
        width: 130,
        render: (value?: string) => value || '—',
      },
      {
        title: '所选机构',
        key: 'institution',
        width: 160,
        render: (_, record) => institutionName(record),
      },
      {
        title: '参与人数',
        dataIndex: 'participant_count',
        key: 'participant_count',
        width: 100,
        render: (value: number) => `${value ?? 0} 人`,
      },
      {
        title: '报名来源',
        dataIndex: 'registered_source',
        key: 'registered_source',
        width: 120,
        render: (value?: string) => (value ? (sourceText[value] ?? value) : '—'),
      },
      {
        title: '报名状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => (
          <span className={`signup-status signup-status--${statusTone[value] ?? 'cancelled'}`}>
            {registrationStatusText[value] ?? '—'}
          </span>
        ),
      },
      {
        title: '报名时间',
        dataIndex: 'registered_at',
        key: 'registered_at',
        width: 140,
        render: (value: number) => formatDateTime(value && value * 1000, 'MM-DD HH:mm'),
      },
      {
        title: '取消时间',
        dataIndex: 'unregistered_at',
        key: 'unregistered_at',
        width: 140,
        render: (value: number) => formatDateTime(value && value * 1000, 'MM-DD HH:mm'),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        width: 140,
        render: (value?: string) => value || '—',
      },
      {
        title: '操作',
        key: 'action',
        width: 130,
        render: (_, record) => {
          /* 已报名：可签到 / 可取消；已签到：不可再取消；已取消：无操作 */
          if (record.status !== 1) return <span>—</span>
          return (
            <Space size={4}>
              <Button type="link" size="small" onClick={() => handleCheckin(record)}>
                签到
              </Button>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => {
                  setCancelTarget(record)
                  setCancelRemark('')
                }}
              >
                取消
              </Button>
            </Space>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [instMap, activity],
  )

  return (
    <PageContainer
      title={activity?.title ?? '报名查询'}
      description={`活动编号 ${activity?.code ?? '-'} · ${activity?.location || '区域待完善'} · 报名 ${formatDateTime(
        activity?.start_date && activity.start_date * 1000,
        'MM-DD',
      )} ~ ${formatDateTime(activity?.end_date && activity.end_date * 1000, 'MM-DD')} · 共 ${
        activity?.institutions?.length ?? 0
      } 家参与机构`}
      extra={
        <Space>
          <Button
            color="primary" variant='outlined'
            icon={<ArrowLeftOutlined />} onClick={() => navigate('/activity')}>
            返回活动列表
          </Button>
          <Button color="primary" variant='outlined' icon={<EditOutlined />} onClick={() => navigate(`/activity/detail/${activityId}`)}>
            编辑活动
          </Button>
        </Space>
      }
    >
      <div className="activity-signups">
        <Row gutter={[16, 16]}>
          {metrics.map((metric) => (
            <Col xs={24} sm={12} lg={6} key={metric.key}>
              <Card variant="borderless" className="metric-card">
                <div className="metric-card__head">
                  <span className="metric-card__label">{metric.label}</span>
                  <i className={`metric-card__icon metric-card__icon--${metric.tone} metric-card__icon--round`}>
                    <BarChartOutlined />
                  </i>
                </div>
                <div className="metric-card__value">{metric.value}</div>
                <span className={`metric-card__note metric-card__note--${metric.tone}`}>
                  {metric.badge}
                </span>
              </Card>
            </Col>
          ))}
        </Row>

        <Card variant="borderless" className="filter-bar activity-signups__filter">
          <Input
            allowClear
            placeholder="报名编号 / 姓名或手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={institution}
            onChange={(value) => setInstitution(value ?? null)}
            options={institutions.map((item) => ({ label: item.name, value: item.id }))}
            allowClear
            placeholder="报名机构"
          />
          <Select
            value={status}
            onChange={(value) => changeStatus(value ?? null)}
            options={Object.entries(registrationStatusText).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="报名状态"
          />
          <Input
            allowClear
            placeholder="报名日期（如 08-18）"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">报名记录</span>
            </div>
            <Space>
              <Radio.Group
                className="list-card__status-filter"
                optionType="button"
                value={applied.status == null ? 'all' : String(applied.status)}
                onChange={(event) => changeStatus(event.target.value === 'all' ? null : Number(event.target.value))}
                options={tabItems}
              />
              <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
                导出
              </Button>
            </Space>
          </div>
          <Table<ActivityRegistrationDTO>
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
                void fetchList(nextPage, applied)
              },
              showTotal: (count) => `共 ${count} 条`,
            }}
          />
        </Card>
      </div>

      <Modal
        open={!!cancelTarget}
        title="取消报名"
        onCancel={closeCancelModal}
        footer={
          <div className="cancel-modal__footer">
            <Button onClick={closeCancelModal}>暂不取消</Button>
            <Button danger type="primary" onClick={handleConfirmCancel}>
              确认取消
            </Button>
          </div>
        }
      >
        {cancelTarget && (
          <div className="cancel-modal">
            <p className="cancel-modal__desc">
              确认取消以下用户的活动报名吗？取消后名单将同步更新。
            </p>
            <div className="cancel-modal__user">
              <strong>
                {cancelTarget.name} {cancelTarget.phone}
              </strong>
              <span>
                {activity?.title ?? '活动'} · {institutionName(cancelTarget)}
              </span>
            </div>
            <div className="cancel-modal__remark">
              <label>取消原因</label>
              <Input.TextArea
                rows={3}
                value={cancelRemark}
                onChange={(event) => setCancelRemark(event.target.value)}
                placeholder="选填，将记录在报名取消信息中"
              />
            </div>
            <p className="cancel-modal__danger">
              此操作不涉及退款，仅将报名状态更新为“已取消”；已签到的记录不能取消。
            </p>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
