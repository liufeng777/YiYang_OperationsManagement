/**
 * 富文本编辑器（基于 Tiptap v3）
 * - 受控组件：value 为初始 HTML，onChange 回传 HTML
 * - 工具栏支持：正文 / H2 / 加粗 / 斜体 / 无序·有序列表 / 链接 / 撤销·重做
 */
import { useRef, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { App, Button, Tooltip } from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  MenuOutlined,
  OrderedListOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import './RichTextEditor.less'

interface RichTextEditorProps {
  /** 初始 HTML 内容（仅首次挂载时生效） */
  value?: string
  onChange?: (html: string) => void
  /** 编辑区最小高度（px） */
  minHeight?: number
}

interface ToolbarItem {
  key: string
  type: 'text' | 'icon'
  label?: string
  icon?: ReactNode
  hint?: string
  run: () => void
  active?: () => boolean
}

const EMPTY_HTML = '<p><br></p>'

export default function RichTextEditor({ value, onChange, minHeight = 320 }: RichTextEditorProps) {
  const { message } = App.useApp()
  const initialContentRef = useRef<string>(value && value.trim() ? value : EMPTY_HTML)

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: initialContentRef.current,
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML()),
  })

  /** 插入 / 更新链接 */
  const handleLink = () => {
    if (!editor) return
    const url = window.prompt('请输入链接地址', 'https://')
    if (url === null) return
    if (!url || url === 'https://') {
      message.warning('请输入有效的链接地址')
      return
    }
    editor.chain().focus().setLink({ href: url }).run()
  }

  const items: ToolbarItem[] = [
    {
      key: 'paragraph',
      type: 'text',
      label: '正文',
      run: () => editor?.chain().focus().setParagraph().run(),
      active: () => editor?.isActive('paragraph') ?? false,
    },
    {
      key: 'heading',
      type: 'text',
      label: 'H2',
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      active: () => editor?.isActive('heading', { level: 2 }) ?? false,
    },
    {
      key: 'bold',
      type: 'icon',
      icon: <BoldOutlined />,
      hint: '加粗',
      run: () => editor?.chain().focus().toggleBold().run(),
      active: () => editor?.isActive('bold') ?? false,
    },
    {
      key: 'italic',
      type: 'icon',
      icon: <ItalicOutlined />,
      hint: '斜体',
      run: () => editor?.chain().focus().toggleItalic().run(),
      active: () => editor?.isActive('italic') ?? false,
    },
    {
      key: 'bulletList',
      type: 'icon',
      icon: <MenuOutlined />,
      hint: '无序列表',
      run: () => editor?.chain().focus().toggleBulletList().run(),
      active: () => editor?.isActive('bulletList') ?? false,
    },
    {
      key: 'orderedList',
      type: 'icon',
      icon: <OrderedListOutlined />,
      hint: '有序列表',
      run: () => editor?.chain().focus().toggleOrderedList().run(),
      active: () => editor?.isActive('orderedList') ?? false,
    },
    {
      key: 'link',
      type: 'icon',
      icon: <LinkOutlined />,
      hint: '链接',
      run: handleLink,
      active: () => editor?.isActive('link') ?? false,
    },
    {
      key: 'undo',
      type: 'icon',
      icon: <UndoOutlined />,
      hint: '撤销',
      run: () => editor?.chain().focus().undo().run(),
    },
    {
      key: 'redo',
      type: 'icon',
      icon: <RedoOutlined />,
      hint: '重做',
      run: () => editor?.chain().focus().redo().run(),
    },
  ]

  const renderButton = (item: ToolbarItem) => {
    const btn = (
      <Button
        size="small"
        type="text"
        icon={item.type === 'icon' ? item.icon : undefined}
        disabled={!editor}
        className={item.active?.() ? 'is-active' : undefined}
        onClick={editor ? () => item.run() : undefined}
      >
        {item.type === 'text' ? item.label : null}
      </Button>
    )
    return item.hint ? (
      <Tooltip key={item.key} title={item.hint}>
        {btn}
      </Tooltip>
    ) : (
      <span key={item.key}>{btn}</span>
    )
  }

  return (
    <div className="rt-editor">
      <div className="rt-editor__toolbar">{items.map(renderButton)}</div>
      <EditorContent editor={editor} className="rt-editor__content" style={{ minHeight }} />
    </div>
  )
}
