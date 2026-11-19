import { useEffect, useMemo, useState } from 'react'
import type { StatusTarget } from '../list'
import { Button, Input, Modal, Radio } from 'antd'

const OFFLINE_REASON_OPTIONS = [
  '暂无可用服务人员',
  '服务能力调整',
  '服务内容或价格调整',
  '服务质量或资质问题',
  '其他',
] as const

interface IProps {
  type: string // service/institution
  statusTarget: StatusTarget | null
  onCancel: () => void
  onOk: (reason?: string) => void
}

export default function StatusTargetModal({ type, statusTarget, onCancel, onOk }: IProps) {
  const [reasonOption, setReasonOption] = useState('')
  const [otherReason, setOtherReason] = useState('')

  useEffect(() => {
    setReasonOption('')
    setOtherReason('')
  }, [statusTarget])

  const formartOnlineText = useMemo(() => (type === 'service' ? '启用' : '上架'), [type])
  const formartOfflineText = useMemo(() => (type === 'service' ? '停用' : '下架'), [type])
  const isOther = reasonOption === '其他'
  const offlineReason = isOther ? otherReason.trim() : reasonOption
  const reasonInvalid = !reasonOption || (isOther && !offlineReason)

  return (
    <Modal
      open={!!statusTarget}
      title={statusTarget?.action === 'online' ? `${formartOnlineText}服务` : `${formartOfflineText}服务`}
      onCancel={onCancel}
      footer={
        <div className="offline-modal__footer">
          <Button onClick={onCancel}>取消</Button>
          {statusTarget?.action === 'online' ? (
            <Button type="primary" onClick={() => onOk()}>
              确认{formartOnlineText}
            </Button>
          ) : (
            <Button
              danger
              type="primary"
              disabled={reasonInvalid}
              onClick={() => onOk(offlineReason)}
            >
              确认{formartOfflineText}
            </Button>
          )}
        </div>
      }
    >
      {statusTarget && (
        <div className="offline-modal">
          {statusTarget.action === 'offline' ? (
            <>
              <div className="offline-modal__warning">
                <strong>{formartOfflineText}后用户端将立即停止展示和预约</strong>
                <p>已产生的预约订单不受影响，仍按原履约流程处理。</p>
              </div>
              <div className="offline-modal__service">
                <span>{statusTarget.title}</span>
                <span>{statusTarget.code ?? `${statusTarget.ids.length} 项`}</span>
              </div>
              <div className="offline-modal__reason">
                <label>{formartOfflineText}原因</label>
                <Radio.Group
                  value={reasonOption}
                  onChange={(event) => setReasonOption(event.target.value)}
                  options={OFFLINE_REASON_OPTIONS.map((value) => ({ label: value, value }))}
                />
                {isOther && (
                  <Input.TextArea
                    rows={3}
                    maxLength={200}
                    showCount
                    placeholder={`请填写${formartOfflineText}原因`}
                    value={otherReason}
                    onChange={(event) => setOtherReason(event.target.value)}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="offline-modal__warning">
                <strong>{formartOnlineText}后机构可选择添加该服务</strong>
                <p>机构添加时继承集团基础信息与价格，再配置线上履约规则。</p>
              </div>
              <div className="offline-modal__service">
                <span>{statusTarget.title}</span>
                <span>{statusTarget.code ?? `${statusTarget.ids.length} 项`}</span>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
