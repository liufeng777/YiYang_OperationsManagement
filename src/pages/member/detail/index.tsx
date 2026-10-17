/**
 * 会员管理 - 注册会员详情（设计稿：基本资料 / 本人及关联家属 / 订单记录）
 * 已对接接口：
 *   - 会员档案详情 GET /admin/members/:id（基础信息；详情响应未强类型，关联家属做容错解析）
 *   - 购买情况 / 订单记录 GET /admin/orders?member_id=（有效订单=待确认/生效中/已完成）
 *   - 承接机构名称 GET /admin/institutions（institution_id → 机构名）
 * 接口缺口（swagger.json 未提供）：
 *   - 注册来源与邀请人、注册时间（详情响应未返回时展示「—」）
 *   - 关联家属的健康会员接入状态、关系/性别/年龄字段（容错解析 relations / family_members / bind_members）
 *   - 订单的服务项目名称与套餐说明（OrderDetail 无该字段，展示订单号 + 购买服务次数兜底）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageContainer from '@/components/PageContainer'
import PageLoading from '@/components/PageLoading'
import { institutionApi, memberApi, orderApi } from '@/api'
import type { OrderDetail } from '@/api/modules/order'
import type { RegisteredMemberRow } from '@/api/modules/memberOperation'
import { formatAmount, formatDateTime } from '@/utils'
import { GENDER_TEXT } from '../constants'
import './index.less'

/** 订单状态文案（order.ts：1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款） */
const ORDER_STATUS_TEXT: Record<number, string> = {
  1: '待支付',
  2: '待确认',
  3: '生效中',
  4: '已完成',
  5: '已取消',
  6: '已退款',
}

/** 有效订单状态（用于购买情况统计） */
const VALID_ORDER_STATUS = new Set([2, 3, 4])

/** 关联家属行（详情响应未强类型，容错解析后归一化） */
interface FamilyRow {
  key: string | number
  /** 姓名 */
  name: string
  /** 关系文案 */
  relation?: string
  /** 性别：1-男 2-女 */
  gender?: number
  /** 年龄（由 birthday 计算或直接返回） */
  age?: number
  /** 健康会员接入状态文案（接口未返回时为 —） */
  accessStatus?: string
}

/** 由出生日期（yyyy-MM-dd）计算年龄 */
function calcAge(birthday?: string): number | undefined {
  if (!birthday) return undefined
  const date = dayjs(birthday)
  if (!date.isValid()) return undefined
  return dayjs().diff(date, 'year')
}

