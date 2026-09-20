/**
 * 退款审批弹窗（退款列表 / 退款详情共用）
 * 触发条件：退款单 status === 8（待财务审批）
 * 数据来源：refundApi.approveRefunds（POST /admin/refunds/:id/approve）
 * 金额单位：页面输入「元」，提交按后端契约换算为「分」
 */
import { useEffect, useState } from 'react'
import { App, Form, Input, InputNumber, Modal, Radio, Select } from 'antd'
import { refundApi } from '@/api'
import type { RefundItem } from '@/api/modules/refund'

export interface RefundApproveModalProps {
  /** 待审批的退款单（null 时弹窗不展示） */
  refund: RefundItem | null
  open: boolean
  onClose: () => void
  /** 审批成功回调（父级刷新列表 / 详情） */
  onSuccess: () => void
}

interface ApproveFormValues {
  approve: boolean
  /** 实际退款金额（元） */
  refund_amount?: number
  refund_channel?: string
  opinion?: string
}

/** 退款渠道选项（后端契约为字符串，按常见渠道提供枚举） */
const refundChannelOptions = ['原路退回', '微信', '支付宝', '银行卡', '线下转账'].map((value) => ({
  label: value,
  value,
}))

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

export default function RefundApproveModal({ refund, open, onClose, onSuccess }: RefundApproveModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<ApproveFormValues>()
  const [submitting, setSubmitting] = useState(false)
  /** 审批结果：true-通过 false-拒绝（控制金额 / 渠道与意见文案的显隐） */
  const approve = Form.useWatch('approve', form) ?? true

  /** 打开弹窗时按退款单重置表单：默认通过、金额默认申请全额 */
  useEffect(() => {
    if (!open || !refund) return
    form.setFieldsValue({
      approve: true,
      refund_amount: fenToYuan(refund.amount),
      refund_channel: undefined,
      opinion: undefined,
    })
  }, [open, refund, form])

  const handleSubmit = async () => {
    let values: ApproveFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (!refund) return
    setSubmitting(true)
    try {
      await refundApi.approveRefunds(refund.refund_id, {
        approve: values.approve,
        // 拒绝时金额 / 渠道不传（后端按拒绝处理）
        refund_amount: values.approve ? Math.round((values.refund_amount ?? 0) * 100) : 0,
        refund_channel: values.approve ? (values.refund_channel ?? '') : '',
        opinion: values.opinion ?? '',
      })
      message.success(values.approve ? '退款审批已通过' : '退款审批已拒绝')
      onSuccess()
      onClose()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={`退款审批 · ${refund?.refund_no ?? ''}`}
      open={open && !!refund}
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={submitting}
      destroyOnHidden
      width={480}
    >
      <Form<ApproveFormValues> form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="approve"
          label="审批结果"
          rules={[{ required: true, message: '请选择审批结果' }]}
        >
          <Radio.Group
            options={[
              { label: '通过', value: true },
              { label: '拒绝', value: false },
            ]}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
        {approve ? (
          <>
            <Form.Item
              name="refund_amount"
              label="实际退款金额（元）"
              rules={[{ required: true, message: '请输入实际退款金额' }]}
              extra={`申请退款金额 ${fenToYuan(refund?.amount).toFixed(2)} 元`}
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="默认申请全额，可按实调整"
              />
            </Form.Item>
            <Form.Item
              name="refund_channel"
              label="退款渠道"
              rules={[{ required: true, message: '请选择退款渠道' }]}
            >
              <Select options={refundChannelOptions} placeholder="请选择退款渠道" allowClear />
            </Form.Item>
          </>
        ) : null}
        <Form.Item
          style={{marginBottom: 28}}
          name="opinion"
          label={approve ? '审批意见（可选）' : '审批意见'}
          rules={[
            {
              validator: (_, value: string | undefined) => {
                if (!approve && !value?.trim()) {
                  return Promise.reject(new Error('拒绝时请输入审批意见'))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <Input.TextArea
            rows={3}
            maxLength={200}
            showCount
            placeholder={approve ? '选填' : '请说明拒绝原因，便于运营跟进'}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
