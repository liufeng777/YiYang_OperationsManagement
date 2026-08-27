/**
 * 可拖拽排序的图片网格（原生 HTML5 DnD + antd Upload，无第三方拖拽依赖）
 * 用于活动详情图、服务详情图等患者端图片编排场景，保持全站交互一致：
 * - 拖动排序：整卡可拖，拖起半透明、落点品牌色描边
 * - 操作按钮（拖动 / 替换 / 删除）图标化悬浮在图片底部，半透明深色背景
 * - 添加 / 替换通过 antd Upload 选择本地图片，URL.createObjectURL 本地预览
 *   （beforeUpload 返回 false 拦截真实上传，接入后端后替换为上传接口）
 */
import { useState } from 'react'
import { App, Tooltip, Upload } from 'antd'
import { DeleteOutlined, DragOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import './index.less'

export interface SortableImage {
  id: string
  title: string
  size?: string
  /** 本地预览地址（URL.createObjectURL）；有值时缩略区直接展示图片 */
  url?: string
  /** 缩略区色调（无图片时的占位底色）：green 品牌浅底 / blue 信息浅底 / warm 暖色浅底 */
  tone?: 'green' | 'blue' | 'warm'
}

interface ImageSortGridProps {
  images: SortableImage[]
  onChange: (images: SortableImage[]) => void
  /** 末尾是否显示「添加图片」虚线块（默认显示） */
  addable?: boolean
  addText?: string
  /** fluid：均分容器宽度；fixed：固定 132px 宽小图块，flex 换行（与封面同尺寸场景） */
  variant?: 'fluid' | 'fixed'
}

/** 本地图片选择统一样式：拦截上传、生成预览地址 */
const uploadProps = {
  accept: 'image/*',
  showUploadList: false,
}

export default function ImageSortGrid({
  images,
  onChange,
  addable = true,
  addText = '添加图片',
  variant = 'fluid',
}: ImageSortGridProps) {
  const { message } = App.useApp()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const resetDrag = () => {
    setDragId(null)
    setDragOverId(null)
  }

  const handleDrop = (targetId: string) => {
    if (dragId && dragId !== targetId) {
      const from = images.findIndex((item) => item.id === dragId)
      const to = images.findIndex((item) => item.id === targetId)
      if (from >= 0 && to >= 0) {
        const next = [...images]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        onChange(next)
      }
    }
    resetDrag()
  }

  const handleRemove = (image: SortableImage) => {
    onChange(images.filter((item) => item.id !== image.id))
    message.success('已删除图片')
  }

  /** 添加：支持多选，逐个追加到末尾 */
  const handleAddFile = (file: File) => {
    const image: SortableImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: file.name.replace(/\.[^.]+$/, ''),
      url: URL.createObjectURL(file),
    }
    onChange([...images, image])
    message.success('已添加图片')
    return false
  }

  /** 替换：保留 id 与位置，更新图片与标题 */
  const handleReplaceFile = (target: SortableImage, file: File) => {
    onChange(
      images.map((item) =>
        item.id === target.id
          ? { ...item, title: file.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(file) }
          : item,
      ),
    )
    message.success('已替换图片')
    return false
  }

  return (
    <div className={`image-sort-grid image-sort-grid--${variant}`}>
      {images.map((image) => (
        <div
          key={image.id}
          className={[
            'image-sort-grid__tile',
            dragId === image.id ? 'is-dragging' : '',
            dragOverId === image.id && dragId !== image.id ? 'is-over' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          draggable
          onDragStart={() => setDragId(image.id)}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOverId(image.id)
          }}
          onDragLeave={() => setDragOverId((prev) => (prev === image.id ? null : prev))}
          onDrop={(event) => {
            event.preventDefault()
            handleDrop(image.id)
          }}
          onDragEnd={resetDrag}
        >
          <div className={`image-sort-grid__thumb image-sort-grid__thumb--${image.tone ?? 'green'}`}>
            {image.url ? (
              <img src={image.url} alt={image.title} />
            ) : (
              <>
                <span>{image.title}</span>
                {image.size && <em>{image.size}</em>}
              </>
            )}
          </div>
          <div className="image-sort-grid__actions">
            <Tooltip title="拖动排序">
              <button type="button" aria-label="拖动排序">
                <DragOutlined />
              </button>
            </Tooltip>
            <Tooltip title="替换">
              <Upload {...uploadProps} beforeUpload={(file) => handleReplaceFile(image, file)}>
                <button type="button" aria-label="替换">
                  <ReloadOutlined />
                </button>
              </Upload>
            </Tooltip>
            <Tooltip title="删除">
              <button type="button" aria-label="删除" onClick={() => handleRemove(image)}>
                <DeleteOutlined />
              </button>
            </Tooltip>
          </div>
        </div>
      ))}
      {addable && (
        <Upload {...uploadProps} multiple beforeUpload={handleAddFile}>
          <button type="button" className="image-sort-grid__add">
            <PlusOutlined />
            {addText}
          </button>
        </Upload>
      )}
    </div>
  )
}
