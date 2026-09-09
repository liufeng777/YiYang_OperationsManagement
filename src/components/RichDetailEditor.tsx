/**
 * 富文本图文详情编辑（Drawer 编辑 + 只读入口展示）
 * - 存储为 ProseMirror JSON 字符串（同服务图文详情），不限制 HTML
 * - 由受控组件使用者持有 value(onChange)，适合纳入表单 / mock 提交
 */
import { useMemo, useState } from 'react'
import { Button, Drawer } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import type { JSONContent } from '@/components/RichTextEditor'
import RichTextEditor from '@/components/RichTextEditor'
import './RichDetailEditor.less'

interface RichDetailEditorProps {
  /** 字段展示标签 */
  label?: string
  /** 当前值：ProseMirror JSON 字符串 */
  value?: string
  onChange?: (json: string) => void
  /** 富文本区域最小高度 */
  minHeight?: number
}

/** 内容概况：是否已填 + 内容块数 */
function contentMeta(value?: string): { filled: boolean; blocks: number } {
  if (!value) return { filled: false, blocks: 0 }
  try {
    const doc = JSON.parse(value) as { content?: JSONContent['content'] }
    return { filled: true, blocks: doc.content?.length ?? 0 }
  } catch {
    return { filled: true, blocks: 0 }
  }
}

/** JSON 字符串 → 编辑器初始化值（非 JSON 时按原样作为 HTML 回退） */
function toSeed(raw?: string): string | JSONContent {
  if (!raw) return ''
  try {
    return JSON.parse(raw) as JSONContent
  } catch {
    return raw
  }
}

export default function RichDetailEditor({
  label = '图文详情',
  value = '',
  onChange,
  minHeight = 400,
}: RichDetailEditorProps) {
  const [open, setOpen] = useState(false)
  // 打开瞬间才从 value 同步一次草稿（编辑器只在首次挂载读 value）
  const [draft, setDraft] = useState('')

  const meta = useMemo(() => contentMeta(value), [value])

  const openEditor = () => {
    setDraft(value)
    setOpen(true)
  }

  const handleSave = () => {
    onChange?.(draft)
    setOpen(false)
  }

  return (
    <div className="rich-detail-field">
      <span className="rich-detail-field__label">
        {label}
      </span>
      <div className="rich-detail-field__entry">
        <Button icon={<EditOutlined />} color="primary" variant="outlined" onClick={openEditor}>
          编辑图文详情
        </Button>
        <p className="rich-detail-field__status">
          {meta.filled
            ? '已使用富文本编排详情内容，可再次编辑精细排版。'
            : '尚未填写。点击「编辑图文详情」，用富文本编排图文内容（含图片），完成后随表单保存。'}
        </p>
      </div>
      <Drawer
        open={open}
        title={`${label}编辑`}
        width={860}
        onClose={() => setOpen(false)}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </div>
        }
      >
        <RichTextEditor
          value={toSeed(draft)}
          minHeight={minHeight}
          onChange={(_, json) => setDraft(JSON.stringify(json))}
        />
      </Drawer>
    </div>
  )
}
