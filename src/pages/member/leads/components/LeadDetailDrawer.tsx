/**
 * 线索详情 Drawer（线索管理列表共用）
 * 视觉对齐设计稿：线索信息 + 选择服务机构 + 客服核对记录 + 分配说明
 * 数据来源：leadApi.getLead / assignLead / addLeadFollowup / transferLead / loseLead / convertLead
 * 机构选项：institutionApi.getInstitutions；转派人选项：staffApi.getStaffs（在职）
 * 转化会员选项：memberApi.getMembers（前 100 条）
 */
import { useCallback, useEffect, useState } from 'react'
import { App, Button, Descriptions, Drawer, Empty, Form, Input, Modal, Radio, Select, Space, Spin, Timeline } from 'antd'
import { institutionApi, leadApi, memberApi, staffApi } from '@/api'
import type { InstitutionItem } from '@/api/modules/institution'
import type { LeadDTO } from '@/api/modules/lead'
import type { MemberDTO } from '@/api/modules/member'
import type { StaffDTO } from '@/api/modules/staff'
import { useUserStore } from '@/store'
import { formatDateTime } from '@/utils'
import { LEAD_SOURCE_TEXT, LEAD_STATUS_TEXT, LEAD_PRIORITY_TEXT } from '../constants'

export interface LeadDetailDrawerProps {
  /** 当前查看的线索 id（null 时关闭） */
  leadId: number | null
  open: boolean
  onClose: () => void
  /** 线索发生变化后的回调（父级刷新列表与统计） */
  onChanged: () => void
}

/** 跟进方式（followup_type 为字符串，按常见方式提供枚举） */
const FOLLOWUP_TYPE_OPTIONS = ['电话联系', '微信沟通', '到店接待', '其他'].map((value) => ({
  label: value,
  value,
}))

/** 线索来源文案（从列表页导入，未命中回显原始值） */
const sourceText = (value?: number) =>
  value == null ? '—' : (LEAD_SOURCE_TEXT[value] ?? value)

