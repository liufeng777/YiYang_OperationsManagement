/**
 * 富文本编辑器公共组件（基于 Tiptap v3 / ProseMirror）
 *
 * 数据格式：
 * - value 支持 HTML 字符串或 ProseMirror JSON（仅首次挂载时生效，编辑过程不回写，避免光标跳动）
 * - onChange 同时回传 HTML 与 JSON，业务方按需取用；
 *   JSON 可被 schema 校验，适合跨端（微信小程序 rich-text / 自研渲染器）渲染存储
 *
 * 工具栏：正文 / H2 / H3 / 加粗 / 斜体 / 下划线 / 删除线 / 文字颜色 / 高亮 /
 *         无序·有序列表 / 链接 / 插入图片 / 清除格式 / 撤销·重做
 * 图片：选择后立即本地预览，后台调用共通上传接口（POST /upload），成功后替换为服务器 url
 */
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { App, Button, Popover, Tooltip, Upload } from 'antd'
import {
  BoldOutlined,
  ClearOutlined,
  FontColorsOutlined,
  HighlightOutlined,
  ItalicOutlined,
  LinkOutlined,
  MenuOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { uploadApi } from '@/api'
import './RichTextEditor.less'

export type { JSONContent }

interface RichTextEditorProps {
  /** 初始内容：HTML 字符串或 ProseMirror JSON（仅首次挂载时生效） */
  value?: string | JSONContent | null
  /** 内容变化回调：同时回传 HTML 与 JSON */
  onChange?: (html: string, json: JSONContent) => void
  /** 编辑区最小高度（px） */
  minHeight?: number
  /** 是否展示「插入图片」按钮，默认 true */
  enableImage?: boolean
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

/** 预设文字颜色（对齐 variables.less 设计变量） */
const PRESET_COLORS = [
  '#1f2d2a', // @color-text-primary
  '#66736f', // @color-text-secondary
  '#27866b', // @color-primary
  '#3478f6', // @color-info
  '#f3b56a', // @color-warning
  '#f45b4f', // @color-danger
]

/** 判断初始内容是否为 ProseMirror JSON */
const isJSONContent = (v: RichTextEditorProps['value']): v is JSONContent =>
  typeof v === 'object' && v !== null && (v as JSONContent).type === 'doc'

export default function RichTextEditor({
  value,
  onChange,
  minHeight = 320,
  enableImage = true,
}: RichTextEditorProps) {
  const { message } = App.useApp()
  const [colorOpen, setColorOpen] = useState(false)
  const initialContentRef = useRef<string | JSONContent>(
    isJSONContent(value) ? value : value && value.trim() ? value : EMPTY_HTML,
  )

  const editor = useEditor({
    extensions: [
      // StarterKit v3 已内置 Link / Underline，在此统一配置，避免重复注册
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      Image,
    ],
    content: initialContentRef.current,
    // 工具栏高亮依赖事务后重渲染
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML(), e.getJSON()),
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

  /**
   * 插入图片：先以本地 objectURL 即时预览，后台走共通上传接口，
   * 成功后遍历文档把该图片节点替换为服务器 url（存入 JSON 的最终值）
   */
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return false
      const localUrl = URL.createObjectURL(file)
      editor.chain().focus().setImage({ src: localUrl }).run()
      try {
        const result = await uploadApi.uploadFile(file)
        const { state, view } = editor
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === localUrl) {
            view.dispatch(
              state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: result.url }),
            )
            return false
          }
          return true
        })
        URL.revokeObjectURL(localUrl)
      } catch {
        // 后端暂不可用：保留本地预览，接入文件服务器后此处即为正式逻辑
        message.warning('上传接口暂不可用，图片以本地预览展示')
      }
      return false
    },
    [editor, message],
  )

  /** 设置文字颜色 */
  const applyColor = (color: string | null) => {
    if (!editor) return
    if (color) {
      editor.chain().focus().setColor(color).run()
    } else {
      editor.chain().focus().unsetColor().run()
    }
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
      key: 'heading2',
      type: 'text',
      label: 'H2',
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      active: () => editor?.isActive('heading', { level: 2 }) ?? false,
    },
    {
      key: 'heading3',
      type: 'text',
      label: 'H3',
      run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
      active: () => editor?.isActive('heading', { level: 3 }) ?? false,
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
      key: 'underline',
      type: 'icon',
      icon: <UnderlineOutlined />,
      hint: '下划线',
      run: () => editor?.chain().focus().toggleUnderline().run(),
      active: () => editor?.isActive('underline') ?? false,
    },
    {
      key: 'strike',
      type: 'icon',
      icon: <StrikethroughOutlined />,
      hint: '删除线',
      run: () => editor?.chain().focus().toggleStrike().run(),
      active: () => editor?.isActive('strike') ?? false,
    },
    {
      key: 'highlight',
      type: 'icon',
      icon: <HighlightOutlined />,
      hint: '高亮',
      run: () => editor?.chain().focus().toggleHighlight().run(),
      active: () => editor?.isActive('highlight') ?? false,
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
      key: 'clear',
      type: 'icon',
      icon: <ClearOutlined />,
      hint: '清除格式',
      run: () => editor?.chain().focus().unsetAllMarks().clearNodes().run(),
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

  /** 文字颜色选择面板 */
  const colorPanel = (
    <div className="rt-editor__color-panel">
      <div className="rt-editor__color-swatches">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="rt-editor__color-swatch"
            style={{ background: c }}
            onClick={() => {
              applyColor(c)
              setColorOpen(false)
            }}
          />
        ))}
      </div>
      <div className="rt-editor__color-actions">
        <input
          type="color"
          defaultValue="#1f2d2a"
          onChange={(e) => applyColor(e.target.value)}
          title="自定义颜色"
        />
        <Button
          size="small"
          type="link"
          onClick={() => {
            applyColor(null)
            setColorOpen(false)
          }}
        >
          清除颜色
        </Button>
      </div>
    </div>
  )

  return (
    <div className="rt-editor">
      <div className="rt-editor__toolbar">
        {items.slice(0, 8).map(renderButton)}
        <Popover
          content={colorPanel}
          trigger="click"
          placement="bottomLeft"
          open={colorOpen}
          onOpenChange={setColorOpen}
        >
          <Tooltip title="文字颜色">
            <Button size="small" type="text" icon={<FontColorsOutlined />} disabled={!editor} />
          </Tooltip>
        </Popover>
        {items.slice(8).map(renderButton)}
        {enableImage && (
          <Upload accept="image/*" showUploadList={false} beforeUpload={handleImageUpload}>
            <Tooltip title="插入图片">
              <Button size="small" type="text" icon={<PictureOutlined />} disabled={!editor} />
            </Tooltip>
          </Upload>
        )}
      </div>
      <EditorContent editor={editor} className="rt-editor__content" style={{ minHeight }} />
    </div>
  )
}
