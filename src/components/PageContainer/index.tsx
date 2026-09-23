/**
 * 页面容器
 * 统一页面布局：主标题（页面主标题 28/40 Bold）+ 可选描述 + 内容区
 * fixed 模式：整页固定不滚动，由内容区内的数据卡片（如 list-card--fill）内部滚动；
 *             适用于「统计卡 + 筛选 + 列表」类页面，详情/表单等长内容页面保持默认整页滚动
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
  /** 固定高度模式：页面整体不滚动，数据区内部滚动 */
  fixed?: boolean
  children?: ReactNode
}

export default function PageContainer(props: PageContainerProps) {
  const { title, extra, description, fixed = false, children } = props
  return (
    <div className={`page-container${fixed ? ' page-container--fixed' : ''}`}>
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
