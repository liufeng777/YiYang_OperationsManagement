/**
 * 机构详情 - 患者端介绍 Tab
 * 患者端介绍表单 + 患者端实时预览（机构信息由平台直接维护，无「同步」概念）
 * 数据来源：institutionApi.updateInstitution
 * 注意：后端 PUT 为全量覆盖，本表单只编辑 brief/description/cover_url，
 *       基础信息字段需原值回传，避免被清空
 * 注：父级通过 key={detail.id} 重挂载本组件以切换机构时重置表单
 */
import { useState } from 'react'
import { App, Button, Card, Input, Upload } from 'antd'
import type { UploadFile } from 'antd'
import { CheckOutlined, PhoneOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { institutionApi } from '@/api'
import { useImageUpload } from '@/hooks'
import type { InstitutionItem } from '@/api/modules/institution'
import RichDetailEditor from '@/components/RichDetailEditor'

interface PatientIntroTabProps {
  detail: InstitutionItem
  /** 保存成功后的回调（父级重新拉取详情） */
  onSaved?: () => void
}

/** 预览环境照片占位（mock） */
const previewPhotoPlaceholders = ['接待大厅', '康复空间', '适老房间']

export default function PatientIntroTab({ detail, onSaved }: PatientIntroTabProps) {
  const { message } = App.useApp()
  const { uploading, upload } = useImageUpload()

  const [introTitle, setIntroTitle] = useState(detail.brief)
  /** 机构图文详情（ProseMirror JSON），存储回 description */
  const [introRich, setIntroRich] = useState<string>(detail.description || '')
  /** 封面预览地址（本地 objectURL 或服务器地址） */
  const [coverImg, setCoverImg] = useState<string | null>(detail.cover_url || null)
  /** 封面服务器地址（上传成功后写入 cover_url） */
  const [coverServerUrl, setCoverServerUrl] = useState(detail.cover_url || '')
  const [envFiles] = useState<UploadFile[]>([])
  const [saving, setSaving] = useState(false)

  /** 封面选择：本地预览 + 后台上传，成功后保存服务器地址 */
  const pickCover = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => setCoverImg(localUrl),
      onUploaded: (url) => {
        setCoverServerUrl(url)
        setCoverImg(url)
        message.success('机构封面已上传')
      },
      onError: () => setCoverServerUrl(detail.cover_url || ''),
    })
    return false
  }

  /** 保存患者端介绍（全量覆盖：基础信息字段原值回传） */
  const handleSave = async () => {
    if (!introTitle.trim()) {
      message.warning('请输入患者端展示标题')
      return
    }
    setSaving(true)
    try {
      await institutionApi.updateInstitution(detail.id, {
        brief: introTitle.trim(),
        description: introRich,
        // 封面使用上传接口返回的服务器地址
        cover_url: coverServerUrl,
        // 以下为基础信息，PUT 全量覆盖需原值回传
        name: detail.name,
        name_en: detail.name_en ?? '',
        type: detail.type,
        province: detail.province,
        city: detail.city,
        district: detail.district,
        address: detail.address,
        contact_phone: detail.contact_phone,
        manager_name: detail.manager_name,
        manager_phone: detail.manager_phone,
        service_radius_km: detail.service_radius_km,
        status: detail.status,
      })
      message.success('患者端介绍已保存')
      onSaved?.()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="patient-intro">
      <div className="patient-intro__left">
        <Card variant="borderless" className="detail-card">
          <div className="detail-card__header">
            <h3>患者端展示详情</h3>
            <Button type="primary" icon={<CheckOutlined />} loading={saving} onClick={handleSave}>
              保存修改
            </Button>
          </div>
          <div className="intro-form">
            <label>
              <span>
                <span className='require-star'>*</span> <span style={{fontWeight: 500}}>患者端展示标题</span>
              </span>
              <Input value={introTitle} onChange={(event) => setIntroTitle(event.target.value)} />
            </label>
            <div className="patient-detail">
              <div className="patient-detail__field patient-detail__cover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="patient-detail__label">机构封面</span>
                  <p className="patient-detail__tip">建议尺寸 750×420，展示于患者端机构详情页顶部。</p>
                </div>
                <Upload
                  listType="picture-card"
                  accept="image/*"
                  showUploadList={false}
                  disabled={uploading}
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
                      <div style={{ marginTop: 8 }}>{uploading ? '上传中…' : '上传机构封面'}</div>
                    </div>
                  )}
                </Upload>
              </div>
              <RichDetailEditor label="图文详情" value={introRich} onChange={setIntroRich} />
            </div>
            {/* <label>
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
            </label> */}
            {/* <p className="intro-photos__tip">建议封面尺寸 750×420；环境相册用于患者端了解机构环境与设施。</p> */}
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
            <p>{introRich ? '已配置图文详情（富文本内容见小程序渲染）' : '编辑图文详情后在此展示机构简介'}</p>
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
