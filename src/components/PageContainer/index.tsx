/**
 * 页面容器
 * 统一页面布局：主标题（页面主标题 28/40 Bold）+ 可选描述 + 内容区
 */
import type { ReactNode } from 'react'
import './index.less'

interface PageContainerProps {
  /** 页面主标题 */
  title: string
  /** 标题右侧操作区（如新建按钮） */
  extra?: ReactNode
  /** 辅助描述文字 */
  description?: ReactNode
  children?: ReactNode
}

export default function PageContainer(props: PageContainerProps) {
  const { title, extra, description, children } = props
  return (
    <div className="page-container">
      <div className="page-container__header">
        <div className="page-container__header-left">
          <h2 className="page-container__title">{title}</h2>
          {description && (
            <p className="page-container__desc">{description}</p>
          )}
        </div>
        {extra && <div className="page-container__extra">{extra}</div>}
      </div>
      <div className="page-container__body">{children}</div>
    </div>
  )
}
