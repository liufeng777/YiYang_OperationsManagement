/**
 * 患者端协议预览手机壳（协议实时预览 / 列表预览弹框共用）
 * 展示协议名称、类型、版本与生效日期，及简化正文预览
 */
import { Button } from 'antd'
import './AgreementPhone.less'

interface AgreementPhoneProps {
  /** 协议名称（正文标题） */
  name?: string
  /** 协议类型（顶部导航标题） */
  type?: string
  /** 版本号，如 V1.4 */
  version?: string
  /** 生效日期文案 */
  effectiveDate?: string
}

export default function AgreementPhone({
  name,
  type,
  version,
  effectiveDate,
}: AgreementPhoneProps) {
  return (
    <div className="agreement-phone">
      <div className="agreement-phone__scroll">
        <div className="agreement-phone__nav">
          <span>‹</span>
          <strong>{type || '隐私政策'}</strong>
          <span>•••</span>
        </div>
        <div className="agreement-phone__body">
          <h4>{name}</h4>
          <p className="agreement-phone__meta">
            {version ? `${version} · ` : ''}生效日期 {effectiveDate || '—'}
          </p>
          <p>
            我们重视您的个人信息和健康数据安全。本政策说明我们如何处理您的信息，以及您可以如何行使相关权利。
          </p>
          <h5>一、我们收集的信息</h5>
          <ul>
            <li>账户与身份信息</li>
            <li>预约、订单和服务记录</li>
            <li>经单独授权的健康档案与报告</li>
          </ul>
          <h5>二、健康数据授权与撤回</h5>
          <p>
            健康数据属于敏感个人信息。您可以在“设置与隐私”中撤回授权，撤回不影响此前基于授权完成的处理。
          </p>
          <div className="agreement-phone__contact">联系我们：010-6888 6688</div>
        </div>
      </div>
      <div className="agreement-phone__footer">
        <Button type="primary" style={{ width: '100%' }}>
          我已阅读并同意
        </Button>
      </div>
    </div>
  )
}
