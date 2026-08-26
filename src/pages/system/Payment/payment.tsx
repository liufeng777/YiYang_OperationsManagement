/**
 * 系统设置 - 微信支付配置
 * 对齐设计稿：微信商户基础信息 + 安全凭证 + 支付与退款回调 + 渠道运行状态 + 连接测试 + 操作记录
 */
import { useState } from 'react'
import { App, Button, Card, Divider, Form, Input, Modal, Switch } from 'antd'
import { CopyOutlined, EditOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import type { WechatPayConfig, PaymentOperationLog } from '@/api/modules/settings'
import './payment.less'

/* ------------------------------------------------------------------ */
/* Mock 数据                                                            */
/* ------------------------------------------------------------------ */

const mockConfig: WechatPayConfig = {
  channel: 'wechat',
  channel_name: '微信支付',
  channel_desc: 'JSAPI · 患者端小程序',
  mch_id: '190000****',
  mch_holder: '由集团统一持有',
  app_id: 'wx8f3a********2c',
  app_id_desc: '幸福颐养患者端',
  api_v3_key_configured: true,
  api_v3_key_updated_at: '2026-08-01',
  private_key_file: 'apiclient_key.pem',
  private_key_encrypted: true,
  cert_serial_no: '5F3A****91C2',
  cert_valid: true,
  cert_auto_update: true,
  notify_url: 'https://api.xfyy.cn/pay/wechat/notify',
  notify_url_verified: true,
  refund_notify_url: 'https://api.xfyy.cn/pay/wechat/refund-notify',
  refund_notify_url_verified: true,
  status: 1,
  config_complete: true,
}

const mockLogs: PaymentOperationLog[] = [
  {
    id: 1,
    created_at: '08-24 10:26',
    action: '执行连接测试',
    result: '成功',
    operator: '陈运营',
    detail: '结果：成功',
  },
  {
    id: 2,
    created_at: '08-01 16:40',
    action: '更新 API V3 密钥',
    result: '安全验证通过',
    operator: '王管理员',
    detail: '安全验证通过',
  },
  {
    id: 3,
    created_at: '07-18 09:12',
    action: '启用微信支付',
    operator: '陈运营',
    detail: '渠道开始承接患者端支付',
  },
]

/* ------------------------------------------------------------------ */
/* 辅助组件                                                              */
/* ------------------------------------------------------------------ */

function InfoRow({
  label,
  children,
  action,
}: {
  label: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="payment-info-row">
      <span className="payment-info-row__label">{label}</span>
      <div className="payment-info-row__content">
        {children}
        {action && <div className="payment-info-row__action">{action}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 主页面                                                               */
/* ------------------------------------------------------------------ */

export default function PaymentSettings() {
  const { message, modal } = App.useApp()
  const [config, setConfig] = useState<WechatPayConfig>(mockConfig)
  const [logs] = useState<PaymentOperationLog[]>(mockLogs)
  const [testLoading, setTestLoading] = useState(false)
  const [lastTest, setLastTest] = useState<{ time: string; success: boolean; operator: string } | null>({
    time: '2026-08-24 10:26',
    success: true,
    operator: '陈运营',
  })

  /* ---------- 编辑商户号 ---------- */
  const [editMchOpen, setEditMchOpen] = useState(false)
  const [editMchForm] = Form.useForm()

  const openEditMch = () => {
    editMchForm.setFieldsValue({ mch_id: config.mch_id })
    setEditMchOpen(true)
  }

  const saveMch = async () => {
    const values = await editMchForm.validateFields()
    setConfig((prev) => ({ ...prev, mch_id: values.mch_id }))
    setEditMchOpen(false)
    message.success('商户号已更新（mock）')
  }

  /* ---------- 编辑 AppID ---------- */
  const [editAppIdOpen, setEditAppIdOpen] = useState(false)
  const [editAppIdForm] = Form.useForm()

  const openEditAppId = () => {
    editAppIdForm.setFieldsValue({ app_id: config.app_id })
    setEditAppIdOpen(true)
  }

  const saveAppId = async () => {
    const values = await editAppIdForm.validateFields()
    setConfig((prev) => ({ ...prev, app_id: values.app_id }))
    setEditAppIdOpen(false)
    message.success('AppID 已更新（mock）')
  }

  /* ---------- 复制 URL ---------- */
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => message.success('已复制到剪贴板'))
  }

  /* ---------- 渠道开关 ---------- */
  const toggleChannel = (checked: boolean) => {
    const nextStatus = checked ? 1 : 9
    setConfig((prev) => ({ ...prev, status: nextStatus }))
    message.success(`微信支付已${checked ? '启用' : '停用'}（mock）`)
  }

  /* ---------- 连接测试 ---------- */
  const runConnectionTest = async () => {
    setTestLoading(true)
    setTimeout(() => {
      setTestLoading(false)
      const now = new Date()
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      setLastTest({ time: timeStr, success: true, operator: '陈运营' })
      message.success('连接测试成功（mock）')
    }, 1200)
  }

  /* ---------- 更新凭证 ---------- */
  const updateCredential = (type: string) => {
    modal.confirm({
      title: `确认更新${type}？`,
      content: '更新后需重新验证支付功能是否正常。',
      okText: '确认更新',
      onOk: () => message.success(`${type}已更新（mock）`),
    })
  }

  /* ---------- 渲染 ---------- */
  const isEnabled = config.status === 1

  return (
    <PageContainer
      title="微信支付配置"
      description="维护唯一微信支付商户、支付回调与安全凭证"
    >
      <div className="payment-settings">
        {/* 左侧主内容 */}
        <div className="payment-settings__main">
          {/* 微信商户基础信息 */}
          <Card variant="borderless" className="payment-card">
            <div className="payment-card__header">
              <h3 className="payment-card__title">微信商户基础信息</h3>
              <p className="payment-card__subtitle">一期仅维护一个微信支付商户，适用于幸福颐养患者端</p>
            </div>
            <Divider style={{ margin: '16px 0' }} />
            <InfoRow label="支付渠道">
              <div>
                <strong>{config.channel_name}</strong>
                <p className="payment-info-row__desc">{config.channel_desc}</p>
              </div>
            </InfoRow>
            <InfoRow
              label="微信商户号"
              action={
                <Button type="link" size="small" icon={<EditOutlined />} onClick={openEditMch}>
                  编辑
                </Button>
              }
            >
              <div>
                <strong>{config.mch_id}</strong>
                <p className="payment-info-row__desc">{config.mch_holder}</p>
              </div>
            </InfoRow>
            <InfoRow
              label="小程序 AppID"
              action={
                <Button type="link" size="small" icon={<EditOutlined />} onClick={openEditAppId}>
                  编辑
                </Button>
              }
            >
              <div>
                <strong>{config.app_id}</strong>
                <p className="payment-info-row__desc">{config.app_id_desc}</p>
              </div>
            </InfoRow>
          </Card>

          {/* 安全凭证 */}
          <Card variant="borderless" className="payment-card">
            <div className="payment-card__header">
              <h3 className="payment-card__title">安全凭证</h3>
              <p className="payment-card__subtitle">敏感内容仅显示配置状态与掩码，更新时需重新录入</p>
            </div>
            <Divider style={{ margin: '16px 0' }} />
            <InfoRow
              label="API V3 密钥"
              action={
                <Button type="link" size="small" onClick={() => updateCredential('API V3 密钥')}>
                  更新密钥
                </Button>
              }
            >
              <div>
                <span className="payment-mask">• • • • • • • • • • • • • • • • • •</span>
                <p className="payment-info-row__desc">
                  {config.api_v3_key_configured ? `已配置 · ${config.api_v3_key_updated_at} 更新` : '未配置'}
                </p>
              </div>
            </InfoRow>
            <InfoRow
              label="商户私钥"
              action={
                <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => updateCredential('商户私钥')}>
                  重新上传
                </Button>
              }
            >
              <div>
                <strong>{config.private_key_file}</strong>
                <p className="payment-info-row__desc">
                  {config.private_key_encrypted ? '已加密保存 · 不支持下载' : '未上传'}
                </p>
              </div>
            </InfoRow>
            <InfoRow
              label="商户证书"
              action={
                <Button type="link" size="small" icon={<EyeOutlined />}>
                  查看
                </Button>
              }
            >
              <div>
                <strong>序列号 {config.cert_serial_no}</strong>
                <p className="payment-info-row__desc">
                  {config.cert_valid ? '有效' : '无效'}
                  {config.cert_auto_update ? ' · 平台证书自动更新' : ''}
                </p>
              </div>
            </InfoRow>
            <div className="payment-card__footer-tip">
              仅平台超级管理员可更新凭证，更新、启停与连接测试均记录操作日志。
            </div>
          </Card>

          {/* 支付与退款回调 */}
          <Card variant="borderless" className="payment-card">
            <div className="payment-card__header">
              <h3 className="payment-card__title">支付与退款回调</h3>
              <p className="payment-card__subtitle">系统生成固定地址，请复制到微信支付商户平台</p>
            </div>
            <Divider style={{ margin: '16px 0' }} />
            <InfoRow
              label="支付结果通知"
              action={
                <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyUrl(config.notify_url)}>
                  复制
                </Button>
              }
            >
              <div>
                <strong className="payment-url">{config.notify_url}</strong>
                <p className="payment-info-row__desc">
                  {config.notify_url_verified ? '已验证' : '未验证'}
                </p>
              </div>
            </InfoRow>
            <InfoRow
              label="退款结果通知"
              action={
                <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyUrl(config.refund_notify_url)}>
                  复制
                </Button>
              }
            >
              <div>
                <strong className="payment-url">{config.refund_notify_url}</strong>
                <p className="payment-info-row__desc">
                  {config.refund_notify_url_verified ? '已验证' : '未验证'}
                </p>
              </div>
            </InfoRow>
          </Card>
        </div>

        {/* 右侧边栏 */}
        <div className="payment-settings__sidebar">
          {/* 渠道运行状态 */}
          <Card variant="borderless" className="payment-sidebar-card">
            <h4 className="payment-sidebar-card__title">渠道运行状态</h4>
            <div className="payment-status-bar">
              <div className="payment-status-bar__info">
                <strong>微信支付</strong>
                <span>{isEnabled ? '已启用 · 配置完整' : '已停用'}</span>
              </div>
              <Switch checked={isEnabled} onChange={toggleChannel} />
            </div>
            <p className="payment-sidebar-card__tip">
              停用后患者端将无法发起新支付；退款查询和历史流水仍可查看。
            </p>
          </Card>

          {/* 连接测试 */}
          <Card variant="borderless" className="payment-sidebar-card">
            <h4 className="payment-sidebar-card__title">连接测试</h4>
            <p className="payment-sidebar-card__desc">
              验证商户号、证书和 API V3 密钥是否可正常访问微信支付。
            </p>
            {lastTest && (
              <div className="payment-test-result">
                <strong>最近测试：{lastTest.success ? '连接成功' : '连接失败'}</strong>
                <span>
                  {lastTest.time} · {lastTest.operator}
                </span>
              </div>
            )}
            <Button
              className="payment-test-btn"
              type="primary"
              ghost
              loading={testLoading}
              onClick={runConnectionTest}
            >
              测试连接
            </Button>
          </Card>

          {/* 最近操作记录 */}
          <Card variant="borderless" className="payment-sidebar-card">
            <h4 className="payment-sidebar-card__title">最近操作记录</h4>
            <div className="payment-log-list">
              {logs.map((log) => (
                <div className="payment-log-item" key={log.id}>
                  <div className="payment-log-item__meta">
                    <span className="payment-log-item__time">{log.created_at}</span>
                    <strong className="payment-log-item__action">{log.action}</strong>
                  </div>
                  <p className="payment-log-item__detail">
                    {log.detail}
                    {log.operator && ` · ${log.operator}`}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 编辑商户号 Modal */}
      <Modal
        open={editMchOpen}
        title="编辑微信商户号"
        onCancel={() => setEditMchOpen(false)}
        onOk={saveMch}
        okText="保存"
      >
        <Form form={editMchForm} layout="vertical" requiredMark={false}>
          <Form.Item
            name="mch_id"
            label="微信商户号"
            rules={[{ required: true, message: '请输入微信商户号' }]}
          >
            <Input placeholder="请输入微信商户号" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑 AppID Modal */}
      <Modal
        open={editAppIdOpen}
        title="编辑小程序 AppID"
        onCancel={() => setEditAppIdOpen(false)}
        onOk={saveAppId}
        okText="保存"
      >
        <Form form={editAppIdForm} layout="vertical" requiredMark={false}>
          <Form.Item
            name="app_id"
            label="小程序 AppID"
            rules={[{ required: true, message: '请输入小程序 AppID' }]}
          >
            <Input placeholder="请输入小程序 AppID" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
