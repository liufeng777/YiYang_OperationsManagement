/**
 * 会员管理 - 注册会员详情（设计稿：基本资料 / 本人及关联家属 / 订单记录）
 * 数据来源：memberApi.getUser（GET /admin/users/:id，实测返回 UserDTO）
 *   - 基本资料：注册来源 / 邀请人、注册时间、购买情况、账号状态（status）、推广码（referral_code）、微信 OpenID
 *   - 本人及关联家属：bound_members（name / relation_text / gender / age / health_access_status）
 *   - 订单记录：order_records（order_no / service_name / service_count / is_use_consumables
 *     / member_name / institution_name / total_amount / discount_amount / paid_amount / order_status / created_at / paid_at）
 *   - 购买情况：按 order_records 中有效订单（待确认 / 生效中 / 已完成）统计
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import PageLoading from '@/components/PageLoading'
import { memberApi } from '@/api'
import type { OrderRecordBrief } from '@/api/modules/member'
import { registerSourceText } from '@/api/modules/memberOperation'
import type { RegisteredUserRow } from '@/api/modules/memberOperation'
import { formatAmount, formatDateTime } from '@/utils'
import { GENDER_TEXT } from '../constants';
import { ORDER_STATUS_TEXT } from '@/pages/order/list'
import '@/pages/order/list.less'
import './index.less'

/** 有效订单状态（用于购买情况统计） */
const VALID_ORDER_STATUS = new Set([2, 3, 4])

