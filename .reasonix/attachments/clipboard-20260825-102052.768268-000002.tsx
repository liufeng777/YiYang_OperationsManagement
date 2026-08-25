/**
 * 登录页
 * 当前为 mock 登录：任意账号密码可登录，接入真实后端后替换 login action
 */
import { useState } from 'react'
import { Button, Checkbox, Form, Input, App } from 'antd'
import {
  BankOutlined,
  LockOutlined,
  PlusOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/store/modules/user'
import './index.less'

interface LoginForm {
  username: string
  password: string
  remember?: boolean
}

const features = [
  {
    icon: <BankOutlined />,
    title: '机构统一运营',
    desc: '同步分院与机构资料，维护线上服务范围',
  },
  {
    icon: <ProfileOutlined />,
    title: '服务活动管理',
    desc: '统一定义服务内容，各机构承接上架',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: '订单财务闭环',
    desc: '订单、退款与结算统一口径，全程可追溯',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const login = useUserStore((state) => state.login)

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      await login({ username: values.username, password: values.password })
      message.success('登录成功')
      const from = (location.state as { from?: string })?.from
      navigate(from || '/dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-page__brand">
        <header className="login-page__logo">
          <span className="login-page__logo-icon">
            <PlusOutlined />
          </span>
          <span className="login-page__logo-text">
            <strong>幸福颐养</strong>
            <span>运营管理平台</span>
          </span>
        </header>

        <section className="login-page__intro">
          <h1>
            让机构运营更高效，
            <br />
            让服务协同更顺畅
          </h1>
          <p>
            统一管理机构、服务、活动与订单，连接患者端与医护协作工作台，
            <br />
            让每一次预约、履约与售后都有清晰闭环。
          </p>
        </section>

        <section className="login-page__features">
          {features.map((item) => (
            <div className="login-page__feature" key={item.title}>
              <span className="login-page__feature-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </section>

        <footer className="login-page__copyright">
          © 2025 幸福颐养 · 数字化运营管理平台
        </footer>
      </aside>

      <main className="login-page__panel">
        <div className="login-page__form-wrap">
          <h2 className="login-page__title">登录运营管理平台</h2>
          <p className="login-page__desc">使用平台账号登录，系统将根据角色显示可访问菜单</p>

          <div className="login-page__tabs">
            <span className="login-page__tab login-page__tab--active">账号密码登录</span>
          </div>

          <Form<LoginForm>
            className="login-page__form"
            layout="vertical"
            requiredMark={false}
            initialValues={{ remember: true }}
            onFinish={onFinish}
          >
            <Form.Item
              label="登录账号"
              name="username"
              rules={[{ required: true, message: '请输入手机号或平台账号' }]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="请输入手机号或平台账号"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              label="登录密码"
              name="password"
              rules={[{ required: true, message: '请输入登录密码' }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="请输入登录密码"
                autoComplete="current-password"
                iconRender={(visible) => (visible ? '隐藏' : '显示')}
              />
            </Form.Item>

            <div className="login-page__form-extra">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住登录状态</Checkbox>
              </Form.Item>
              <span className="login-page__help">账号问题请联系平台管理员</span>
            </div>

            <Button
              className="login-page__submit"
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form>

          <div className="login-page__security">
            <SafetyCertificateOutlined />
            <div>
              <strong>安全提示</strong>
              <p>请勿在公共设备保存登录状态，离开前请安全退出。</p>
            </div>
          </div>
        </div>

        <footer className="login-page__version">运营管理平台 V1.0</footer>
      </main>
    </div>
  )
}
