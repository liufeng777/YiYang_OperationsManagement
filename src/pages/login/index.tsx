/**
 * 登录页
 * 当前为 mock 登录：任意账号密码可登录，接入真实后端后替换 login action
 */
import { useState } from 'react'
import { Button, Card, Form, Input, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/store/modules/user'
import './index.less'

interface LoginForm {
  username: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const login = useUserStore((state) => state.login)

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      await login(values)
      message.success('登录成功')
      const from = (location.state as { from?: string })?.from
      navigate(from || '/dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Card className="login-page__card" bordered={false}>
        <h1 className="login-page__title">YiYang Admin</h1>
        <p className="login-page__desc">运营管理后台</p>
        <Form<LoginForm>
          size="large"
          initialValues={{ username: 'admin', password: '123456' }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="账号" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登 录
          </Button>
        </Form>
      </Card>
    </div>
  )
}
