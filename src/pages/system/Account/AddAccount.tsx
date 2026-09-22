/**
 * 新增 / 编辑用户 Drawer（账号 / 角色 / 头像 / 表单校验）
 * - 数据来源：systemApi.createAdmin / updateAdmin / assignAdminRoles，角色下拉取自 systemApi.getRoles
 * - 受控组件：open / onClose 由父组件 AccountList 管理，保存成功后通过 onSaved 回调通知父组件刷新
 * - 密码规则：仅**新增**时必填；编辑不提交密码（改密请在用户列表使用「重置密码」）
 * - 头像通过共通上传接口（uploadApi.uploadFile）上传，成功后的服务器地址写入 avatar_url
 */
import { useEffect, useMemo, useState } from 'react'
import { App, Button, Drawer, Form, Input, Select, Switch, Upload } from 'antd'
import type { UploadFile } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useImageUpload } from '@/hooks'
import { systemApi } from '@/api'
import type { AdminItem } from '@/api/modules/system'
import type { CommonStatus } from '@/types/api'
import './account.less'

/** 账号状态：1 启用 / 9 停用（后端 CommonStatus） */
const STATUS_ENABLED: CommonStatus = 1
const STATUS_DISABLED: CommonStatus = 9

interface AccountFormValues {
  avatar_url?: string
  nickname: string
  phone: string
  username: string
  /** 仅新增时使用 */
  password?: string
  email?: string
  role_ids: number[]
  status: CommonStatus
}

interface AddAccountProps {
  open: boolean
  /** 编辑态：传入待编辑账号；为空为新增 */
  initial?: AdminItem | null
  onClose: () => void
  /** 保存成功后回调（父组件据此刷新列表） */
  onSaved: () => void
}

