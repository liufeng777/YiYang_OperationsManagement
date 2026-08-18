/**
 * 内容配置 - 新建 / 编辑科普内容
 * 视觉对齐设计稿：左侧基础信息 + 图文正文编辑器，右侧发布设置 + 患者端实时预览
 * 当前为 mock 数据，后端就绪后替换为 contentApi.saveArticle
 */
import { useState } from 'react'
import { App, Button, Card, Input, Select, Switch } from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  MenuOutlined,
  OrderedListOutlined,
  PictureOutlined,
  PlusOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import './article-edit.less'

export default function ArticleEdit() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const params = useParams<{ id: string }>()
  const isEdit = !!params.id && params.id !== 'new'

  const [title, setTitle] = useState(isEdit ? '秋季心脑血管养护：长者要注意这5件事' : '')
  const [summary, setSummary] = useState('')
  const [recommended, setRecommended] = useState(true)

  const displayTitle = title || '秋季心脑血管养护：长者要注意这5件事'

  return (
    <PageContainer
      title={isEdit ? '编辑科普内容' : '新建科普内容'}
      description="编辑健康科普文章并预览患者端展示效果"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            message.success(isEdit ? '内容已保存并发布（mock）' : '内容已发布（mock）')
            navigate('/content/article')
          }}
        >
          保存并发布
        </Button>
      }
    >
      <div className="article-edit">
        <div className="article-edit__form">
          <Card variant="borderless" className="edit-card">
            <div className="edit-card__header">
              <h3>基础信息</h3>
              <span>用于患者端列表与详情展示</span>
            </div>
            <div className="edit-field">
              <label>
                文章标题 <i>*</i>
              </label>
              <Input
                placeholder="请输入科普文章标题，建议不超过30字"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="edit-field__row">
              <div className="edit-field">
                <label>
                  内容分类 <i>*</i>
                </label>
                <Select
                  defaultValue="健康科普"
                  options={[
                    { label: '健康科普', value: '健康科普' },
                    { label: '慢病管理', value: '慢病管理' },
                    { label: '居家照护', value: '居家照护' },
                    { label: '照护指南', value: '照护指南' },
                    { label: '季节养生', value: '季节养生' },
                  ]}
                />
              </div>
              <div className="edit-field">
                <label>
                  内容来源 <i>*</i>
                </label>
                <Input defaultValue="幸福颐养护理部" />
              </div>
              <div className="edit-field">
                <label>
                  作者 <i>*</i>
                </label>
                <Input placeholder="请输入作者" />
              </div>
              <div className="edit-field">
                <label>
                  列表封面 <i>*</i>
                </label>
                <Button className="edit-upload-btn" onClick={() => message.info('封面上传开发中')}>
                  上传封面
                </Button>
              </div>
            </div>
            <div className="edit-field">
              <label>
                内容摘要 <i>*</i>
              </label>
              <Input.TextArea
                rows={2}
                placeholder="请输入摘要，将展示在患者端分享卡片中"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </div>
          </Card>

          <Card variant="borderless" className="edit-card">
            <div className="edit-card__header">
              <h3>图文正文</h3>
              <span>支持文字、图片与小标题混排</span>
            </div>
            <div className="editor-toolbar">
              <Button size="small" type="text">正文</Button>
              <Button size="small" type="text" icon={<BoldOutlined />} />
              <Button size="small" type="text">H2</Button>
              <Button size="small" type="text" icon={<MenuOutlined />} />
              <Button size="small" type="text" icon={<OrderedListOutlined />} />
              <Button size="small" type="text" icon={<PictureOutlined />} onClick={() => message.info('插入图片开发中')} />
              <Button size="small" type="text" icon={<ItalicOutlined />} />
              <Button size="small" type="text" icon={<UndoOutlined />} />
              <Button size="small" type="text" icon={<RedoOutlined />} />
            </div>
            <div className="editor-body">
              <h4>{displayTitle}</h4>
              <p>
                进入秋季后，昼夜温差增大，心脑血管疾病容易出现波动。长者及家属可以从日常监测、饮食和活动三个方面做好预防。
              </p>
              <h5>一、坚持记录血压变化</h5>
              <button
                type="button"
                className="editor-image-upload"
                onClick={() => message.info('正文图片上传开发中')}
              >
                <PlusOutlined /> 点击上传护理示意图片
              </button>
              <p>
                建议每天固定时间测量并记录，如出现持续异常或伴随胸闷、头晕等症状，应及时联系医护人员。
              </p>
            </div>
          </Card>
        </div>

        <div className="article-edit__side">
          <Card variant="borderless" className="edit-card">
            <div className="edit-card__header">
              <h3>发布设置</h3>
            </div>
            <div className="publish-row">
              <span>推荐到患者端首页</span>
              <Switch checked={recommended} onChange={setRecommended} />
            </div>
            <div className="publish-row">
              <span>发布时间</span>
              <Select
                defaultValue="now"
                options={[
                  { label: '立即发布', value: 'now' },
                  { label: '定时发布', value: 'scheduled' },
                ]}
              />
            </div>
            <p className="publish-note">保存草稿不会同步到患者端</p>
            <div className="publish-actions">
              <Button onClick={() => message.success('草稿已保存（mock）')}>保存草稿</Button>
            </div>
          </Card>

          <Card variant="borderless" className="edit-card">
            <div className="edit-card__header">
              <h3>患者端实时预览</h3>
              <Button type="link" size="small" onClick={() => message.success('预览已刷新')}>
                刷新预览
              </Button>
            </div>
            <div className="article-phone">
              <div className="article-phone__bar">
                <span>9:41</span>
                <span>•••</span>
              </div>
              <div className="article-phone__nav">
                <span>‹</span>
                <strong>健康科普</strong>
                <span>•••</span>
              </div>
              <div className="article-phone__body">
                <h4>{displayTitle}</h4>
                <p className="article-phone__meta">幸福颐养护理部 · 2026-08-10</p>
                <div className="article-phone__cover">
                  <strong>安心入秋</strong>
                  <span>长者心脑血管日常养护指南</span>
                </div>
                <p>
                  进入秋季后，昼夜温差增大，心脑血管疾病容易出现波动。长者及家属可以从日常监测、饮食和活动三个方面做好预防。
                </p>
                <h5>一、坚持记录血压变化</h5>
                <p>
                  建议每天固定时间测量并记录。如出现持续异常或伴随胸闷、头晕等症状，应及时联系医护人员。
                </p>
                <div className="article-phone__tip">
                  <strong>温馨提示</strong>
                  <span>本文仅用于健康科普，不能替代专业诊疗。</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