/** 本人及关联家属行（本人 = 注册用户；家属 = 用户绑定的健康会员 bound_members） */
interface FamilyRow {
  key: string | number
  /** 姓名 / 昵称 */
  name: string
  /** 手机号（脱敏） */
  phone?: string
  /** 关系文案（本人行固定「本人」） */
  relation?: string
  /** 性别：1-男 2-女 */
  gender?: number
  /** 年龄 */
  age?: number
  /** 健康会员接入状态文案 */
  accessStatus?: string
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)
  const navigate = useNavigate()

  const [detail, setDetail] = useState<RegisteredUserRow | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await memberApi.getUser(userId)
      setDetail(res)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  /** 本人及关联家属：首行为注册用户本人，其后为绑定会员（家属） */
  const familyRows = useMemo<FamilyRow[]>(() => {
    if (!detail) return []
    return (detail.bound_members ?? []).map((item) => ({
      key: item.member_id,
      name: item.name || '—',
      phone: item.phone,
      relation: item.relation_text || '—',
      gender: item.gender,
      age: item.age,
      accessStatus: item.health_access_status || undefined,
    }))
  }, [detail])

  /** 订单记录：详情接口直接返回 */
  const orders = useMemo<OrderRecordBrief[]>(() => detail?.order_records ?? [], [detail])

  /** 购买情况：有效订单数（待确认 / 生效中 / 已完成） */
  const purchaseSummary = useMemo(() => {
    const valid = orders.filter((item) => VALID_ORDER_STATUS.has(item.order_status))
    const paidTotal = valid.reduce((sum, item) => sum + (Number(item.paid_amount) || 0), 0)
    return { count: valid.length, amount: paidTotal }
  }, [orders])

  const familyColumns: ColumnsType<FamilyRow> = [
    {
      title: '姓名',
      key: 'name',
      render: (_, record) => (
        <div className="table-cell">
          <strong>{record.name}</strong>
          {record.phone && <span>{record.phone}</span>}
        </div>
      ),
    },
    {
      title: '关系',
      key: 'relation',
      render: (_, record) => record.relation ?? '—',
    },
    {
      title: '性别 / 年龄',
      key: 'genderAge',
      render: (_, record) => {
        const gender = record.gender ? GENDER_TEXT[record.gender] : null
        const age = record.age != null ? `${record.age}岁` : null
        return gender || age ? [gender, age].filter(Boolean).join(' · ') : '—'
      },
    },
    {
      title: '健康会员接入状态',
      key: 'accessStatus',
      render: (_, record) => record.accessStatus ?? '—',
    },
  ]

  const orderColumns: ColumnsType<OrderRecordBrief> = [
    {
      title: '订单号',
      key: 'order_no',
      dataIndex: 'order_no',
    },
    {
      title: '服务 / 购买次数',
      key: 'server_info',
      render: (_, record) => (
        <div className="table-cell">
          <strong>{record.service_name || '—'}</strong>
          <span>
            购买服务 {record.service_count} 次
            {record.is_use_consumables === 1 ? ' · 含耗材' : ''}
          </span>
        </div>
      ),
    },
    {
      title: '服务对象 / 承接机构',
      key: 'target',
      render: (_, record) => (
        <div className="table-cell">
          <strong>{record.member_name || '—'}</strong>
          <span>{record.institution_name || '—'}</span>
        </div>
      ),
    },
    {
      title: '实付金额',
      key: 'paid',
      width: 170,
      render: (_, record) => {
        const discount = Number(record.discount_amount) || 0
        return (
          <div className="table-cell">
            <strong>{formatAmount(record.paid_amount)}</strong>
            <span>
              总额 {formatAmount(record.total_amount)}
              {discount > 0 ? ` · 优惠 ${formatAmount(record.discount_amount)}` : ''}
            </span>
          </div>
        )
      },
    },
    {
      title: '订单状态',
      key: 'order_status',
      width: 110,
      render: (_, record) => (
        <span className={`order-status order-status--${record.order_status}`}>
          {ORDER_STATUS_TEXT[record.order_status] ?? '—'}
        </span>
      ),
    },
    {
      title: '下单 / 支付时间',
      key: 'created_at',
      width: 150,
      render: (_, record) => (
        <div className="table-cell">
          <strong>{formatDateTime(record.created_at * 1000, 'YYYY-MM-DD HH:mm')}</strong>
          <span>{record.paid_at ? `支付 ${formatDateTime(record.paid_at * 1000, 'MM-DD HH:mm')}` : '未支付'}</span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
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
          ? `${detail.nickname || '—'} · ${detail.phone || '—'} · 用户编号 U-${String(detail.id).padStart(6, '0')}`
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
                {detail
                  ? `${registerSourceText(detail)}${detail.inviter_name ? ` · ${detail.inviter_name}` : ''}`
                  : '—'}
              </span>
            </div>
            <div className="member-detail__field">
              <span className="member-detail__field-label">注册时间</span>
              <span className="member-detail__field-value">
                {detail?.created_at
                  ? formatDateTime(detail.created_at * 1000, 'YYYY-MM-DD HH:mm')
                  : '—'}
              </span>
            </div>
            <div className="member-detail__field">
              <span className="member-detail__field-label">购买情况</span>
              <span className="member-detail__field-value">
                {purchaseSummary.count > 0
                  ? `已购买 · ${purchaseSummary.count} 笔订单 · 实付 ${formatAmount(purchaseSummary.amount)}`
                  : '未购买'}
              </span>
            </div>
            <div className="member-detail__field">
              <span className="member-detail__field-label">账号状态</span>
              <span className="member-detail__field-value">
                {detail ? (
                  <Tag color={detail.status === 1 ? 'success' : 'default'}>
                    {detail.status === 1 ? '正常' : detail.status === 9 ? '已禁用' : `状态 ${detail.status}`}
                  </Tag>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="member-detail__field">
              <span className="member-detail__field-label">推广码</span>
              <span className="member-detail__field-value">{detail?.referral_code || '—'}</span>
            </div>
            <div className="member-detail__field">
              <span className="member-detail__field-label">微信 OpenID</span>
              <span className="member-detail__field-value">{detail?.openid || '—'}</span>
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
              emptyText: '该注册用户暂未绑定健康会员',
            }}
          />
        </Card>

        <Card variant="borderless" className="member-detail__card">
          <div className="member-detail__card-header">
            <span className="member-detail__card-title">订单记录</span>
            <span className="member-detail__card-extra">共 {orders.length} 条</span>
          </div>
          <Table<OrderRecordBrief>
            rowKey="id"
            size="small"
            loading={loading}
            columns={orderColumns}
            dataSource={orders}
            pagination={false}
            locale={{
              emptyText: '暂无订单记录',
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