export default function AddAccount({ open, initial = null, onClose, onSaved }: AddAccountProps) {
  const { message } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const isEdit = !!initial
  const [avatarUrl, setAvatarUrl] = useState<string>()
  const [avatarList, setAvatarList] = useState<UploadFile[]>([])
  const [roleOptions, setRoleOptions] = useState<Array<{ label: string; value: number }>>([])
  const [roleSummary, setRoleSummary] = useState<Map<number, string>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<AccountFormValues>()
  const formRoleIds = Form.useWatch('role_ids', form) ?? []

  /** 角色下拉：来自角色管理接口（?all=1 返回全部） */
  useEffect(() => {
    if (!open) return
    let cancelled = false
    systemApi
      .getRoles({ all: 1, page: 1, page_size: 1000 })
      .then((res) => {
        if (cancelled) return
        const list = res.list ?? []
        setRoleOptions(list.map((role) => ({ label: role.name, value: role.id })))
        setRoleSummary(new Map(list.map((role) => [role.id, role.description || '—'])))
      })
      .catch(() => {
        if (!cancelled) {
          setRoleOptions([])
          setRoleSummary(new Map())
        }
      })
    return () => {
      cancelled = true
    }
  }, [open])

  /** 每次打开 Drawer 时：编辑回填 / 新增重置，并清空头像 */
  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      form.setFieldsValue({
        username: initial.username,
        nickname: initial.nickname,
        phone: initial.phone ?? undefined,
        email: initial.email ?? undefined,
        status: initial.status === STATUS_ENABLED ? STATUS_ENABLED : STATUS_DISABLED,
        role_ids: initial.role_ids ?? [],
        password: undefined,
        avatar_url: undefined,
      })
      setAvatarUrl(initial.avatar_url || undefined)
      setAvatarList(
        initial.avatar_url
          ? [{ uid: '-1', name: 'avatar', status: 'done', url: initial.avatar_url }]
          : [],
      )
    } else {
      form.resetFields()
      setAvatarUrl(undefined)
      setAvatarList([])
    }
  }, [open, isEdit, initial, form])

  /** 头像上传：本地预览 + 后台上传，成功后把服务器地址写入 avatar_url */
  const handleAvatarChange = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => {
        setAvatarUrl(localUrl)
        setAvatarList([{ uid: '-1', name: file.name, status: 'uploading', url: localUrl }])
      },
      onUploaded: (url) => {
        setAvatarUrl(url)
        setAvatarList([{ uid: '-1', name: file.name, status: 'done', url }])
        form.setFieldValue('avatar_url', url)
        message.success('头像已上传')
      },
      onError: () => {
        setAvatarUrl(undefined)
        setAvatarList([])
        form.setFieldValue('avatar_url', '')
      },
    })
    return Upload.LIST_IGNORE
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl(undefined)
    setAvatarList([])
    form.setFieldValue('avatar_url', undefined)
  }

  const onStatusChecked = (checked: boolean): CommonStatus =>
    checked ? STATUS_ENABLED : STATUS_DISABLED

  const handleSubmit = async () => {
    let values: AccountFormValues
    try {
      values = await form.validateFields()
    } catch {
      return // 校验失败由 Form.Item 就地提示
    }
    setSubmitting(true)
    try {
      const body = {
        username: values.username.trim(),
        nickname: values.nickname.trim(),
        phone: values.phone.trim(),
        email: values.email?.trim() || undefined,
        status: values.status,
        role_ids: values.role_ids,
        avatar_url: values.avatar_url || undefined,
        // 编辑不提交密码
        ...(isEdit ? {} : { password: values.password }),
      }
      if (isEdit && initial) {
        await systemApi.updateAdmin(initial.id, body)
        // 角色另走分配接口，避免后端编辑接口不处理 role_ids
        await systemApi.assignAdminRoles(initial.id, values.role_ids)
        message.success(`用户 ${body.nickname} 已更新`)
      } else {
        await systemApi.createAdmin(body)
        message.success(`用户 ${body.nickname} 已创建`)
      }
      onSaved()
      setAvatarUrl(undefined)
      setAvatarList([])
      form.resetFields()
      onClose()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRoles = useMemo(
    () => formRoleIds.filter((id) => roleSummary.has(id)),
    [formRoleIds, roleSummary],
  )

  return (
    <Drawer
      open={open}
      width={480}
      title={isEdit ? '编辑用户' : '新增用户'}
      onClose={onClose}
      footer={
        <div className="account-drawer__footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            {isEdit ? '保存' : '创建用户'}
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
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 19 }}
          initialValues={{ status: STATUS_ENABLED, role_ids: [] }}
        >
          <Form.Item
            name="username"
            label="登录账号"
            rules={[{ required: true, message: '请输入登录账号' }]}
          >
            <Input placeholder="请输入登录账号" />
          </Form.Item>
          {/* 密码仅新增时填写；编辑改密请使用列表中的「重置密码」 */}
          {!isEdit && (
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
          )}
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
            rules={[{ required: true, message: '请选择所属角色' }]}
          >
            <Select mode="multiple" placeholder="请选择所属角色（可多选）" options={roleOptions} />
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
            getValueProps={(value: CommonStatus) => ({ checked: value === STATUS_ENABLED })}
          >
            <Switch />
          </Form.Item>
          <Form.Item label="头像">
            <Upload
              listType="picture-card"
              maxCount={1}
              accept="image/*"
              fileList={avatarList}
              disabled={uploading}
              beforeUpload={handleAvatarChange}
              onRemove={handleRemoveAvatar}
            >
              {avatarUrl ? null : (
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
          <strong>所选角色 · 说明</strong>
          {selectedRoles.length > 0 ? (
            selectedRoles.map((rid) => (
              <p key={rid}>
                <b>{roleOptions.find((item) => item.value === rid)?.label}</b>：
                {roleSummary.get(rid)}
              </p>
            ))
          ) : (
            <p className="account-drawer__summary-empty">请选择角色以查看角色说明</p>
          )}
        </div>
      </div>
    </Drawer>
  )
}
