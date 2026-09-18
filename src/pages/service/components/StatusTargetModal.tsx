import { useState, useEffect } from 'react';
import { StatusTarget } from '../list'
import { Button, Modal, Input } from 'antd';

interface IProps {
  statusTarget: StatusTarget | null;
  onCancel: () => void;
  onOk: (reason?: string) => void;
}

export default function StatusTargetModal ({statusTarget, onCancel, onOk}: IProps) {
  const [offlineReason, setOfflineReason] = useState('');

  useEffect(() => {
    if (!statusTarget) {
      setOfflineReason('')
    }
  }, [statusTarget])

  return (
    <Modal
        open={!!statusTarget}
        title={statusTarget?.action === 'online' ? '上架服务' : '下架服务'}
        onCancel={onCancel}
        footer={
          <div className="offline-modal__footer">
            <Button onClick={onCancel}>取消</Button>
            {statusTarget?.action === 'online' ? (
              <Button type="primary" onClick={() => onOk()}>
                确认上架
              </Button>
            ) : (
              <Button danger type="primary" onClick={() => onOk(offlineReason)}>
                确认下架
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
                  <strong>下架后用户端将立即停止展示和预约</strong>
                  <p>已产生的预约订单不受影响，仍按原履约流程处理。</p>
                </div>
                <div className="offline-modal__service">
                  <span>{statusTarget.title}</span>
                  <span>{statusTarget.code ?? `${statusTarget.ids.length} 项`}</span>
                </div>
                <div className="offline-modal__reason">
                  <label>下架原因</label>
                  <Input.TextArea
                    rows={4}
                    placeholder="请填写下架原因，至少 5 个字"
                    value={offlineReason}
                    onChange={(event) => setOfflineReason(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="offline-modal__warning">
                  <strong>上架后机构可选择添加该服务</strong>
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