/**
 * 图文详情渲染（患者端手机预览共用，只读）
 * - value 为 RichTextEditor 产出的 ProseMirror JSON 字符串；兼容历史 HTML 字符串
 * - 使用与编辑器一致的扩展集合经 generateHTML 生成 HTML，保证预览与编辑所见一致
 * - 内容为运营侧自产富文本，经 dangerouslySetInnerHTML 渲染（不接收外部用户输入）
 */
import { useMemo } from 'react'
import { generateHTML } from '@tiptap/core'
import type { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import './index.less'

/** 与 RichTextEditor 保持一致的扩展集合 */
const extensions = [
  StarterKit.configure({ link: { openOnClick: false } }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: false }),
  Image,
]

interface RichDetailPreviewProps {
  /** ProseMirror JSON 字符串（或历史 HTML 字符串） */
  value?: string
  className?: string
}

/**
 * JSON 字符串 → HTML：
 * - 合法 doc JSON 经 generateHTML 渲染；扩展不支持的节点被忽略时回退为空
 * - 非 JSON 按历史 HTML 字符串原样返回
 */
function toHtml(raw?: string): string {
  if (!raw) return ''
  try {
    const doc = JSON.parse(raw) as JSONContent
    if (doc?.type !== 'doc') return ''
    try {
      return generateHTML(doc, extensions)
    } catch {
      return ''
    }
  } catch {
    return raw
  }
}

/** 判断内容是否为空（空文档 / 仅空段落） */
export function isRichDetailEmpty(raw?: string): boolean {
  const html = toHtml(raw)
  if (!html) return true
  return !html.replace(/<[^>]*>/g, '').trim() && !html.includes('<img')
}

export default function RichDetailPreview({ value, className }: RichDetailPreviewProps) {
  const html = useMemo(() => toHtml(value), [value])
  if (!html) return null
  return (
    <div
      className={`rich-detail-preview${className ? ` ${className}` : ''}`}
      // 富文本由运营在后台编辑器自产，非外部用户输入
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
