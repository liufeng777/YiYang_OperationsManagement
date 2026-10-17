/**
 * 记录沟通跟进 Drawer（设计稿：四项信息）
 * - 沟通对象：当前注册会员（只读展示）
 * - 沟通要点：必填
 * - 推荐服务：选填多选，候选来自 GET /admin/services（status=1 上架中）
 * - 下次联系时间：选填
 * - 保存：addMemberFollowup —— swagger 未提供注册会员跟进接口，捕获 ApiPendingError 后提示「接口未对接」
 */
import { useEffect, useState } from 'react'
import { App, Button, Checkbox, DatePicker, Drawer, Form, Input } from 'antd'
import dayjs from 'dayjs'
import { serviceApi } from '@/api'
import { addMemberFollowup, isApiPendingError } from '@/api/modules/memberOperation'
import type { RegisteredMemberRow } from '@/api/modules/memberOperation'
import './FollowupDrawer.less'

interface FollowupDrawerProps {
  open: boolean
  member: RegisteredMemberRow | null
  onClose: () => void
  /** 保存成功后的回调（接口就绪后触发） */
  onSuccess?: () => void
}

interface FollowupFormValues {
  content: string
  serviceIds?: number[]
  nextContactAt?: dayjs.Dayjs
}

export default function FollowupDrawer(props: FollowupDrawerProps) {
  const { open, member, onClose, onSuccess } = props
  const { message } = App.useApp()
  const [form] = Form.useForm<FollowupFormValues>()
  const [serviceOptions, setServiceOptions] = useState<{ value: number; label: string }[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /** 推荐服务候选：上架中的服务（设计稿：直接勾选当前机构已有服务） */
  useEffect(() => {
    if (!open) return
    setLoadingServices(true)
    serviceApi
      .getServices({ page: 1, page_size: 100, status: 1 })
      .then((res) => {
        setServiceOptions((res.list ?? []).map((item) => ({ value: item.id, label: item.name })))
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
      })
      .finally(() => setLoadingServices(false))
  }, [open])

  const handleSubmit = async () => {
    if (!member) return
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      await addMemberFollowup(member.id, {
        content: values.content.trim(),
        service_ids: values.serviceIds,
        next_contact_at: values.nextContactAt
          ? values.nextContactAt.unix()
          : undefined,
      })
      message.success('跟进已保存')
      form.resetFields()
      onClose()
      onSuccess?.()
    } catch (error) {
      if (isApiPendingError(error)) {
        message.warning(`${error.message}，本次跟进未提交`)
      }
      /* 其余错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      title="记录沟通跟进"
      width={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="followup-drawer__footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
            保存跟进
          </Button>
        </div>
      }
    >
      <p className="followup-drawer__subtitle">记下需求、购买顾虑与推荐内容，方便下次继续沟通。</p>
      <p className="followup-drawer__member">
        {member ? `${member.name} · 会员编号 M-${String(member.id).padStart(6, '0')}` : '—'}
        {member?.operator_name ? ` · 当前运营人员：${member.operator_name}` : ''}
      </p>
      <p className="followup-drawer__hint">
        沟通记录保存在注册会员下；普通服务咨询不创建健康管理接入线索。
      </p>

      <Form form={form} layout="vertical">
        <Form.Item label="沟通对象" required>
          <Input
            disabled
            value={member ? `${member.name}（注册会员） · ${member.phone || '—'}` : ''}
          />
        </Form.Item>
        <Form.Item
          name="content"
          label="沟通要点"
          rules={[{ required: true, whitespace: true, message: '请填写沟通要点' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="如：父亲需要清洁护理；关心耗材费用，已推荐含耗材服务。"
            maxLength={500}
            showCount
          />
        </Form.Item>
        <Form.Item name="serviceIds" label="推荐服务（选填，支持多选）">
          <Checkbox.Group
            className="followup-drawer__services"
            options={serviceOptions}
            disabled={loadingServices}
          />
        </Form.Item>
        <Form.Item name="nextContactAt" label="下次联系时间（选填）">
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            placeholder="请选择下次联系时间"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>

      <p className="followup-drawer__note">联系时间和跟进人员由系统自动记录。</p>
      <p className="followup-drawer__note">
        填写提示：推荐服务直接勾选当前机构已有服务，可多选或不选；与本次沟通一起保存，不单独弹窗。明确需要健康管理时，回会员详情选择本人/家属创建健康会员线索。
      </p>
    </Drawer>
  )
}
