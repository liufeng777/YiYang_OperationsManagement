/**
 * 患者端手机预览外壳（公共组件）
 * 外观统一对齐「机构管理 - 机构详情」患者端预览：328 × 620、圆角 + 阴影、模拟状态栏、导航栏、
 * 可滚动屏幕区、可选底部固定操作栏。各业务页面只需提供屏幕内容（children）与底部操作（footer）。
 */
import type { ReactNode } from 'react'
import './index.less'

export interface PhonePreviewProps {
  /** 导航栏标题 */
  title: ReactNode
  /** 导航栏左侧内容，默认返回箭头「‹」 */
  back?: ReactNode
  /** 导航栏右侧内容，默认「···」 */
  extra?: ReactNode
  /** 是否展示模拟状态栏（9:41 + 灵动岛），默认展示 */
  statusBar?: boolean
  /** 底部固定操作栏（不随屏幕内容滚动） */
  footer?: ReactNode
  /** 外层附加类名（页面内做局部调整用） */
  className?: string
  /** 屏幕内容 */
  children?: ReactNode
}

export default function PhonePreview({
  title,
  back,
  extra,
  statusBar = true,
  footer,
  className,
  children,
}: PhonePreviewProps) {
  return (
    <div className={`phone-frame${className ? ` ${className}` : ''}`}>
      {statusBar && (
        <div className="phone-frame__status">
          <span>9:41</span>
          <i />
        </div>
      )}
      <div className="phone-frame__nav">
        <span className="phone-frame__back">{back ?? '‹'}</span>
        <strong>{title}</strong>
        <span className="phone-frame__extra">{extra ?? '···'}</span>
      </div>
      <div className="phone-frame__scroll">{children}</div>
      {footer ? <div className="phone-frame__footer">{footer}</div> : null}
    </div>
  )
}
