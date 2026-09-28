/**
 * 会员管理 - 线索详情（路由页 /member/leads/detail/:id，从线索列表「详情」进入）
 * 权威依据：《线索-前端对接与测试指南》§4/§5
 * 详情 GET /admin/leads/:id：基础字段 + 反查增强（user_nickname/member_name/source_name/followup_records/transfer_records）
 * 操作前置（指南 §5.2）：认领仅 1/4 →2；跟进仅 2；转派仅 1/2/4 →2；转化复核仅 1/2；流失仅 1/2/4；3/9 终态全部禁用
 */
import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Descriptions, Empty, Form, Input, Modal, Select, Space, Spin, Timeline } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { leadApi, staffApi } from '@/api'
import type { LeadDetailDTO, LeadFollowupType } from '@/api/modules/lead'
import type { StaffDTO } from '@/api/modules/staff'
import { formatDateTime } from '@/utils'
import {
  LEAD_FOLLOWUP_TYPE_TEXT,
  LEAD_SOURCE_TEXT,
  LEAD_STATUS_TEXT,
  LEAD_TASK_TYPE_TEXT,
} from '../constants'
import './index.less'

/** 跟进方式选项（指南 §2.4） */
const FOLLOWUP_TYPE_OPTIONS = Object.entries(LEAD_FOLLOWUP_TYPE_TEXT).map(([key, label]) => ({
  label,
  value: Number(key) as LeadFollowupType,
}))

/** 线索来源文案（未命中回显原始值） */
const sourceText = (value?: number) => (value == null ? '—' : (LEAD_SOURCE_TEXT[value] ?? value))

/** UTC 秒格式化 */
const fmtTime = (ts?: number) => (ts ? formatDateTime(ts * 1000, 'YYYY-MM-DD HH:mm') : '—')