/** 从会员详情响应中容错解析关联家属列表（字段名待后端确认：relations / family_members / bind_members） */
function parseFamilyRows(detail: unknown): FamilyRow[] {
  const source = detail as Record<string, unknown> | null
  const raw =
    (source?.relations as unknown[]) ??
    (source?.family_members as unknown[]) ??
    (source?.bind_members as unknown[]) ??
    []
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const record = item as Record<string, unknown>
    return {
      key: (record.id as number) ?? (record.member_id as number) ?? index,
      name: (record.name as string) ?? (record.member_name as string) ?? '—',
      relation: (record.relation_name as string) ?? (record.relation_text as string) ?? undefined,
      gender: record.gender as number | undefined,
      age: (record.age as number | undefined) ?? calcAge(record.birthday as string | undefined),
      accessStatus: record.access_status_text as string | undefined,
    }
  })
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const memberId = Number(id)
  const navigate = useNavigate()

  const [detail, setDetail] = useState<RegisteredMemberRow | null>(null)
  const [loading, setLoading] = useState(false)
  /** 关联家属（容错解析自详情响应） */
  const [familyRows, setFamilyRows] = useState<FamilyRow[]>([])
  /** 订单记录（同时用于头部购买情况统计） */
  const [orders, setOrders] = useState<OrderDetail[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  /** 机构字典：institution_id → 机构名称（订单承接机构展示） */
  const [institutionMap, setInstitutionMap] = useState<Map<number, string>>(new Map())

  const fetchDetail = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    try {
      const res = await memberApi.getMember(memberId)
      setDetail(res as RegisteredMemberRow)
      setFamilyRows(parseFamilyRows(res))
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [memberId])

  const fetchOrders = useCallback(async () => {
    if (!memberId) return
    setOrdersLoading(true)
    try {
      const res = await orderApi.getOrders({ page: 1, page_size: 100, member_id: memberId })
      setOrders(res.list ?? [])
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void fetchDetail()
    void fetchOrders()
    institutionApi
      .getInstitutions({ page: 1, page_size: 200 })
      .then((res) => {
        setInstitutionMap(new Map((res.list ?? []).map((item) => [item.id, item.name])))
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
      })
  }, [fetchDetail, fetchOrders])

  /** 购买情况：有效订单数（实付金额合计备用） */
  const purchaseSummary = useMemo(() => {
    const valid = orders.filter((item) => VALID_ORDER_STATUS.has(item.order_status))
    const paidTotal = valid.reduce((sum, item) => sum + (item.paid_amount ?? 0), 0)
    return { count: valid.length, amount: paidTotal / 100 }
  }, [orders])

  const familyColumns: ColumnsType<FamilyRow> = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '关系',
      key: 'relation',
      width: 160,
      render: (_, record) => record.relation ?? '—',
    },
    {
      title: '性别 / 年龄',
      key: 'genderAge',
      width: 200,
      render: (_, record) => {
        const gender = record.gender ? GENDER_TEXT[record.gender] : null
        const age = record.age != null ? `${record.age}岁` : null
        return gender || age ? [gender, age].filter(Boolean).join(' · ') : '—'
      },
    },
    {
      title: '健康会员接入状态',
      key: 'accessStatus',
      width: 200,
      render: (_, record) => record.accessStatus ?? '—',
    },
  ]

  const orderColumns: ColumnsType<OrderDetail> = [
    {
      title: '订单号 / 服务项目',
      key: 'order_no',
      render: (_, record) => (
        <div className="member-detail__order-cell">
          <strong>{record.order_no}</strong>
          <span>
            购买服务 {record.service_count} 次
            {record.served_count ? ` · 已服务 ${record.served_count} 次` : ''}
          </span>
        </div>
      ),
    },
    {
      title: '服务对象 / 承接机构',
      key: 'target',
      render: (_, record) => (
        <div className="member-detail__order-cell">
          <strong>{record.contact_name || '—'}</strong>
          <span>
            {record.institution_id
              ? (institutionMap.get(record.institution_id) ?? `#${record.institution_id}`)
              : '—'}
          </span>
        </div>
      ),
    },
    {
      title: '实付金额 / 订单状态',
      key: 'paid',
      width: 200,
      render: (_, record) => (
        <div className="member-detail__order-cell">
          <strong>{formatAmount(record.paid_amount / 100)}</strong>
          <span>{ORDER_STATUS_TEXT[record.order_status] ?? record.order_status}</span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/order/detail/${record.id}`)}
        >
          查看订单
        </Button>
      ),
    },
  ]

  if (loading && !detail) {
    return <PageLoading />
  }

  return (
    <PageContainer
      title="注册会员详情"
      description={
        detail
          ? `${detail.name} · ${detail.phone || '—'} · 会员编号 M-${String(detail.id).padStart(6, '0')}`
          : undefined
      }
      extra={
        <Button color="primary" variant='outlined'
        icon={<ArrowLeftOutlined />} onClick={() => navigate('/member/registered')}>
          返回列表
        </Button>
      }
    >
      <div className="member-detail">
        <Card variant="borderless" className="member-detail__base">
          <div className="member-detail__base-grid">
            <div className="member-detail__field">
              <span className="member-detail__field-label">注册来源</span>
              <span className="member-detail__field-value">
                {detail?.source_text
                  ? `${detail.source_text}${detail.inviter_name ? ` · ${detail.inviter_name}` : ''}${detail.inviter_code ? `（${detail.inviter_code}）` : ''}`
                  : '—'}
              </span>
            </div>
            <div className="member-detail__field">
              <span className="member-detail__field-label">注册时间</span>
              <span className="member-detail__field-value">
                {detail?.registered_at
                  ? formatDateTime(detail.registered_at * 1000, 'YYYY-MM-DD HH:mm')
                  : '—'}
              </span>
            </div>
            <div className="member-detail__field">
              <span className="member-detail__field-label">购买情况</span>
              <span className="member-detail__field-value">
                {purchaseSummary.count > 0 ? `已购买 · ${purchaseSummary.count} 笔订单` : '未购买'}
              </span>
            </div>
          </div>
        </Card>

        <Card variant="borderless" className="member-detail__card">
          <div className="member-detail__card-header">
            <span className="member-detail__card-title">本人及关联家属</span>
            <span className="member-detail__card-extra">共 {familyRows.length} 条</span>
          </div>
          <Table<FamilyRow>
            rowKey="key"
            size="small"
            columns={familyColumns}
            dataSource={familyRows}
            pagination={false}
            locale={{
              emptyText: '详情接口暂未返回关联家属字段（relations / family_members），待后端补充',
            }}
          />
        </Card>

        <Card variant="borderless" className="member-detail__card">
          <div className="member-detail__card-header">
            <span className="member-detail__card-title">订单记录</span>
            <span className="member-detail__card-extra">共 {orders.length} 条</span>
          </div>
          <Table<OrderDetail>
            rowKey="id"
            size="small"
            loading={ordersLoading}
            columns={orderColumns}
            dataSource={orders}
            pagination={false}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
