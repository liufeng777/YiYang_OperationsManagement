/**
 * 内容配置 - 患者端首页配置
 * 视觉对齐设计稿：左侧轮播图 / 快捷入口 / 推荐内容，右侧患者端首页实时预览
 * 当前为 mock 数据，后端就绪后替换为 contentApi.getHomeConfig / publishHomeConfig
 */
import { useState } from 'react'
import { App, Button, Card, Tabs, Upload } from 'antd'
import { HolderOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import './home.less'

interface BannerRow {
  id: string
  tag: string
  title: string
  linkTarget: string
  /** 本地预览地址（URL.createObjectURL） */
  url?: string
}

interface RecommendRow {
  id: string
  icon: string
  name: string
  note: string
  price: string
}

const initialBanners: BannerRow[] = [
  { id: '1', tag: '康养活动', title: '秋日康养游园会', linkTarget: '活动详情' },
  { id: '2', tag: '健康服务', title: '线上问诊服务专区', linkTarget: '服务列表' },
]

const entries = [
  { id: '1', icon: '服', name: '机构服务' },
  { id: '2', icon: '线', name: '线上服务' },
  { id: '3', icon: '活', name: '活动报名' },
  { id: '4', icon: '旅', name: '康养旅游' },
]

const initialRecommends: RecommendRow[] = [
  { id: '1', icon: '护', name: '上门护理评估', note: '6 家机构可预约', price: '¥168 / 次' },
  { id: '2', icon: '问', name: '线上健康咨询', note: '9 家机构可预约', price: '¥39 / 次' },
]

export default function ContentHome() {
  const { message } = App.useApp()
  const [banners, setBanners] = useState(initialBanners)
  const [recommends, setRecommends] = useState(initialRecommends)
  const [recommendTab, setRecommendTab] = useState('service')
  const [bannerDragId, setBannerDragId] = useState<string | null>(null)
  const [bannerDragOverId, setBannerDragOverId] = useState<string | null>(null)

  const handleRemoveRecommend = (id: string) => {
    setRecommends((prev) => prev.filter((item) => item.id !== id))
    message.success('已移除推荐内容（自动保存）')
  }

  /** 轮播图拖拽排序（与详情图一致的原生 DnD 交互） */
  const handleBannerDrop = (targetId: string) => {
    if (bannerDragId && bannerDragId !== targetId) {
      setBanners((prev) => {
        const from = prev.findIndex((item) => item.id === bannerDragId)
        const to = prev.findIndex((item) => item.id === targetId)
        if (from < 0 || to < 0) return prev
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
    }
    setBannerDragId(null)
    setBannerDragOverId(null)
  }

  return (
    <PageContainer
      title="患者端首页配置"
      description="配置轮播图、快捷入口与推荐内容，右侧实时查看患者端展示效果"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.success('首页配置已发布（mock）')}
        >
          发布首页
        </Button>
      }
    >
      <div className="content-home">
        <div className="content-home__form">
          <Card variant="borderless" className="home-card">
            <div className="home-card__header">
              <div>
                <h3>首页轮播图</h3>
                <span className='home-card__header__label'>建议 750 × 360px，最多展示 5 张</span>
              </div>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  setBanners((prev) => [
                    ...prev,
                    {
                      id: `b-${Date.now()}`,
                      tag: '轮播图',
                      title: file.name.replace(/\.[^.]+$/, ''),
                      linkTarget: '待配置跳转',
                      url: URL.createObjectURL(file),
                    },
                  ])
                  message.success('轮播图已添加（本地预览）')
                  return false
                }}
              >
                <Button icon={<PlusOutlined />} className='common-btn'>
                  添加轮播图
                </Button>
              </Upload>
            </div>
            <div className="banner-list">
              {banners.map((banner) => (
                <div
                  className={[
                    'banner-row',
                    bannerDragId === banner.id ? 'is-dragging' : '',
                    bannerDragOverId === banner.id && bannerDragId !== banner.id ? 'is-over' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={banner.id}
                  draggable
                  onDragStart={() => setBannerDragId(banner.id)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setBannerDragOverId(banner.id)
                  }}
                  onDragLeave={() =>
                    setBannerDragOverId((prev) => (prev === banner.id ? null : prev))
                  }
                  onDrop={(event) => {
                    event.preventDefault()
                    handleBannerDrop(banner.id)
                  }}
                  onDragEnd={() => {
                    setBannerDragId(null)
                    setBannerDragOverId(null)
                  }}
                >
                  <HolderOutlined className="banner-row__drag" />
                  <i className={`banner-row__thumb${banner.url ? ' has-image' : ''}`}>
                    {banner.url ? <img src={banner.url} alt={banner.title} /> : banner.tag}
                  </i>
                  <div className="banner-row__info">
                    <strong>{banner.title}</strong>
                    <span>跳转至：{banner.linkTarget}</span>
                  </div>
                  <div className="banner-row__actions">
                    <em>展示中</em>
                    <Button type="link" size="small" onClick={() => message.info('编辑轮播图开发中')}>
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() =>
                        setBanners((prev) => prev.filter((item) => item.id !== banner.id))
                      }
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="borderless" className="home-card">
            <div className="home-card__header">
              <div>
                <h3>首页快捷入口</h3>
                <span className='home-card__header__label'>入口固定，仅支持调整显示与排序</span>
              </div>
              <span className="home-card__tip">拖动调整顺序</span>
            </div>
            <div className="entry-grid">
              {entries.map((entry) => (
                <div className="entry-tile" key={entry.id}>
                  <HolderOutlined className="entry-tile__drag" />
                  <i>{entry.icon}</i>
                  <strong>{entry.name}</strong>
                  <em>已显示</em>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="borderless" className="home-card">
            <div className="home-card__header">
              <div>
                <h3>首页推荐内容</h3>
                <span className='home-card__header__label'>从已上架服务和已发布活动中选择</span>
              </div>
              <Button className='common-btn' icon={<PlusOutlined />} onClick={() => message.info('选择内容开发中')}>
                选择内容
              </Button>
            </div>
            <Tabs
              activeKey={recommendTab}
              onChange={setRecommendTab}
              items={[
                { key: 'service', label: '推荐服务 3' },
                { key: 'activity', label: '推荐活动 2' },
              ]}
            />
            <div className="recommend-list">
              {recommends.map((item) => (
                <div className="recommend-row" key={item.id}>
                  <HolderOutlined className="recommend-row__drag" />
                  <i className="recommend-row__icon">{item.icon}</i>
                  <div className="recommend-row__info">
                    <strong>{item.name}</strong>
                    <span>{item.note}</span>
                  </div>
                  <div className="recommend-row__actions">
                    <em>{item.price}</em>
                    <Button type="link" size="small" danger onClick={() => handleRemoveRecommend(item.id)}>
                      移除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="home-card__footer">
              <span>每类最多展示 6 项，拖动可调整患者端顺序</span>
              <em>自动保存</em>
            </div>
          </Card>
        </div>

        <Card className="content-home__preview">
          <div className="home-preview__header">
            <h3>患者端首页实时预览</h3>
            <span>未发布修改</span>
          </div>
          <div className="home-phone">
            <div className="home-phone__bar">
              <strong>幸福颐养</strong>
              <span>•••</span>
            </div>
            <div className="home-phone__hero">
              <strong>秋日康养游园会</strong>
              <span>健康相伴 · 乐享秋日好时光</span>
              <em>查看活动 →</em>
            </div>
            <div className="home-phone__entries">
              {entries.map((entry) => (
                <div key={entry.id}>
                  <i>{entry.icon}</i>
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
            <div className="home-phone__section">
              <div className="home-phone__section-head">
                <strong>推荐服务</strong>
                <span>查看更多 ›</span>
              </div>
              <div className="home-phone__services">
                {recommends.map((item) => (
                  <div className="phone-service" key={item.id}>
                    <i>{item.icon}</i>
                    <strong>{item.name}</strong>
                    <div>
                      <em>{item.price.replace(' / 次', '')}</em>
                      <span>{item.note.replace('可预约', '机构')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="home-phone__section">
              <div className="home-phone__section-head">
                <strong>精彩活动</strong>
                <span>查看更多 ›</span>
              </div>
              <div className="phone-activity">
                <span>社区活动 · 余 34 个名额</span>
                <strong>秋日康养游园会</strong>
                <em>9 月 20 日 周日 09:00-16:00</em>
                <div>
                  <b>免费</b>
                  <span>查看详情 →</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
