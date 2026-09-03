/**
 * 机构详情 - 患者端介绍 Tab
 * 患者端介绍表单 + 患者端实时预览（机构信息由平台直接维护，无「同步」概念）
 * 当前为 mock 数据，后端就绪后替换为 institutionApi 对应接口
 * 注：父级通过 key={detail.id} 重挂载本组件以切换机构时重置表单
 */
import { useState } from 'react'
import { App, Button, Card, Image, Input, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { PhoneOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { InstitutionItem } from '@/api/modules/institution'

interface PatientIntroTabProps {
  detail: InstitutionItem
}

/** 预览环境照片占位（mock） */
const previewPhotoPlaceholders = ['接待大厅', '康复空间', '适老房间']

/** mock 上传：阻止真实网络请求，直接标记成功（接后端后删除） */
const mockCustomRequest: UploadProps['customRequest'] = (options) => {
  setTimeout(() => options.onSuccess?.({}, new XMLHttpRequest()), 0)
}

export default function PatientIntroTab({ detail }: PatientIntroTabProps) {
  const { message } = App.useApp()

  const [introTitle, setIntroTitle] = useState(detail.brief)
  const [introDesc, setIntroDesc] = useState(detail.description)
  const [coverImg, setCoverImg] = useState<string | null>(null)
  const [envFiles, setEnvFiles] = useState<UploadFile[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')

  /** 封面选择：拦截真实上传，本地预览（接后端后替换为上传接口） */
  const pickCover = (file: File) => {
    setCoverImg(URL.createObjectURL(file))
    message.success('机构封面已上传（本地预览）')
    return false
  }

  /** 环境照片：受控 fileList，onChange 时为本地文件生成缩略图 */
  const handleEnvChange: UploadProps['onChange'] = ({ fileList: newList }) => {
    const list = newList.map((file) => {
      if (file.originFileObj && !file.thumbUrl && !file.url && !file.preview) {
        file.thumbUrl = URL.createObjectURL(file.originFileObj)
      }
      return file
    })
    setEnvFiles(list)
  }

  /** 点击缩略图：大图预览 */
  const handlePreview = async (file: UploadFile) => {
    const src = file.url || file.preview || file.thumbUrl || ''
    setPreviewImage(src)
    setPreviewOpen(true)
  }

  const envUploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>添加环境照片</div>
    </div>
  )

  return (
    <div className="patient-intro">
      <div className="patient-intro__left">
        <Card variant="borderless" className="detail-card">
          <div className="detail-card__header">
            <h3>患者端介绍</h3>
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
            <label>
              <span>机构封面图片</span>
              <Upload
                listType="picture-card"
                accept="image/*"
                showUploadList={false}
                beforeUpload={pickCover}
              >
                {coverImg ? (
                  <img
                    src={coverImg}
                    alt="机构封面"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                  />
                ) : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传机构封面</div>
                  </div>
                )}
              </Upload>
            </label>
            <label>
              <span>机构环境图片</span>
              <Upload
                listType="picture-card"
                accept="image/*"
                fileList={envFiles}
                customRequest={mockCustomRequest}
                onPreview={handlePreview}
                onChange={handleEnvChange}
              >
                {envFiles.length >= 8 ? null : envUploadButton}
              </Upload>
              {previewImage && (
                <Image
                  styles={{ root: { display: 'none' } }}
                  preview={{
                    open: previewOpen,
                    onOpenChange: (visible) => setPreviewOpen(visible),
                    afterOpenChange: (visible) => !visible && setPreviewImage(''),
                  }}
                  src={previewImage}
                />
              )}
            </label>
            <p className="intro-photos__tip">建议封面尺寸 750×420；环境相册用于患者端了解机构环境与设施。</p>
          </div>
        </Card>
      </div>

      <Card variant="borderless" className="detail-card patient-preview">
        <div className="detail-card__header detail-card__header--compact">
          <h3>患者端实时预览</h3>
          <Button type="link" style={{ fontSize: 12, height: 24 }} icon={<ReloadOutlined />} onClick={() => message.success('预览已刷新')}>
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
            <p>{introDesc}</p>
            <div className="phone__section">
              <div>
                <strong>机构环境</strong>
                <span>查看全部 {envFiles.length || 9} 张 ›</span>
              </div>
              <div className="phone__photos">
                {envFiles.length > 0
                  ? envFiles.slice(0, 3).map((file) => (
                      <i key={file.uid}>
                        {file.thumbUrl ? (
                          <img src={file.thumbUrl} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          file.name
                        )}
                      </i>
                    ))
                  : previewPhotoPlaceholders.map((item) => <i key={item}>{item}</i>)}
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
