/**
 * 角色编辑 Drawer（新增 / 编辑共用）
 * - 受控组件：open / onClose 由父组件 RoleManage 管理
 * - 新增：role_name 必填、role_code 必填且唯一、description 选填
 * - 编辑：role_code 只读不可改；提交通过 onSaved 回调上抛
 */
import { useEffect } from 'react'
import { App, Button, Drawer, Form, Input } from 'antd'
import type { RoleRow } from './role'

interface RoleEditorProps {
  open: boolean
  /** 编辑态：传入待编辑角色；为空为新增 */
  initial?: RoleRow | null
  /** 用于 role_code 唯一性校验的其它角色编码（剔除自身） */
  otherCodes: string[]
  onClose: () => void
  onSaved: (role: RoleRow) => void
}

interface RoleFormValues {
  role_name: string
  role_code: string
  description?: string
}

export default function RoleEditor({ open, initial = null, otherCodes, onClose, onSaved }: RoleEditorProps) {
  const { message } = App.useApp()
  const isEdit = !!initial
  const [form] = Form.useForm<RoleFormValues>()

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      form.setFieldsValue({
        role_name: initial.role_name,
        role_code: initial.role_code,
        description: initial.description || undefined,
      })
    } else {
      form.resetFields()
    }
  }, [open, isEdit, initial, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const role: RoleRow = isEdit && initial
        ? {
            ...initial,
            role_name: values.role_name.trim(),
            description: values.description?.trim() || '',
          }
        : {
            id: Date.now(),
            role_name: values.role_name.trim(),
            role_code: values.role_code.trim(),
            built_in: false,
            description: values.description?.trim() || '',
            status: 1,
            userCount: 0,
            permissions: [],
          }
      message.success(
        isEdit ? `角色「${role.role_name}」已更新（mock）` : `角色「${role.role_name}」已创建（mock）`,
      )
      onSaved(role)
      form.resetFields()
      onClose()
    } catch {
      // 校验失败由 Form.Item 就地提示
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
          <Button type="primary" onClick={handleSubmit}>
            {isEdit ? '保存' : '创建角色'}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
      >
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
