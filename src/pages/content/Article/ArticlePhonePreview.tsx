import { LeftOutlined, MoreOutlined, ReadOutlined } from '@ant-design/icons'
import RichDetailPreview, { isRichDetailEmpty } from '@/components/RichDetailPreview'
import { parseArticleTags } from '../articleTags'
import './ArticlePhonePreview.less'

export interface ArticlePreviewData {
  title?: string
  summary?: string
  cover_url?: string
  body?: string
  tags?: string | string[] | null
  author_name?: string
  source?: string
  categoryName?: string
}

interface ArticlePhonePreviewProps {
  article: ArticlePreviewData
  /** 编辑页侧栏使用紧凑尺寸，弹窗中使用完整尺寸 */
  compact?: boolean
}

/** 患者端科普详情手机预览，列表与编辑页共用。 */
export default function ArticlePhonePreview({ article, compact = false }: ArticlePhonePreviewProps) {
  const meta = [article.source, article.author_name].filter(Boolean).join(' · ')
  const tags = parseArticleTags(article.tags)

  return (
    <div className={`article-phone${compact ? ' article-phone--compact' : ''}`}>
      <div className="article-phone__screen">
        <div className="article-phone__nav">
          <LeftOutlined />
          <strong>健康科普</strong>
          <MoreOutlined />
        </div>

        <div className="article-phone__scroll">
          {article.cover_url ? (
            <img className="article-phone__cover" src={article.cover_url} alt="科普内容封面" />
          ) : (
            <div className="article-phone__cover article-phone__cover--empty">
              <ReadOutlined />
              <span>健康科普</span>
            </div>
          )}

          <article className="article-phone__article">
            <span className="article-phone__category">{article.categoryName || '健康科普'}</span>
            <h1>{article.title?.trim() || '请输入内容标题'}</h1>
            <p className="article-phone__meta">{meta || '院内健康科普'}</p>

            {article.summary?.trim() && <p className="article-phone__summary">{article.summary}</p>}

            {tags.length > 0 && (
              <div className="article-phone__tags">
                {tags.map((tag, index) => (
                  <span key={`${tag}-${index}`}>#{tag}</span>
                ))}
              </div>
            )}

            <div className="article-phone__content">
              {isRichDetailEmpty(article.body) ? (
                <div className="article-phone__empty">
                  <ReadOutlined />
                  <strong>正文内容预览</strong>
                  <span>编辑图文详情后，将在这里展示实际排版效果</span>
                </div>
              ) : (
                <RichDetailPreview value={article.body} />
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
