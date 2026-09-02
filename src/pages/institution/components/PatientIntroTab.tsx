/**
 * 机构详情 - 患者端介绍 Tab
 * 患者端介绍表单 + 患者端实时预览（机构信息由平台直接维护，无「同步」概念）
 * 当前为 mock 数据，后端就绪后替换为 institutionApi 对应接口
 * 注：父级通过 key={detail.id} 重挂载本组件以切换机构时重置表单
 */
import { useState } from 'react'
import { App, Button, Card, Input, Switch, Tag, Upload } from 'antd'
import { PhoneOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { InstitutionDetail } from '@/api/modules/institution'

interface PatientIntroTabProps {
  detail: InstitutionDetail
}

/** 预览环境照片占位（mock） */
const previewPhotoPlaceholders = ['接待大厅', '康复空间', '适老房间']

export default function PatientIntroTab({ detail }: PatientIntroTabProps) {
  const { message } = App.useApp()

  const [introTitle, setIntroTitle] = useState(detail.brief)
  const [introDesc, setIntroDesc] = useState(detail.description)
  const [introTags, setIntroTags] = useState<string[]>(detail.introTags)
  const [introVisible, setIntroVisible] = useState(detail.introVisible)
  const [introCover, setIntroCover] = useState<string | null>(detail.introCover ?? null)
  const [envPhotos, setEnvPhotos] = useState<string[]>([])

  /** 本地图片选择：拦截真实上传，生成预览地址（接后端后替换为上传接口） */
  const pickCover = (file: File) => {
    setIntroCover(URL.createObjectURL(file))
    message.success('机构封面已上传（本地预览）')
    return false
  }

  const pickEnvPhoto = (file: File) => {
    setEnvPhotos((prev) => (prev.length >= 8 ? prev : [...prev, URL.createObjectURL(file)]))
    message.success('环境照片已添加（本地预览）')
    return false
  }

  return (
    <div className="patient-intro">
      <div className="patient-intro__left">
        <Card variant="borderless" className="detail-card">
          <div className="detail-card__header">
            <h3>患者端介绍</h3>
            <div className="patient-visible">
              <span>患者端展示</span>
              <Switch checked={introVisible} onChange={setIntroVisible} />
            </div>
          </div>
          <div className="intro-form">
            <label>
              <span>
                <span className='require-star'>*</span> 患者端展示标题
              </span>
              <Input value={introTitle} onChange={(event) => setIntroTitle(event.target.value)} />
            </label>
            <label>
              <span>机构介绍</span>
              <Input.TextArea rows={4} value={introDesc} onChange={(event) => setIntroDesc(event.target.value)} />
            </label>
            {/* <div className="intro-tags">
              <span>特色标签（最多4个）</span>
              <div className='intro-tags-list'>
                {introTags.map((tag) => (
                  <Tag key={tag} closable onClose={() => setIntroTags((prev) => prev.filter((item) => item !== tag))}>
                    {tag}
                  </Tag>
                ))}
                {introTags.length < 4 && (
                  <Tag className="intro-tags__add" onClick={() => setIntroTags((prev) => [...prev, `特色标签${prev.length + 1}`])}>
                    + 添加标签
                  </Tag>
                )}
              </div>
            </div> */}
              <label>
                <span>机构封面图片</span>
                <div className="intro-photos">
                  <Upload accept="image/*" showUploadList={false} beforeUpload={pickCover}>
                    <div className={`intro-photos__item intro-photos__item--cover${introCover ? ' has-image' : ''}`}>
                      {introCover ? (
                        <img src={introCover} alt="机构封面" />
                      ) : (
                        <>
                          <PlusOutlined />
                          <span>上传机构封面</span>
                        </>
                      )}
                    </div>
                  </Upload>
                </div>
              </label>
              <label>
                <span>机构环境图片</span>
                <div className="intro-photos">
                  {envPhotos.map((url, index) => (
                    <div className="intro-photos__item has-image" key={url}>
                      <img src={url} alt={`环境照片 ${index + 1}`} />
                    </div>
                  ))}
                  {envPhotos.length < 8 && (
                    <Upload accept="image/*" showUploadList={false} multiple beforeUpload={pickEnvPhoto}>
                      <div className="intro-photos__item">
                        <PlusOutlined />
                        <span>添加环境照片</span>
                      </div>
                    </Upload>
                  )}
                </div>
              </label>
            <p className="intro-photos__tip">建议封面尺寸 750×420；环境相册用于患者端了解机构环境与设施。</p>
          </div>
        </Card>
      </div>

      <Card variant="borderless" className="detail-card patient-preview">
        <div className="detail-card__header detail-card__header--compact">
          <h3>患者端实时预览</h3>
          <Button type="link" style={{fontSize: 12, height: 24}} icon={<ReloadOutlined />} onClick={() => message.success('预览已刷新')}>
            刷新预览
          </Button>
        </div>
        <div className="phone">
          <div className="phone__status">
            <span>9:41</span>
            <i />
          </div>
          <div className="phone__nav">
            <span>‹</span>
            <strong>机构详情</strong>
            <span>···</span>
          </div>
          <div className="phone__hero">
            <h4>{detail.name}</h4>
            <p>专业照护 · 安心颐养</p>
            <span>{detail.address}</span>
          </div>
          <div className="phone__body">
            <h4>{introTitle || detail.name}</h4>
            <div className="phone__tags">
              {introTags.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <p>{introDesc}</p>
            <div className="phone__section">
              <div>
                <strong>机构环境</strong>
                <span>查看全部 9 张 ›</span>
              </div>
              <div className="phone__photos">
                {previewPhotoPlaceholders.map((item) => (
                  <i key={item}>{item}</i>
                ))}
              </div>
            </div>
            <div className="phone__tabs">
              <span>机构介绍</span>
              <span>服务项目</span>
              <span>近期活动</span>
            </div>
          </div>
          <div className="phone__cta">
            <Button type="primary" icon={<PhoneOutlined />} block>
              电话咨询
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
