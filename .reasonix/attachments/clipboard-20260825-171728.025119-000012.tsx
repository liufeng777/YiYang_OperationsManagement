/**
 * 新增用户 Drawer（账号 / 角色 / 头像 / 表单校验）
 * - 受控组件：open / onClose 由父组件 AccountList 管理
 * - 提交通过 onCreated 回调将新建的 AccountItem 上抛给父组件
 * - 头像当前为本地预览，后端就绪后接入 uploadApi.uploadFile
 */
import { useEffect, useState } from 'react'
import { App, Button, Drawer, Form, Input, Select, Switch, Upload } from 'antd'
import type { UploadFile } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { AccountItem } from '@/api/modules/system'
import './account.less'

/** 角色字典：id → 名称/编码/权限摘要（1-超管 2-运营人员 3-财务人员 4-订单客服） */
const roleDict: Record<
  number,
  { role_name: string; role_code: string; summary: string }
> = {
  1: {
    role_name: '平台管理员',
    role_code: 'super',
    summary: '拥有全部平台功能权限，包含用户、角色与系统设置。',
  },
  2: {
    role_name: '运营人员',
    role_code: 'operator',
    summary: '机构管理、服务项目、活动与内容；不包含退款审核、财务对账和系统设置。',
  },
  3: {
    role_name: '财务人员',
    role_code: 'finance',
    summary: '订单查看、退款审核与财务对账；不包含机构与内容维护。',
  },
  4: {
    role_name: '订单客服',
    role_code: 'orderCustomerService',
    summary: '订单查询与退款处理；不包含财务对账和系统设置。',
  },
}

interface AccountFormValues {
  avatar_url?: string
  nickname: string
  phone: string
  username: string
  password: string
  email?: string
  role_ids: number[]
  status: number // 1 启用 / 9 停用
}

interface AddAccountProps {
  open: boolean
  onClose: () => void
  onCreated: (account: AccountItem) => void
}

export default function AddAccount({ open, onClose, onCreated }: AddAccountProps) {
  const { message } = App.useApp()
  const [avatarUrl, setAvatarUrl] = useState<string>()
  const [avatarList, setAvatarList] = useState<UploadFile[]>([])
  const [form] = Form.useForm<AccountFormValues>()
  const formRoleIds = Form.useWatch('role_ids', form) ?? []

  /** 每次打开 Drawer 时重置表单与头像 */
  useEffect(() => {
    if (open) {
      setAvatarUrl(undefined)
      setAvatarList([])
      form.resetFields()
    }
  }, [open, form])

  /** 头像上传：本地预览，后端就绪后接入 uploadApi.uploadFile */
  const handleAvatarChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('仅支持上传图片')
      return Upload.LIST_IGNORE
    }
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setAvatarUrl(url)
      setAvatarList([{ uid: '-1', name: file.name, status: 'done', url }])
      form.setFieldValue('avatar_url', url)
    }
    reader.readAsDataURL(file)
    return false
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl(undefined)
    setAvatarList([])
    form.setFieldValue('avatar_url', undefined)
  }

  const onStatusChecked = (checked: boolean) => (checked ? 1 : 9)

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const now = Math.floor(Date.now() / 1000)
      const account: AccountItem = {
        id: Date.now(),
        username: values.username.trim(),
        nickname: values.nickname.trim(),
        password: values.password,
        phone: values.phone.trim(),
        email: values.email?.trim() || null,
        status: values.status, // 1 启用 / 9 停用
        roles: values.role_ids.map((rid) => ({
          id: rid,
          role_name: roleDict[rid].role_name,
          role_code: roleDict[rid].role_code,
        })),
        created_at: now,
        last_login_at: now,
        last_login_ip: '--',
      }
      message.success(`用户 ${account.nickname} 已创建（mock）`)
      onCreated(account)
      setAvatarUrl(undefined)
      setAvatarList([])
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
      title="新增用户"
      onClose={onClose}
      footer={
        <div className="account-drawer__footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleCreate}>
            创建用户
          </Button>
        </div>
      }
    >
      <div className="account-drawer">
        <div className="account-drawer__tip">
          <strong>权限由所属角色统一决定</strong>
          <p>可为一个用户分配多个角色，权限为各角色权限的并集。</p>
        </div>
        <Form
          form={form}
          labelCol={{ span: 5}}
          wrapperCol={{ span: 19 }}
          initialValues={{ status: 1, role_ids: [2] }}
        >
          <Form.Item
            name="username"
            label="登录账号"
            rules={[{ required: true, message: '请输入登录账号' }]}
          >
            <Input placeholder="请输入登录账号" />
          </Form.Item>
          <Form.Item
            name="password"
            label="登录密码"
            rules={[
              { required: true, message: '请输入登录密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="请输入登录密码（用于首次登录）" />
          </Form.Item>
          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            name="role_ids"
            label="所属角色"
            rules={[
              { required: true, message: '请选择所属角色' },
              { type: 'array', min: 1, message: '请至少选择一个角色' },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="请选择所属角色（可多选）"
              options={Object.keys(roleDict).map((key) => {
                const id = Number(key)
                return { label: roleDict[id].role_name, value: id }
              })}
            />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱（选填）" />
          </Form.Item>
          <Form.Item
            name="status"
            label="启用"
            extra="启用后允许用户登录运营平台"
            valuePropName="checked"
            getValueFromEvent={onStatusChecked}
            getValueProps={(value: number) => ({ checked: value === 1 })}
          >
            <Switch />
          </Form.Item>
          <Form.Item label="头像">
            <Upload
              listType="picture-card"
              maxCount={1}
              accept="image/*"
              fileList={avatarList}
              beforeUpload={handleAvatarChange}
              onRemove={handleRemoveAvatar}
            >
              {avatarUrl
                ? null
                : (
                <div>
                  <PlusOutlined />
                  <div className="account-drawer__avatar-tip">上传头像</div>
                </div>
                )}
            </Upload>
            {/* avatar_url 为独立隐藏字段，仅由头像 handler 写入，避免被 Upload 的 onChange(fileList) 污染 */}
            <Form.Item name="avatar_url" hidden noStyle>
              <input />
            </Form.Item>
          </Form.Item>
        </Form>
        <div className="account-drawer__summary">
          <strong>所选角色 · 权限摘要</strong>
          {formRoleIds.length > 0 ? (
            formRoleIds.map((rid) => (
              <p key={rid}>
                <b>{roleDict[rid].role_name}</b>：{roleDict[rid].summary}
              </p>
            ))
          ) : (
            <p className="account-drawer__summary-empty">请选择角色以查看权限摘要</p>
          )}
        </div>
      </div>
    </Drawer>
  )
}