export default function LeadDetail() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const leadId = Number(id) || 0

  const [detail, setDetail] = useState<LeadDetailDTO | null>(null)
  const [loading, setLoading] = useState(false)
  /** 认领 / 转派人员选项（在职员工） */
  const [staffList, setStaffList] = useState<StaffDTO[]>([])
  const [assignStaffId, setAssignStaffId] = useState<number | null>(null)
  const [assigning, setAssigning] = useState(false)
  /** 添加跟进表单 */
  const [followupForm] = Form.useForm<{ followup_type: LeadFollowupType; content: string; result?: string }>()
  const [followupSubmitting, setFollowupSubmitting] = useState(false)
  /** 转派弹窗 */
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferForm] = Form.useForm<{ new_assignee: number; reason?: string }>()
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  /** 流失弹窗 */
  const [lostOpen, setLostOpen] = useState(false)
  const [lostForm] = Form.useForm<{ reason?: string }>()
  const [lostSubmitting, setLostSubmitting] = useState(false)

  /** 拉取线索详情（含反查增强字段与履历） */
  const fetchDetail = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const data = await leadApi.getLead(leadId)
      setDetail(data)
      setAssignStaffId(data.assignee || null)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  /** 进入页面：拉取详情 + 在职员工选项（认领/转派共用） */
  useEffect(() => {
    if (!leadId) return
    void fetchDetail()
    void (async () => {
      try {
        const res = await staffApi.getStaffs({ page: 1, page_size: 100, status: 1 })
        setStaffList(res.list ?? [])
      } catch {
        setStaffList([])
      }
    })()
  }, [leadId, fetchDetail])

  /** 操作前置（指南 §5.2 迁移规则表；3/9 为终态） */
  const status = detail?.status
  const isTerminal = status === 3 || status === 9
  const canAssign = status === 1 || status === 4
  const canFollowup = status === 2
  const canTransfer = status === 1 || status === 2 || status === 4
  const canConvert = status === 1 || status === 2

  const staffOptions = staffList.map((item) => ({
    label: `${item.name}（${item.title || '未设岗位'}）`,
    value: item.id,
  }))

  /** 认领（指南 §4.3：body {assignee}，仅 1/4 → 2 跟进中） */
  const handleAssign = async () => {
    if (!detail) return
    if (assignStaffId == null) {
      message.warning('请先选择认领人')
      return
    }
    setAssigning(true)
    try {
      await leadApi.assignLead(detail.id, assignStaffId)
      message.success('认领成功')
      await fetchDetail()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setAssigning(false)
    }
  }

  /** 添加跟进（指南 §4.4：仅 2 跟进中；跟进人由 JWT 落库，前端不传） */
  const handleAddFollowup = async () => {
    if (!detail) return
    let values: { followup_type: LeadFollowupType; content: string; result?: string }
    try {
      values = await followupForm.validateFields()
    } catch {
      return
    }
    setFollowupSubmitting(true)
    try {
      await leadApi.addLeadFollowup(detail.id, {
        followup_type: values.followup_type,
        content: values.content,
        result: values.result?.trim() || undefined,
      })
      message.success('跟进记录已添加')
      followupForm.resetFields()
      await fetchDetail()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setFollowupSubmitting(false)
    }
  }

  /** 确认转派（指南 §4.5：body {new_assignee, reason?}，仅 1/2/4 → 2 跟进中，留痕） */
  const handleTransfer = async () => {
    if (!detail) return
    let values: { new_assignee: number; reason?: string }
    try {
      values = await transferForm.validateFields()
    } catch {
      return
    }
    setTransferSubmitting(true)
    try {
      await leadApi.transferLead(detail.id, values.new_assignee, values.reason?.trim() || undefined)
      message.success('转移成功')
      setTransferOpen(false)
      transferForm.resetFields()
      await fetchDetail()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setTransferSubmitting(false)
    }
  }

  /** 确认流失（指南 §4.8：权威口径 status=9；仅 1/2/4 可标记） */
  const handleLost = async () => {
    if (!detail) return
    let values: { reason?: string }
    try {
      values = await lostForm.validateFields()
    } catch {
      return
    }
    setLostSubmitting(true)
    try {
      await leadApi.loseLead(detail.id, values.reason?.trim() || undefined)
      message.success('线索状态已更新')
      setLostOpen(false)
      lostForm.resetFields()
      await fetchDetail()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setLostSubmitting(false)
    }
  }

  /** 转化复核（指南 §4.7：无 body，服务端按 task_type 自动判定，达成 → 3 已转化） */
  const handleConvert = () => {
    if (!detail) return
    modal.confirm({
      title: '转化复核',
      content:
        '系统将按照任务类型自动复核该线索的转化条件（与每日定时任务同一口径）：达成则置为「已转化」，未达成则状态不变。是否立即复核？',
      okText: '立即复核',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await leadApi.convertLead(detail.id)
          message.success(res?.note || '转化复核完成')
          await fetchDetail()
        } catch {
          /* 错误提示由 request 拦截器统一处理 */
        }
      },
    })
  }

  const followups = detail?.followup_records ?? []
  const transfers = detail?.transfer_records ?? []

  return (
    <PageContainer
      title="线索详情"
      description={
        detail ? `线索 ${detail.lead_no} · ${LEAD_STATUS_TEXT[detail.status] ?? detail.status}` : undefined
      }
      extra={
        <Button color="primary" variant='outlined' icon={<ArrowLeftOutlined />} onClick={() => navigate('/member/leads')}>
          返回列表
        </Button>
      }
    >
      <Spin spinning={loading}>
        <div className="lead-detail">
          <Card variant="borderless" className="lead-detail__section">
            <h4>线索信息</h4>
            <Descriptions
              column={3}
              size="small"
              colon={false}
              items={[
                { key: 'name', label: '联系人', children: detail?.name || '—' },
                { key: 'phone', label: '联系电话', children: detail?.phone || '—' },
                {
                  key: 'task_type',
                  label: '任务类型',
                  children: detail ? (LEAD_TASK_TYPE_TEXT[detail.task_type] ?? detail.task_type) : '—',
                },
                {
                  key: 'source',
                  label: '线索来源',
                  children: detail
                    ? `${sourceText(detail.source_type)}${detail.source_name ? ` · ${detail.source_name}` : ''}`
                    : '—',
                },
                { key: 'assignee', label: '负责人', children: detail?.assignee_name || '待认领' },
                { key: 'assign_at', label: '认领时间', children: fmtTime(detail?.assign_at) },
                {
                  key: 'status',
                  label: '线索状态',
                  children: detail ? (LEAD_STATUS_TEXT[detail.status] ?? detail.status) : '—',
                },
                { key: 'created_at', label: '创建时间', children: fmtTime(detail?.created_at) },
                {
                  key: 'converted_at',
                  label: '转化时间',
                  children: fmtTime(detail?.converted_at),
                },
                { key: 'user', label: '关联用户', children: detail?.user_nickname || '—' },
                { key: 'member', label: '关联会员', children: detail?.member_name || '—' },
                {
                  key: 'remark',
                  label: '备注',
                  children: detail?.remark || '—',
                },
              ]}
            />
          </Card>

          {!isTerminal && detail && (
            <Card variant="borderless" className="lead-detail__section">
              <h4>线索认领</h4>
              <div className="lead-detail__assign">
                <Select
                  className="lead-detail__assignee"
                  value={assignStaffId}
                  onChange={(value) => setAssignStaffId(value ?? null)}
                  options={staffOptions}
                  placeholder="选择认领人（健管师）"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!canAssign}
                />
                <Button type="primary" loading={assigning} disabled={!canAssign} onClick={handleAssign}>
                  确认认领
                </Button>
              </div>
              <p className="lead-detail__tip">
                {canAssign
                  ? '仅「待跟进 / 转化失败」的线索可认领，认领后进入「跟进中」。'
                  : '仅「待跟进 / 转化失败」的线索可认领；跟进中的线索如需换人请使用转派。'}
              </p>
            </Card>
          )}

          <Card variant="borderless" className="lead-detail__section">
            <h4>跟进记录</h4>
            {followups.length > 0 ? (
              <Timeline
                className="lead-detail__timeline"
                items={followups.map((item, index) => ({
                  key: index,
                  children: (
                    <div className="followup-item">
                      <div className="followup-item__meta">
                        <strong>{item.operator_name || item.operator || '—'}</strong>
                        <span>
                          {LEAD_FOLLOWUP_TYPE_TEXT[item.action] ?? '跟进'} · {fmtTime(item.ts)}
                        </span>
                      </div>
                      <p>{item.remark || '—'}</p>
                      {item.next_followup ? <em>下次跟进：{fmtTime(item.next_followup)}</em> : null}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无跟进记录" />
            )}
            {detail &&
              (canFollowup ? (
                <Form form={followupForm} layout="vertical" className="lead-detail__followup-form">
                  <div className="lead-detail__followup-grid">
                    <Form.Item
                      name="followup_type"
                      label="跟进方式"
                      rules={[{ required: true, message: '请选择跟进方式' }]}
                    >
                      <Select options={FOLLOWUP_TYPE_OPTIONS} placeholder="请选择跟进方式" />
                    </Form.Item>
                    <Form.Item name="result" label="跟进结果（选填）">
                      <Input maxLength={100} placeholder="如：已接通 / 未接通 / 已到店" />
                    </Form.Item>
                  </div>
                  <Form.Item
                    name="content"
                    label="跟进内容"
                    rules={[{ required: true, message: '请输入跟进内容' }]}
                  >
                    <Input.TextArea
                      rows={2}
                      maxLength={200}
                      showCount
                      placeholder="记录本次联系情况，如：电话回访已接通，客户表示近期到店考察"
                    />
                  </Form.Item>
                  <Button color="primary" variant='outlined' size="small" icon={<PlusOutlined />} loading={followupSubmitting} onClick={handleAddFollowup}>
                    添加跟进记录
                  </Button>
                </Form>
              ) : (
                <p className="lead-detail__tip">
                  {isTerminal
                    ? '已转化 / 流失的线索为终态，不可再跟进。'
                    : '仅「跟进中」的线索可添加跟进记录，请先认领或接受转派。'}
                </p>
              ))}
          </Card>

          {transfers.length > 0 && (
            <Card variant="borderless" className="lead-detail__section">
              <h4>转派记录</h4>
              <Timeline
                className="lead-detail__timeline"
                items={transfers.map((item, index) => ({
                  key: index,
                  children: (
                    <div className="followup-item">
                      <div className="followup-item__meta">
                        <strong>
                          {item.from_staff_name || '—'} → {item.to_staff_name || '—'}
                        </strong>
                        <span>
                          操作人：{item.operator_name || '—'} · {fmtTime(item.time)}
                        </span>
                      </div>
                      {item.reason ? <p>{item.reason}</p> : null}
                    </div>
                  ),
                }))}
              />
            </Card>
          )}

          <Card variant="borderless" className="lead-detail__section lead-detail__actions">
            <h4>线索操作</h4>
            <Space wrap>
              <Button disabled={!canTransfer} onClick={() => setTransferOpen(true)}>
                转派
              </Button>
              <Button disabled={!canTransfer} onClick={() => setLostOpen(true)}>
                标记流失
              </Button>
              <Button type="primary" variant="outlined" disabled={!canConvert} onClick={handleConvert}>
                转化复核
              </Button>
            </Space>
            <p className="lead-detail__tip">
              {isTerminal
                ? '已转化 / 流失的线索为终态，不可再认领、转派、转化或变更状态。'
                : '转派后线索统一进入「跟进中」；转化复核由系统按任务类型自动判定，非手动置状态。'}
            </p>
          </Card>
        </div>
      </Spin>

      {/* 转派弹窗（指南 §4.5） */}
      <Modal
        title="线索转派"
        open={transferOpen}
        onOk={handleTransfer}
        onCancel={() => setTransferOpen(false)}
        okText="确认转派"
        cancelText="取消"
        confirmLoading={transferSubmitting}
        destroyOnHidden
      >
        <Form form={transferForm} layout="vertical" preserve={false}>
          <Form.Item
            name="new_assignee"
            label="新负责人（健管师）"
            rules={[{ required: true, message: '请选择新负责人' }]}
          >
            <Select
              options={staffOptions}
              placeholder="请选择在职人员"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="reason" label="转派原因（选填）">
            <Input.TextArea rows={2} maxLength={200} placeholder="将记录在线索转派留痕中" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 流失弹窗（指南 §4.8：权威口径 status=9） */}
      <Modal
        title="标记流失"
        open={lostOpen}
        onOk={handleLost}
        onCancel={() => setLostOpen(false)}
        okText="确认流失"
        cancelText="取消"
        confirmLoading={lostSubmitting}
        destroyOnHidden
      >
        <Form form={lostForm} layout="vertical" preserve={false}>
          <Form.Item name="reason" label="流失原因（选填）">
            <Input.TextArea rows={2} maxLength={200} placeholder="如：号码为空号、明确无服务需求" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
