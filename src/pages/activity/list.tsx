/**
 * 活动管理 - 活动列表
 * 视觉对齐设计稿：顶部统计 + 筛选 + 状态 Tabs + 活动表格
 * 数据来源：activityApi.getActivities（分页 + 类型/机构/状态/关键字筛选）
 * 操作列：主操作（发布/重新发布/报名查询）+ 配置机构（独立抽屉组件）+ 查看详情 + 更多（取消/删除）
 * 字段以后端实际契约为准：类型出参 activity_type、筛选入参 type、时间 start_date/end_date、
 * 聚合字段 institution_count / total_registered / total_max_participants（列表接口返回，不含 institutions）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Dropdown, Input, Select, Col, Row, Tag, Divider, Tooltip } from 'antd'
import FillTable from '@/components/FillTable'
import type { MenuProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { activityApi } from '@/api'
import type { ActivityItem } from '@/api/modules/activity'
import { institutionApi } from '@/api'
import type { InstitutionItem } from '@/api/modules/institution'
import InstitutionConfigDrawer, {
  toInstitutionConfigs,
  toInstitutionRows,
  type ActivityInstitutionRow,
} from './components/InstitutionConfigDrawer'
import './list.less'

/** 活动类型：1社区活动 / 2康养旅游 / 3健康课堂 / 4健康活动 / 5其他 */

/** 活动状态枚举文案（status=2 的细分见 resolveActivityStatus） */
const statusText: Record<number, string> = {
  0: '未知',
  1: '待发布',
  2: '报名中',
  3: '已结束',
  9: '已取消',
}

/**
 * 活动展示状态：status=2（报名中）时结合报名时间与名额动态计算
 * - 当前时间已超出 end_date → 报名结束
 * - 当前时间早于 start_date → 报名未开始
 * - 报名期内：total_registered < total_max_participants → 报名中；已满 → 已满员
 * 其余状态（1 待发布 / 3 已结束 / 9 已取消）直接取枚举文案
 * @param nowSeconds 当前时间（UTC 秒），可注入便于校验
 */
export function resolveActivityStatus(
  record: ActivityItem,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): {label: string, className: string } {
  if (record.status !== 2) return {
    label: statusText[record.status],
    className: record.status === 1 ? 'status--warning' : 'status--danger'
  }
  if (record.end_date && nowSeconds > record.end_date) return {
    label: '报名已结束',
    className: 'status--cancel'
  }
  if (record.start_date && nowSeconds < record.start_date) return {
    label: '报名未开始',
    className: 'status--info'
  }
  const registered = record.total_registered ?? 0
  const maxParticipants = record.total_max_participants ?? 0
  if (maxParticipants > 0 && registered >= maxParticipants) return {
    label: '已满员',
    className: 'status--info'
  }
  return {
    label: '报名中',
    className: 'status--success'
  }
}

/** UTC 秒 → 日期文案：当年只显示「MM-DD」，跨年显示「YYYY-MM-DD」；缺值显示 - */
export function formatActivityDate(
  seconds?: number,
  nowYear: number = dayjs().year(),
): string {
  if (!seconds) return '-'
  const value = dayjs(seconds * 1000)
  return value.year() === nowYear ? value.format('MM-DD') : value.format('YYYY-MM-DD')
}

const typeText: Record<number, {text: string, color: string}> = {
  1: {
    text: '社区活动',
    color: 'geekblue'
  },
  2: {
    text: '康养旅游',
    color: 'purple'
  },
  3: {
    text: '健康课堂',
    color: 'cyan'
  },
  4: {
    text: '健康活动',
    color: 'lime'
  },
  5: {
    text: '其他',
    color: 'default'
  }
}

interface ActivityFilters {
  keyword: string
  type: number | null
  institution_id: number | null
  status: number | null
}

const emptyFilters: ActivityFilters = {
  keyword: '',
  type: null,
  institution_id: null,
  status: null,
}

