/**
 * 富文本编辑器 Demo（不进菜单，路由：/system/rich-text-demo）
 * - 预置一份 ProseMirror JSON 作为初始内容
 * - 编辑时下方实时展示 JSON 与 HTML 输出
 * - JSON 即后期存入后端、下发给微信小程序渲染的数据结构
 */
import { useState } from 'react'
import { Card } from 'antd'
import PageContainer from '@/components/PageContainer'
import RichTextEditor from '@/components/RichTextEditor'
import type { JSONContent } from '@/components/RichTextEditor'
import './index.less'

/** 示例数据：上门助浴服务的患者端详情（ProseMirror JSON） */
const demoJSON: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '服务包含项目' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: '全身温水擦浴或淋浴助浴（约 ' },
                { type: 'text', marks: [{ type: 'bold' }], text: '60 分钟' },
                { type: 'text', text: '）' },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '浴前生命体征测量与风险评估' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '浴后皮肤护理与居室整理' }],
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '服务流程' }],
    },
    {
      type: 'orderedList',
      attrs: { start: 1 },
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '护理员上门，核对身份并评估环境安全' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '调节水温与室温，协助老人安全入浴' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: '全程陪护助浴，' },
                { type: 'text', marks: [{ type: 'italic' }], text: '注意观察面色与呼吸' },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '以下图片通过上传接口插入，url 直接存入 JSON：' }],
    },
    {
      type: 'image',
      attrs: { src: 'https://picsum.photos/seed/bath/750/400', alt: '服务场景示例' },
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#f45b4f' } }],
          text: '注意事项：',
        },
        { type: 'text', text: '餐后 1 小时内、血压异常时暂缓助浴，详情请咨询客服。' },
      ],
    },
  ],
}

export default function RichTextDemoPage() {
  const [json, setJson] = useState<JSONContent>(demoJSON)
  const [html, setHtml] = useState('')

  return (
    <PageContainer title="富文本编辑器 Demo" description="ProseMirror JSON · 实时预览数据结构">
      <div className="rich-demo">
        <Card variant="borderless" className="rich-demo__card">
          <div className="rich-demo__card-header">
            <h3>编辑器</h3>
            <span>工具栏支持标题、列表、加粗斜体、链接与图片上传</span>
          </div>
          <RichTextEditor
            value={demoJSON}
            minHeight={360}
            onChange={(nextHtml, nextJson) => {
              setHtml(nextHtml)
              setJson(nextJson)
            }}
          />
        </Card>

        <Card variant="borderless" className="rich-demo__card">
          <div className="rich-demo__card-header">
            <h3>JSON 数据</h3>
            <span>存入后端 / 下发小程序的结构</span>
          </div>
          <pre className="rich-demo__output">{JSON.stringify(json, null, 2)}</pre>
        </Card>

        <Card variant="borderless" className="rich-demo__card">
          <div className="rich-demo__card-header">
            <h3>HTML 输出</h3>
            <span>可直接对接小程序 rich-text 组件</span>
          </div>
          <pre className="rich-demo__output">{html || '（编辑任意内容后实时更新）'}</pre>
        </Card>
      </div>
    </PageContainer>
  )
}
