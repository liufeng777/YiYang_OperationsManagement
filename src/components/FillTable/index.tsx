/**
 * 填充型表格（FillTable）
 * 用于固定高度页面（PageContainer fixed + list-card--fill）：
 * 自动测量容器剩余高度并注入 Table scroll.y —— 表头固定、表格体内部滚动、分页固定在卡片底部。
 * 用法与 antd Table 完全一致（泛型与 props 原样透传，外部传入的 scroll 其余配置保留）。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { Table } from 'antd'
import type { TableProps } from 'antd'

/** 表头兜底高度（antd small 表头 ≈39px；首次渲染元素未挂载时使用） */
const HEADER_FALLBACK = 39

export default function FillTable<RecordType extends object>(props: TableProps<RecordType>) {
  const { pagination } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      // 固定表头渲染后优先测 .ant-table-header 包装层（offsetHeight 含边框，最精确）；
      // 未渲染固定表头时退化到 thead；再退化为兜底值
      const headerHeight =
        el.querySelector<HTMLElement>('.ant-table-header')?.offsetHeight ??
        el.querySelector<HTMLElement>('.ant-table-thead')?.offsetHeight ??
        HEADER_FALLBACK
      // 分页可能在数据返回后才渲染，按配置给兜底；数据就绪后 MutationObserver 会触发重算
      const paginationHeight =
        pagination === false
          ? 0
          : (el.querySelector('.ant-pagination')?.clientHeight ?? 32) + 16
      const next = el.clientHeight - headerHeight - paginationHeight
      // 不设置最低高度下限：可用空间不足时必须按实际值注入，
      // 否则表格总高（表头 + scroll.y）会溢出卡片被 overflow:hidden 裁切
      setScrollY(Math.max(next, 0))
    }
    compute()
    const resizeObserver = new ResizeObserver(compute)
    resizeObserver.observe(el)
    const mutationObserver = new MutationObserver(compute)
    mutationObserver.observe(el, { childList: true, subtree: true })
    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [pagination])

  return (
    <div ref={containerRef} className="fill-table">
      <Table<RecordType> {...props} scroll={{ y: scrollY, ...props.scroll }} />
    </div>
  )
}
