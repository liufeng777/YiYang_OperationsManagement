/**
 * 系统设置 - 用户管理
 * 视觉对齐设计稿：统计卡 + 筛选 + 角色 Tabs + 用户表格 + 新增用户 Drawer
 * 当前为 mock 数据，后端就绪后替换为 systemApi.getAccountList / saveAccount
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Drawer, Form, Input, Radio, Select, Space, Switch, Table, Tag, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd'
import { BarChartOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import type { AccountItem } from '@/api/modules/system';
import { formatDateTime } from '@/utils'
import './account.less'

/** 角色字典：id → 名称/编码/权限摘要（1-超管 2-运营人员 3-财务人员 4-订单客服） */
const roleDict: Record<
  number,
  { role_name: string; role_code: string; summary: string }
> = {
  1: {
    role_name: '超管',
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

const initialAccounts: AccountItem[] = [
  {
    id: 1,
    username: 'chen.yunying',
    nickname: '陈运营',
    password: '',
    roles: [{
      id: 1,
      role_name: "超管",
      role_code: "super"
    }],
    phone: '138****1026',
    email: null,
    status: 1,
    last_login_at: 1787645591,
    last_login_ip: '127.0.0.1',
    created_at: 1787645591,
  },
  {
    id: 2,
    username: 'li.caiwu',
    nickname: '李财务',
    password: '',
    roles: [{
      id: 2,
      role_name: "运营人员",
      role_code: "operator"
    }, {
      id: 3,
      role_name: "财务人员",
      role_code: "finance"
    }],
    phone: '136****5381',
    email: 'li.caiwu@163.com',
    status: 9,
    last_login_at: 1787645591,
    last_login_ip: '127.0.0.1',
    created_at: 1787645591
  },
  {
    id: 3,
    username: 'wang.kefu',
    nickname: '王客服',
    password: '',
    roles: [{
      id: 4,
      role_name: "订单客服",
      role_code: "orderCustomerService"
    }],
    phone: '159****2218',
    email: '',
    status: 1,
    last_login_at: 1787645591,
    last_login_ip: '127.0.0.1',
    created_at: 1787645591,
  },
  {
    id: 4,
    username: 'zhou.neirong',
    nickname: '周内容',
    phone: '137****6632',
    roles: [{
      id: 2,
      role_name: "运营人员",
      role_code: "operator"
    }, {
      id: 3,
      role_name: "财务人员",
      role_code: "finance"
    }],
    password: '',
    status: 1,
    last_login_at: 1787645591,
    last_login_ip: '127.0.0.1',
    created_at: 1787645591,
    email: 'neirong@qq.com',
  },
  {
    id: 5,
    username: 'zhao.yunying',
    nickname: '赵运营',
    password: '',
    phone: '135****9066',
    roles: [{
      id: 2,
      role_name: "运营人员",
      role_code: "operator"
    }, {
      id: 3,
      role_name: "财务人员",
      role_code: "finance"
    }],
    email: '',
    status: 9,
    last_login_at: 1787645591,
    last_login_ip: '127.0.0.1',
    created_at: 1787645591,
  }
]

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'enabled', label: '启用 10' },
  { key: 'disabled', label: '停用 2' },
  { key: '平台管理员', label: '超管 1' },
  { key: '运营人员', label: '运营人员 4' },
  { key: 'other', label: '其他角色 6' },
]

const metrics = [
  { key: 'all', label: '全部用户', value: '12', note: '运营平台内部用户', tone: 'primary' },
  { key: 'enabled', label: '启用用户', value: '10', note: '今日登录 6 人', tone: 'info' },
  { key: 'disabled', label: '停用用户', value: '2', note: '停用后不允许登录', tone: 'warning' },
  { key: 'role', label: '角色数量', value: '4', note: '在角色管理中统一维护', tone: 'danger' },
]

interface AccountFilters {
  keyword: string
  role: string
  status: 'all' | 'enabled' | 'disabled'
  login: string
}

