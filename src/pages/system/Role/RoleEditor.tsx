/**
 * 角色编辑 Drawer（新增 / 编辑共用）
 * - 数据来源：systemApi.createRole / updateRole（字段按后端实测：role_name / role_code / description 必填项）
 * - 受控组件：open / onClose 由父组件 RoleManage 管理，保存成功后通过 onSaved 回调通知父组件刷新
 * - 编辑：role_code 只读不可改（后端以 code 作为鉴权标识）
 */
import { useEffect, useState } from 'react'
import { App, Button, Drawer, Form, Input } from 'antd'
import { systemApi } from '@/api'
import type { RoleItem } from '@/api/modules/system'

interface RoleEditorProps {
  open: boolean
  /** 编辑态：传入待编辑角色；为空为新增 */
  initial?: RoleItem | null
  /** 用于 role_code 唯一性校验的其它角色编码（剔除自身） */
  otherCodes: string[]
  onClose: () => void
  /** 保存成功后回调（父组件据此刷新列表） */
  onSaved: () => void
}

interface RoleFormValues {
  role_name: string
  role_code: string
  description?: string
}

export default function RoleEditor({
  open,
  initial = null,
  otherCodes,
  onClose,
  onSaved,
}: RoleEditorProps) {
  const { message } = App.useApp()
  const isEdit = !!initial
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<RoleFormValues>()

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      form.setFieldsValue({
        role_name: initial.name,
        role_code: initial.code,
        description: initial.description || undefined,
      })
    } else {
      form.resetFields()
    }
  }, [open, isEdit, initial, form])

  const handleSubmit = async () => {
    let values: RoleFormValues
    try {
      values = await form.validateFields()
    } catch {
      return // 校验失败由 Form.Item 就地提示
    }
    setSubmitting(true)
    try {
      const roleName = values.role_name.trim()
      if (isEdit && initial) {
        await systemApi.updateRole(initial.id, {
          role_name: roleName,
          description: values.description?.trim() || undefined,
        })
        message.success(`角色「${roleName}」已更新`)
      } else {
        await systemApi.createRole({
          role_name: roleName,
          role_code: values.role_code.trim(),
          description: values.description?.trim() || undefined,
        })
        message.success(`角色「${roleName}」已创建`)
      }
      onSaved()
      form.resetFields()
      onClose()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      width={480}
      title={isEdit ? '编辑角色' : '新增角色'}
      onClose={onClose}
      footer={
        <div className="role-editor__footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            {isEdit ? '保存' : '创建角色'}
          </Button>
        </div>
      }
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
        <Form.Item
          name="role_name"
          label="角色名称"
          rules={[{ required: true, message: '请输入角色名称' }]}
        >
          <Input placeholder="请输入角色名称" />
        </Form.Item>
        <Form.Item
          name="role_code"
          label="角色编码"
          extra="唯一标识，用于接口鉴权，创建后不可修改"
          rules={[
            { required: true, message: '请输入角色编码' },
            {
              validator: (_, value) =>
                value && otherCodes.includes(value)
                  ? Promise.reject(new Error('角色编码已存在'))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input placeholder="如 finance" disabled={isEdit} />
        </Form.Item>
        <Form.Item name="description" label="角色描述">
          <Input.TextArea placeholder="请输入角色描述（选填）" rows={3} maxLength={200} showCount />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