export default function LeadDetailDrawer({ leadId, open, onClose, onChanged }: LeadDetailDrawerProps) {
  const { message } = App.useApp()
  /** 当前登录运营（跟进记录 operator） */
  const operatorName = useUserStore((state) => state.userInfo?.nickname) || '运营'

  const [detail, setDetail] = useState<LeadDTO | null>(null)
  const [loading, setLoading] = useState(false)
  /** 服务机构选项与当前选择 */
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([])
  const [assignInstitutionId, setAssignInstitutionId] = useState<number | null>(null)
  const [assigning, setAssigning] = useState(false)
  /** 添加跟进表单 */
  const [followupForm] = Form.useForm<{ followup_type: string; content: string }>()
  const [followupSubmitting, setFollowupSubmitting] = useState(false)
  /** 转派弹窗 */
  const [transferOpen, setTransferOpen] = useState(false)
  const [staffList, setStaffList] = useState<StaffDTO[]>([])
  const [transferForm] = Form.useForm<{ staff_id: number; reason: string }>()
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  /** 流失 / 忽略弹窗 */
  const [lostOpen, setLostOpen] = useState(false)
  const [lostForm] = Form.useForm<{ status: 6 | 9; reason: string }>()
  const [lostSubmitting, setLostSubmitting] = useState(false)
  /** 转化为会员弹窗 */
  const [convertOpen, setConvertOpen] = useState(false)
  const [memberList, setMemberList] = useState<MemberDTO[]>([])
  const [convertForm] = Form.useForm<{ member_id: number }>()
  const [convertSubmitting, setConvertSubmitting] = useState(false)

  /** 拉取线索详情（含跟进记录、转化信息） */
  const fetchDetail = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const data = await leadApi.getLead(leadId)
      setDetail(data)
      setAssignInstitutionId(data.institution_id ?? null)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  /** 打开抽屉：重置并拉取详情 + 机构选项 */
  useEffect(() => {
    if (!open || leadId == null) return
    setDetail(null)
    followupForm.resetFields()
    void fetchDetail()
    void (async () => {
      try {
        const res = await institutionApi.getInstitutions({ page: 1, page_size: 100 })
        setInstitutions(res.list ?? [])
      } catch {
        setInstitutions([])
      }
    })()
  }, [open, leadId, fetchDetail, followupForm])

  /** 确认指定服务机构（PUT /admin/leads/:id/assign） */
  const handleAssign = async () => {
    if (!detail || assignInstitutionId == null) {
      message.warning('请先选择服务机构')
      return
    }
    setAssigning(true)
    try {
      await leadApi.assignLead(detail.id, { institution_id: assignInstitutionId })
      message.success('服务机构已指定')
      await fetchDetail()
      onChanged()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setAssigning(false)
    }
  }

  /** 添加跟进记录（POST /admin/leads/:id/followup） */
  const handleAddFollowup = async () => {
    if (!detail) return
    let values: { followup_type: string; content: string }
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
        operator: operatorName,
      })
      message.success('跟进记录已添加')
      followupForm.resetFields()
      await fetchDetail()
      onChanged()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setFollowupSubmitting(false)
    }
  }

  /** 打开转派弹窗并拉取在职人员 */
  const openTransfer = async () => {
    setTransferOpen(true)
    try {
      const res = await staffApi.getStaffs({ page: 1, page_size: 100, status: 1 })
      setStaffList(res.list ?? [])
    } catch {
      setStaffList([])
    }
  }

  /** 确认转派（POST /admin/leads/:id/transfer，留痕） */
  const handleTransfer = async () => {
    if (!detail) return
    let values: { staff_id: number; reason: string }
    try {
      values = await transferForm.validateFields()
    } catch {
      return
    }
    setTransferSubmitting(true)
    try {
      await leadApi.transferLead(detail.id, values.staff_id, values.reason ?? '')
      message.success('线索已转派')
      setTransferOpen(false)
      transferForm.resetFields()
      await fetchDetail()
      onChanged()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setTransferSubmitting(false)
    }
  }

  /** 确认流失 / 忽略（POST /admin/leads/:id/lost） */
  const handleLost = async () => {
    if (!detail) return
    let values: { status: 6 | 9; reason: string }
    try {
      values = await lostForm.validateFields()
    } catch {
      return
    }
    setLostSubmitting(true)
    try {
      await leadApi.loseLead(detail.id, values.status, values.reason ?? '')
      message.success(values.status === 6 ? '线索已标记流失' : '线索已忽略')
      setLostOpen(false)
      lostForm.resetFields()
      await fetchDetail()
      onChanged()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setLostSubmitting(false)
    }
  }

  /** 打开转化弹窗并拉取会员选项 */
  const openConvert = async () => {
    setConvertOpen(true)
    try {
      const res = await memberApi.getMembers({ page: 1, page_size: 100 })
      setMemberList(res.list ?? [])
    } catch {
      setMemberList([])
    }
  }

  /** 确认转化为会员（POST /admin/leads/:id/convert） */
  const handleConvert = async () => {
    if (!detail) return
    let values: { member_id: number }
    try {
      values = await convertForm.validateFields()
    } catch {
      return
    }
    setConvertSubmitting(true)
    try {
      await leadApi.convertLead(detail.id, values.member_id)
      message.success('线索已转化为会员')
      setConvertOpen(false)
      convertForm.resetFields()
      await fetchDetail()
      onChanged()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setConvertSubmitting(false)
    }
  }

  const followups = detail?.followups ?? []
  const transfers = detail?.transfer_records ?? []

  return (
    <>
      <Drawer
        title={
          <div>
            <strong>线索详情 / 指定服务机构</strong>
            <p className="lead-drawer__subtitle">
              线索 {detail?.lead_no ?? ''}
              {detail ? ` · ${LEAD_STATUS_TEXT[detail.status] ?? detail.status}` : ''}
            </p>
          </div>
        }
        open={open}
        onClose={onClose}
        width={560}
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" loading={assigning} onClick={handleAssign}>
              确认指定
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <div className="lead-drawer">
            <section className="lead-drawer__section">
              <h4>线索信息</h4>
              <Descriptions
                column={2}
                size="small"
                colon={false}
                items={[
                  { key: 'contact_name', label: '联系人', children: detail?.contact_name || '—' },
                  { key: 'contact_phone', label: '联系电话', children: detail?.contact_phone || '—' },
                  {
                    key: 'demand',
                    label: '意向服务',
                    children: detail?.demand_detail || '—',
                    span: 2,
                  },
                  { key: 'source', label: '线索来源', children: sourceText(detail?.source_type) },
                  {
                    key: 'created_at',
                    label: '创建时间',
                    children: detail?.created_at
                      ? formatDateTime(detail.created_at * 1000, 'YYYY-MM-DD HH:mm')
                      : '—',
                  },
                  {
                    key: 'owner',
                    label: '负责人',
                    children: detail?.owner_staff_name || '待指定',
                  },
                  {
                    key: 'assign_at',
                    label: '分配时间',
                    children: detail?.assign_at
                      ? formatDateTime(detail.assign_at * 1000, 'YYYY-MM-DD HH:mm')
                      : '—',
                  },
                  {
                    key: 'status',
                    label: '线索状态',
                    children: detail ? (LEAD_STATUS_TEXT[detail.status] ?? detail.status) : '—',
                  },
                  {
                    key: 'priority',
                    label: '优先级',
                    children: detail ? (LEAD_PRIORITY_TEXT[detail.priority] ?? detail.priority) : '—',
                  },
                  {
                    key: 'converted',
                    label: '转化会员',
                    span: 2,
                    children: detail?.converted_member_id
                      ? `会员ID ${detail.converted_member_id}`
                      : '—',
                  },
                ]}
              />
            </section>

            <section className="lead-drawer__section">
              <h4>选择服务机构</h4>
              <Select
                className="lead-drawer__institution"
                value={assignInstitutionId}
                onChange={(value) => setAssignInstitutionId(value ?? null)}
                options={institutions.map((item) => ({ label: item.name, value: item.id }))}
                placeholder="选择服务机构（按服务地址确定机构，不按注册账号或家属所在城市分配）"
                allowClear
                showSearch
                optionFilterProp="label"
              />
              <p className="lead-drawer__tip">
                按联系人的服务地址确定机构，不按注册账号或家属所在城市分配。
              </p>
            </section>

            <section className="lead-drawer__section">
              <h4>客服核对记录</h4>
              {followups.length > 0 ? (
                <Timeline
                  className="lead-drawer__timeline"
                  items={followups.map((item, index) => ({
                    key: index,
                    children: (
                      <div className="followup-item">
                        <div className="followup-item__meta">
                          <strong>{item.operator || '—'}</strong>
                          <span>
                            {item.followup_type || '跟进'} ·{' '}
                            {item.time
                              ? formatDateTime(item.time * 1000, 'YYYY-MM-DD HH:mm')
                              : '—'}
                          </span>
                        </div>
                        <p>{item.content || '—'}</p>
                        {item.result ? <em>结果：{item.result}</em> : null}
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无跟进记录" />
              )}
              <Form form={followupForm} layout="vertical" className="lead-drawer__followup-form">
                <Form.Item
                  name="followup_type"
                  label="跟进方式"
                  rules={[{ required: true, message: '请选择跟进方式' }]}
                >
                  <Select options={FOLLOWUP_TYPE_OPTIONS} placeholder="请选择跟进方式" />
                </Form.Item>
                <Form.Item
                  name="content"
                  label="跟进内容"
                  rules={[{ required: true, message: '请输入跟进内容' }]}
                >
                  <Input.TextArea
                    rows={2}
                    maxLength={200}
                    showCount
                    placeholder="记录本次联系情况，如：已确认本人在北京接受服务，服务地址位于机构承接范围"
                  />
                </Form.Item>
                <Button
                  size="small"
                  loading={followupSubmitting}
                  onClick={handleAddFollowup}
                >
                  添加跟进记录
                </Button>
              </Form>
            </section>

            {transfers.length > 0 && (
              <section className="lead-drawer__section">
                <h4>转派记录</h4>
                <Timeline
                  className="lead-drawer__timeline"
                  items={transfers.map((item, index) => ({
                    key: index,
                    children: (
                      <div className="followup-item">
                        <div className="followup-item__meta">
                          <strong>
                            {item.from_staff_name || '—'} → {item.to_staff_name || '—'}
                          </strong>
                          <span>
                            操作人：{item.operator_name || '—'} ·{' '}
                            {item.time
                              ? formatDateTime(item.time * 1000, 'YYYY-MM-DD HH:mm')
                              : '—'}
                          </span>
                        </div>
                        {item.reason ? <p>{item.reason}</p> : null}
                      </div>
                    ),
                  }))}
                />
              </section>
            )}

            <section className="lead-drawer__section lead-drawer__actions">
              <h4>线索操作</h4>
              <Space wrap>
                <Button onClick={openTransfer}>转派</Button>
                <Button onClick={() => setLostOpen(true)}>标记流失 / 忽略</Button>
                <Button type="primary" variant="outlined" onClick={openConvert}>
                  转化为会员
                </Button>
              </Space>
              <p className="lead-drawer__tip">
                确认机构后转至机构工作台，由机构负责人指定具体健管师，运营不直接选人。
              </p>
            </section>
          </div>
        </Spin>
      </Drawer>

      {/* 转派弹窗 */}
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
            name="staff_id"
            label="新负责人（健管师）"
            rules={[{ required: true, message: '请选择新负责人' }]}
          >
            <Select
              options={staffList.map((item) => ({
                label: `${item.name}（${item.title || '未设岗位'}）`,
                value: item.id,
              }))}
              placeholder="请选择在职人员"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="reason" label="转派原因">
            <Input.TextArea rows={2} maxLength={200} placeholder="选填，将记录在线索留痕中" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 流失 / 忽略弹窗 */}
      <Modal
        title="标记流失 / 忽略"
        open={lostOpen}
        onOk={handleLost}
        onCancel={() => setLostOpen(false)}
        okText="确认"
        cancelText="取消"
        confirmLoading={lostSubmitting}
        destroyOnHidden
      >
        <Form
          form={lostForm}
          layout="vertical"
          preserve={false}
          initialValues={{ status: 6 as 6 | 9 }}
        >
          <Form.Item name="status" label="标记类型" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '已流失', value: 6 },
                { label: '已忽略', value: 9 },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>
          <Form.Item name="reason" label="原因" rules={[{ required: true, message: '请输入原因' }]}>
            <Input.TextArea rows={2} maxLength={200} placeholder="如：多次联系未接通，明确无服务需求" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 转化为会员弹窗 */}
      <Modal
        title="线索转化为会员"
        open={convertOpen}
        onOk={handleConvert}
        onCancel={() => setConvertOpen(false)}
        okText="确认转化"
        cancelText="取消"
        confirmLoading={convertSubmitting}
        destroyOnHidden
      >
        <Form form={convertForm} layout="vertical" preserve={false}>
          <Form.Item
            name="member_id"
            label="关联注册会员"
            rules={[{ required: true, message: '请选择会员' }]}
          >
            <Select
              options={memberList.map((item) => ({
                label: `${item.name}（${item.phone || '无手机号'}）`,
                value: item.id,
              }))}
              placeholder="选择该线索转化成的注册会员"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