export default function AccountList() {
  const { message } = App.useApp()
  const [data, setData] = useState(initialAccounts)
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState<AccountFilters['status']>('all')
  const [login, setLogin] = useState('all')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<AccountFilters>({
    keyword: '',
    role: 'all',
    status: 'all',
    login: 'all',
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>()
  const [avatarList, setAvatarList] = useState<UploadFile[]>([])

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

  const [form] = Form.useForm<AccountFormValues>()
  const formRoleIds = Form.useWatch('role_ids', form) ?? []

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

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.username.includes(applied.keyword) ||
        item.username.toLowerCase().includes(applied.keyword.toLowerCase()) ||
        item.phone.includes(applied.keyword)
      const roleNames = item.roles.map((r) => r.role_name)
      const roleHit =
        applied.role === 'all' || roleNames.includes(applied.role)
      const statusHit =
        applied.status === 'all' ||
        (applied.status === 'enabled' ? item.status === 1 : item.status === 9)
      const tabHit =
        tab === 'all' ||
        (tab === 'enabled' && item.status === 1) ||
        (tab === 'disabled' && item.status === 9) ||
        (tab === 'other' &&
          !roleNames.some((name) => name === '超管' || name === '运营人员')) ||
        roleNames.includes(tab)
      return keywordHit && roleHit && statusHit && tabHit
    })
  }, [applied, data, tab])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), role, status, login })
  }

  const handleReset = () => {
    setKeyword('')
    setRole('all')
    setStatus('all')
    setLogin('all')
    setApplied({ keyword: '', role: 'all', status: 'all', login: 'all' })
  }

  const openDrawer = () => {
    setAvatarUrl(undefined)
    setAvatarList([])
    form.resetFields()
    setDrawerOpen(true)
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const nickname = values.nickname.trim()
      const username = values.username.trim()
      const now = Math.floor(Date.now() / 1000)
      setData((prev) => [
        ...prev,
        {
          id: Date.now(),
          username,
          nickname,
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
        },
      ])
      message.success(`用户 ${nickname} 已创建（mock）`)
      form.resetFields()
      setAvatarUrl(undefined)
      setAvatarList([])
      setDrawerOpen(false)
    } catch {
      // 校验失败由 Form.Item 就地提示
    }
  }

  const handleToggle = (record: AccountItem) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === record.id
          ? { ...item, status: item.status === 1 ? 9 : 1 }
          : item,
      ),
    )
    message.success(`${record.username} 已${record.status === 1 ? '停用' : '启用'}（mock）`)
  }

  const columns = useMemo<ColumnsType<AccountItem>>(
    () => [
      {
        title: '用户名 / 昵称',
        key: 'username',
        render: (_, record) => (
          <div className="account-name">
            <strong>{record.username}</strong>
            <span>{record.nickname}</span>
          </div>
        ),
      },
      { title: '角色', dataIndex: 'roles', key: 'roles', render: (roles: AccountItem['roles']) => (
        <Space>{roles.map(v => <Tag key={v.id}>{v.role_name}</Tag>)}</Space>
      )},
      { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
      {
        title: '账号状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => (
          <span className={`account-status${value === 1 ? ' is-on' : ''}`}>{value === 1 ? '启用' : '停用'}</span>
        ),
      },
      { title: '最近登录', dataIndex: 'last_login_at', key: 'last_login_at', width: 160, render: (v: number) => formatDateTime(v * 1000)},
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: (_, record) => (
          <div className="account-actions">
            <Button type="link" size="small" onClick={() => message.info('编辑用户开发中')}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger={record.status === 1}
              onClick={() => handleToggle(record)}
            >
              {record.status === 1 ? '停用' : '启用'}
            </Button>
          </div>
        ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title="用户管理"
      description="创建运营平台用户并分配一个角色，用户权限全部继承所属角色"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openDrawer}>
          新增用户
        </Button>
      }
    >
      <div className="account-list">
        <div className="metric-cards">
          {metrics.map((metric) => (
            <Card variant="borderless" className="metric-card" key={metric.key}>
              <div className="metric-card__head">
                <span className="metric-card__label">{metric.label}</span>
                <i className={`metric-card__icon metric-card__icon--${metric.tone}`}>
                  <BarChartOutlined />
                </i>
              </div>
              <strong className="metric-card__value">{metric.value}</strong>
              <em className={`metric-card__note metric-card__note--${metric.tone}`}>
                {metric.note}
              </em>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar account-list__filter">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="姓名、手机号或登录账号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={role}
            onChange={setRole}
            options={[
              { label: '全部角色', value: 'all' },
              { label: '平台管理员', value: '平台管理员' },
              { label: '运营人员', value: '运营人员' },
              { label: '财务人员', value: '财务人员' },
              { label: '订单客服', value: '订单客服' },
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: '全部账号状态', value: 'all' },
              { label: '启用', value: 'enabled' },
              { label: '停用', value: 'disabled' },
            ]}
          />
          <Select
            value={login}
            onChange={setLogin}
            options={[
              { label: '最近登录', value: 'all' },
              { label: '今日登录', value: 'today' },
              { label: '7 日内登录', value: 'week' },
            ]}
          />
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">用户列表</span>
              <span className="list-card__header__tips">共 12 个用户 · 启用 10 个</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<AccountItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            pagination={{ total: 12, pageSize: 6, current: 1, showSizeChanger: false }}
          />
        </Card>
      </div>

      <Drawer
        open={drawerOpen}
        width={480}
        title="新增用户"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="account-drawer__footer">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
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
            // layout="vertical"
            requiredMark={false}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
            initialValues={{ status: 1, role_ids: [2] }}
          >
            <div className="account-drawer__field">
              <Form.Item
                name="nickname"
                label={<span>姓名 <i>*</i></span>}
                rules={[{ required: true, message: '请输入用户姓名' }]}
              >
                <Input placeholder="请输入用户姓名" />
              </Form.Item>
            </div>
            <div className="account-drawer__field">
              <Form.Item
                name="phone"
                label={<span>手机号 <i>*</i></span>}
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </div>
            <div className="account-drawer__field">
              <Form.Item
                name="username"
                label={<span>登录账号 <i>*</i></span>}
                rules={[{ required: true, message: '请输入登录账号' }]}
              >
                <Input placeholder="请输入登录账号" />
              </Form.Item>
            </div>
            <div className="account-drawer__field">
              <Form.Item
                name="password"
                label={<span>登录密码 <i>*</i></span>}
                rules={[
                  { required: true, message: '请输入登录密码' },
                  { min: 6, message: '密码至少 6 位' },
                ]}
              >
                <Input.Password placeholder="请输入登录密码（用于首次登录）" />
              </Form.Item>
            </div>
            <div className="account-drawer__field">
              <Form.Item
                name="email"
                label={<>邮箱</>}
                rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}
              >
                <Input placeholder="请输入邮箱（选填）" />
              </Form.Item>
            </div>
            <div className="account-drawer__field">
              <Form.Item
                name="role_ids"
                label={<span>所属角色 <i>*</i></span>}
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
            </div>
            <div className="account-drawer__field account-drawer__switch">
              <div>
                <label>账号状态</label>
                <span>启用后允许用户登录运营平台</span>
              </div>
              <Form.Item
                name="status"
                valuePropName="checked"
                getValueFromEvent={onStatusChecked}
                getValueProps={(value: number) => ({ checked: value === 1 })}
                noStyle
              >
                <Switch />
              </Form.Item>
            </div>
            <div className="account-drawer__field account-drawer__avatar">
              <label>头像</label>
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
              <Form.Item name="avatar_url" hidden noStyle>
                <input />
              </Form.Item>
            </div>
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
    </PageContainer>
  )
}
