/**
 * 路由懒加载过渡加载态
 */
import { Spin } from 'antd'

export default function PageLoading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
      }}
    >
      <Spin size="large" />
    </div>
  )
}