export default function ActivityList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([])
  const [data, setData] = useState<ActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<number | null>(null)
  const [institution, setInstitution] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [applied, setApplied] = useState<ActivityFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const pageSize = 10
  /** 配置机构抽屉：目标活动 + 抽屉内编辑的行 + 落库中 */
  const [configTarget, setConfigTarget] = useState<ActivityItem | null>(null)
  const [configRows, setConfigRows] = useState<ActivityInstitutionRow[]>([])
  const [configSubmitting, setConfigSubmitting] = useState(false)

  // 接口①：进入页面拉取机构列表（筛选下拉 + 配置机构抽屉共用；抽屉内还会再拉一次以补全机构信息）
  useEffect(() => {
    let cancelled = false
    institutionApi
      .getInstitutions({ page: 1, page_size: 1000 })
      .then((res) => {
        if (cancelled) return
        const list = res.list ?? []
        setInstitutions(list)
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
        setInstitutions([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 拉取活动列表（筛选条件以后端查询参数下发） */
  const fetchList = useCallback(
    async (targetPage = page) => {
      setLoading(true)
      try {
        const result = await activityApi.getActivities({
          page: targetPage,
          page_size: pageSize,
          keyword: applied.keyword || undefined,
          // 筛选入参名为 type（后端约定），非 activity_type
          type: applied.type ?? undefined,
          institution_id: applied.institution_id ?? undefined,
          status: applied.status ?? undefined,
        })
        setData(result.list ?? [])
        setTotal(result.total ?? 0)
      } catch {
        // 错误提示由 request 拦截器统一处理
        setData([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [applied, page],
  )

  useEffect(() => {
    void fetchList(page)
  }, [fetchList, page])

  /** 顶部统计：活动总数与各状态数量（基于当前列表数据汇总） */
  const metrics = useMemo(() => {
    const countBy = (target: number) => data.filter((item) => item.status === target).length
    return [
      { key: 0, label: '全部活动', value: total, badge: '按当前筛选条件统计', tone: 'primary' },
      { key: 2, label: '报名中', value: countBy(2), badge: '本页报名中活动', tone: 'info' },
      { key: 1, label: '待发布', value: countBy(1), badge: '本页待发布活动', tone: 'danger' },
      { key: 3, label: '已结束', value: countBy(3), badge: '本页已结束活动', tone: 'warning' },
    ]
  }, [data, total])

  const applyFilters = () => {
    setPage(1)
    setApplied({ keyword: keyword.trim(), type, institution_id: institution, status })
  }

  const handleReset = () => {
    setKeyword('')
    setType(null)
    setInstitution(null)
    setStatus(null)
    setPage(1)
    setApplied(emptyFilters)
  }

  /** 打开「配置机构」抽屉：以列表行已配置的机构初始化（提交时再取详情做全量覆盖） */
  const openInstitutionDrawer = (record: ActivityItem) => {
    setConfigRows(toInstitutionRows(record.institutions))
    setConfigTarget(record)
  }

  const closeInstitutionDrawer = () => {
    setConfigTarget(null)
    setConfigRows([])
  }

  /** 完成配置：走「更新活动」接口（PUT /activities/:id，全量覆盖） */
  const handleSubmitInstitutions = async (rows: ActivityInstitutionRow[]) => {
    if (!configTarget) return
    const id = Number(configTarget.id)
    setConfigSubmitting(true)
    try {
      // 列表数据不一定含完整字段（图文详情 / 封面等），先取详情再整体提交，避免把后端数据写空
      const detail = await activityApi.getActivity(id)
      await activityApi.updateActivity(id, {
        code: detail.code,
        title: detail.title,
        title_en: detail.title_en,
        activity_type: detail.activity_type,
        cover_url: detail.cover_url,
        description: detail.description,
        location: detail.location,
        target_crowd: detail.target_crowd,
        start_date: detail.start_date,
        end_date: detail.end_date,
        status: detail.status,
        institutions: toInstitutionConfigs(rows, detail.institutions ?? []),
      })
      message.success('参与机构配置已更新')
      closeInstitutionDrawer()
      void fetchList(page)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setConfigSubmitting(false)
    }
  }

  /** 发布活动（待发布 → 报名中） */
  const handlePublish = async (record: ActivityItem) => {
    try {
      await activityApi.updateActivityStatus(Number(record.id), 2)
      message.success(`「${record.title}」已发布`)
      void fetchList(page)
    } catch {
      /* 拦截器已提示 */
    }
  }

  /** 取消活动（报名中 → 已取消）：危险操作，二次确认 */
  const handleCancelActivity = (record: ActivityItem) => {
    modal.confirm({
      title: `确认取消活动「${record.title}」？`,
      content: '取消后用户端将立即停止报名，已报名用户的报名信息保留但活动标记为已取消。',
      okText: '确认取消',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: async () => {
        try {
          await activityApi.updateActivityStatus(Number(record.id), 9)
          message.success(`「${record.title}」已取消`)
        } catch {
          /* 拦截器已提示 */
        }
        void fetchList(page)
      },
    })
  }

  /** 重新发布（已取消 → 报名中） */
  const handleRepublish = async (record: ActivityItem) => {
    try {
      await activityApi.updateActivityStatus(Number(record.id), 2)
      message.success(`「${record.title}」已重新发布，报名通道已开启`)
      void fetchList(page)
    } catch {
      /* 拦截器已提示 */
    }
  }

  /** 删除活动：危险操作，二次确认 */
  const handleDelete = (record: ActivityItem) => {
    modal.confirm({
      title: `确认删除活动「${record.title}」？`,
      content: '删除后该活动后，所有的报名信息将被清空',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await activityApi.deleteActivity(Number(record.id))
          message.success(`已删除「${record.title}」`)
        } catch {
          /* 拦截器已提示 */
        }
        void fetchList(page)
      },
    })
  }

  const columns = useMemo<ColumnsType<ActivityItem>>(
    () => [
      {
        title: '活动名称',
        key: 'title',
        render: (_, record) => (
          <div className="activity-name">
            <strong>{record.title}</strong>
            <span>{record.title_en}</span>
          </div>
        ),
      },
      {
        title: '活动类型',
        dataIndex: 'activity_type',
        key: 'activity_type',
        width: 110,
        render: (v: number) => <Tag color={typeText[v]?.color} variant='outlined'>{typeText[v]?.text ?? '—'}</Tag>
      },
      {
        title: '承接机构',
        key: 'institution_count',
        width: 110,
        // 列表接口返回聚合字段 institution_count
        render: (_, record) =>
          `${record.institution_count ?? record.institutions?.length ?? 0} 家机构`,
      },
      {
        title: '报名人数',
        key: 'registered',
        width: 120,
        // 已报名 / 最多承接人数（列表聚合字段），浮层给出含义说明
        render: (_, record) => (
          <Tooltip title="已报名人数 / 最多承接人数">
            <span>{`${record.total_registered ?? 0} / ${record.total_max_participants ?? 0} 人`}</span>
          </Tooltip>
        ),
      },
      {
        title: '活动状态',
        key: 'status',
        width: 110,
        render: (_, record) => (
          <span className={`status-btn ${resolveActivityStatus(record).className}`}>
            {resolveActivityStatus(record).label}
          </span>
        ),
      },
      {
        title: '活动时间',
        key: 'activityTime',
        width: 200,
        // 后端返回 UTC 秒，需 ×1000 交给 dayjs；只展示报名起止日期，当年不显示年份
        render: (_, record) =>
          `${formatActivityDate(record.start_date)} ~ ${formatActivityDate(record.end_date)}`,
      },
      {
        title: '操作',
        key: 'action',
        width: 260,
        render: (_, record) => {
          /* 四段式操作列：状态主操作 + 配置机构 + 查看详情 + 更多（低频/危险操作收拢）
             - 待发布(1)：发布；报名中(2)/已结束(3)：报名查询；已取消(9)：重新发布
             - 取消、删除放入「更多」，均需二次确认 */
          const primary =
            record.status === 1
              ? { label: '发布活动', onClick: () => handlePublish(record) }
              : record.status === 9
                ? { label: '重新发布', onClick: () => handleRepublish(record) }
                : { label: '报名查询', onClick: () => navigate(`/activity/signups/${record.id}`) }

          const moreItems: MenuProps['items'] = [
            ...(record.status === 2 ? [{ key: 'cancel', label: '取消活动', danger: true }] : []),
            { key: 'delete', label: '删除活动', danger: true },
          ]
          const onMoreClick: MenuProps['onClick'] = ({ key }) => {
            if (key === 'cancel') handleCancelActivity(record)
            if (key === 'delete') handleDelete(record)
          }

          return (
            <div className="activity-actions">
              <Button type="link" size="small" onClick={primary.onClick}>
                {primary.label}
              </Button>
              <Button type="link" size="small" onClick={() => openInstitutionDrawer(record)}>
                配置机构
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/activity/detail/${record.id}`)}
              >
                查看详情
              </Button>
              <Divider vertical />
              <Dropdown menu={{ items: moreItems, onClick: onMoreClick }} trigger={['click']}>
                <Button type="link" size="small">
                  更多
                  <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, fetchList],
  )

  return (
    <PageContainer
      fixed
      title="活动管理"
      description="平台统一创建活动与康养旅游，选择可承接机构并管理报名与发布"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/activity/create')}>
          新建活动
        </Button>
      }
    >
      <div className="activity-list">
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


        <Card variant="borderless" className="filter-bar activity-list__filter">
          <Input
            allowClear
            placeholder="活动名称或活动编号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={type}
            onChange={setType}
            options={Object.entries(typeText).map(([key, item]) => ({
              label: item.text,
              value: Number(key)
            }))}
            allowClear
            placeholder="活动类型"
          />
          <Select
            value={institution}
            onChange={setInstitution}
            options={institutions.map(v => ({
              label: v.name,
              value: v.id
            }))}
            allowClear
            placeholder="活动承接机构"
          />
          <Select
            value={status}
            onChange={setStatus}
            options={Object.entries(statusText).map(([key, label]) => ({
              label,
              value: Number(key)
            }))}
            allowClear
            placeholder="活动状态"
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">活动列表</span>
              {/* <span  className="list-card__header__tips">共 46 场活动 · 点击「查看」可进入报名查询</span> */}
            </div>
            {/* <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            /> */}
          </div>
          <FillTable<ActivityItem>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={data}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`
            }}
          />
        </Card>
      </div>

      <InstitutionConfigDrawer
        open={!!configTarget}
        title={configTarget ? `配置参与机构 · ${configTarget.title}` : '配置参与机构'}
        value={configRows}
        submitting={configSubmitting}
        // 活动报名起止时间：限制场次日期，并作为新添加机构场次的默认值
        activityStart={configTarget?.start_date ? dayjs(configTarget.start_date * 1000) : null}
        activityEnd={configTarget?.end_date ? dayjs(configTarget.end_date * 1000) : null}
        onClose={closeInstitutionDrawer}
        onSubmit={handleSubmitInstitutions}
      />
    </PageContainer>
  )
}
