/**
 * 系统设置 - 用户管理
 * 视觉对齐设计稿：统计卡 + 筛选 + 角色 Tabs + 用户表格 + 新增用户 Drawer
 * 当前为 mock 数据，后端就绪后替换为 systemApi.getAccountList / saveAccount
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Drawer, Input, Radio, Select, Switch, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import type { AccountItem } from '@/api/modules/system'
import './account.less'

const roleSummary: Record<string, string> = {
  平台管理员: '拥有全部平台功能权限，包含用户、角色与系统设置。',
  运营人员: '机构管理、服务项目、活动与内容；不包含退款审核、财务对账和系统设置。',
  财务人员: '订单查看、退款审核与财务对账；不包含机构与内容维护。',
  订单客服: '订单查询与退款处理；不包含财务对账和系统设置。',
}

const initialAccounts: AccountItem[] = [
  {
    id: '1',
    username: 'chen.yunying',
    name: '陈运营',
    roleName: '平台管理员',
    phone: '138****1026',
    loginType: '账号密码',
    enabled: true,
    lastLoginTime: '今日 09:12',
    creator: '系统初始化',
  },
  {
    id: '2',
    username: 'li.caiwu',
    name: '李财务',
    roleName: '财务人员',
    phone: '136****5381',
    loginType: '账号密码',
    enabled: true,
    lastLoginTime: '今日 08:45',
    creator: '陈运营',
  },
  {
    id: '3',
    username: 'wang.kefu',
    name: '王客服',
    roleName: '订单客服',
    phone: '159****2218',
    loginType: '账号密码',
    enabled: true,
    lastLoginTime: '昨日 17:36',
    creator: '陈运营',
  },
  {
    id: '4',
    username: 'zhou.neirong',
    name: '周内容',
    roleName: '运营人员',
    phone: '137****6632',
    loginType: '账号密码',
    enabled: true,
    lastLoginTime: '昨日 16:20',
    creator: '陈运营',
  },
  {
    id: '5',
    username: 'zhao.yunying',
    name: '赵运营',
    roleName: '运营人员',
    phone: '135****9066',
    loginType: '账号密码',
    enabled: false,
    lastLoginTime: '08-01 10:08',
    creator: '陈运营',
  },
  {
    id: '6',
    username: 'test.operation',
    name: '测试账号',
    roleName: '运营人员',
    phone: '188****3175',
    loginType: '账号密码',
    enabled: false,
    lastLoginTime: '07-28 14:42',
    creator: '陈运营',
  },
]

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'enabled', label: '启用 10' },
  { key: 'disabled', label: '停用 2' },
  { key: '平台管理员', label: '平台管理员 2' },
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
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formRole, setFormRole] = useState('运营人员')
  const [formEnabled, setFormEnabled] = useState(true)

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.username.toLowerCase().includes(applied.keyword.toLowerCase()) ||
        item.phone.includes(applied.keyword)
      const roleHit = applied.role === 'all' || item.roleName === applied.role
      const statusHit =
        applied.status === 'all' ||
        (applied.status === 'enabled' ? item.enabled : !item.enabled)
      const tabHit =
        tab === 'all' ||
        (tab === 'enabled' && item.enabled) ||
        (tab === 'disabled' && !item.enabled) ||
        (tab === 'other' && item.roleName !== '平台管理员' && item.roleName !== '运营人员') ||
        item.roleName === tab
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
    setFormName('')
    setFormPhone('')
    setFormUsername('')
    setFormRole('运营人员')
    setFormEnabled(true)
    setDrawerOpen(true)
  }

  const handleCreate = () => {
    if (!formName.trim() || !formPhone.trim() || !formUsername.trim()) {
      message.warning('请完整填写姓名、手机号与登录账号')
      return
    }
    setData((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        username: formUsername.trim(),
        name: formName.trim(),
        roleName: formRole,
        phone: formPhone.trim(),
        loginType: '账号密码',
        enabled: formEnabled,
        lastLoginTime: '—',
        creator: '陈运营',
      },
    ])
    message.success(`用户 ${formName.trim()} 已创建（mock）`)
    setDrawerOpen(false)
  }

  const handleToggle = (record: AccountItem) => {
    setData((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, enabled: !item.enabled } : item)),
    )
    message.success(`${record.name} 已${record.enabled ? '停用' : '启用'}（mock）`)
  }

  const columns = useMemo<ColumnsType<AccountItem>>(
    () => [
      {
        title: '账号 / 姓名',
        key: 'username',
        render: (_, record) => (
          <div className="account-name">
            <strong>{record.username}</strong>
            <span>{record.name}</span>
          </div>
        ),
      },
      { title: '所属角色', dataIndex: 'roleName', key: 'roleName', width: 120 },
      { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
      { title: '登录方式', dataIndex: 'loginType', key: 'loginType', width: 100 },
      {
        title: '账号状态',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 100,
        render: (value: boolean) => (
          <span className={`account-status${value ? ' is-on' : ''}`}>{value ? '启用' : '停用'}</span>
        ),
      },
      { title: '最近登录', dataIndex: 'lastLoginTime', key: 'lastLoginTime', width: 120 },
      { title: '创建人', dataIndex: 'creator', key: 'creator', width: 110 },
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
              danger={record.enabled}
              onClick={() => handleToggle(record)}
            >
              {record.enabled ? '停用' : '启用'}
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
            <p>一期每个用户只分配一个角色，不在用户侧单独配置权限。</p>
          </div>
          <div className="account-drawer__field">
            <label>
              姓名 <i>*</i>
            </label>
            <Input
              placeholder="请输入用户姓名"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
            />
          </div>
          <div className="account-drawer__field">
            <label>
              手机号 <i>*</i>
            </label>
            <Input
              placeholder="请输入手机号"
              value={formPhone}
              onChange={(event) => setFormPhone(event.target.value)}
            />
          </div>
          <div className="account-drawer__field">
            <label>
              登录账号 <i>*</i>
            </label>
            <Input
              placeholder="请输入登录账号"
              value={formUsername}
              onChange={(event) => setFormUsername(event.target.value)}
            />
          </div>
          <div className="account-drawer__field">
            <label>
              所属角色 <i>*</i>
            </label>
            <Select
              value={formRole}
              onChange={setFormRole}
              options={Object.keys(roleSummary).map((name) => ({ label: name, value: name }))}
            />
          </div>
          <div className="account-drawer__field account-drawer__switch">
            <div>
              <label>账号状态</label>
              <span>启用后允许用户登录运营平台</span>
            </div>
            <Switch checked={formEnabled} onChange={setFormEnabled} />
          </div>
          <div className="account-drawer__summary">
            <strong>{formRole} · 权限摘要</strong>
            <p>{roleSummary[formRole]}</p>
          </div>
        </div>
      </Drawer>
    </PageContainer>
  )
}
