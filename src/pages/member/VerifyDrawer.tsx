/**
 * 健康服务对象实名审核 Drawer
 * - 审核模式（待审核）：展示对象信息 + 审核结果选择 + 审核备注 + 一期审核规则，底部「驳回 / 审核通过」
 * - 查看模式（已审核）：结果与备注只读展示
 * - 受控组件：open / record / onClose / onAudited 由父组件 verify.tsx 管理
 */
import { useEffect, useState } from 'react'
import { App, Button, Drawer, Input } from 'antd'
import type { VerifyRecord, VerifyStatus } from '@/api/modules/memberOps'

interface VerifyDrawerProps {
  open: boolean
  record: VerifyRecord | null
  onClose: () => void
  /** 审核完成后回调（父组件更新列表状态） */
  onAudited: (id: string, status: Exclude<VerifyStatus, 'pending'>, remark: string) => void
}

export default function VerifyDrawer({ open, record, onClose, onAudited }: VerifyDrawerProps) {
  const { message } = App.useApp()
  const [result, setResult] = useState<Exclude<VerifyStatus, 'pending'>>('approved')
  const [remark, setRemark] = useState('')

  const isAudit = record?.status === 'pending'

  /** 每次打开时重置审核状态 */
  useEffect(() => {
    if (!open) return
    setResult('approved')
    setRemark('')
  }, [open, record?.id])

  const handleSubmit = (next: Exclude<VerifyStatus, 'pending'>) => {
    if (!record) return
    if (next === 'rejected' && !remark.trim()) {
      message.warning('审核驳回时必须填写具体原因')
      return
    }
    onAudited(record.id, next, remark.trim())
    message.success(next === 'approved' ? '已通过实名审核' : '已驳回，结果将同步至 C 端')
    onClose()
  }

  return (
    <Drawer
      width={560}
      open={open}
      onClose={onClose}
      className="verify-drawer"
      title={
        record ? (
          <div className="verify-drawer__header">
            <h3>健康服务对象实名审核</h3>
            <p>申请编号：{record.applyNo}</p>
          </div>
        ) : (
          '健康服务对象实名审核'
        )
      }
      footer={
        isAudit ? (
          <div className="verify-drawer__footer">
            <Button className="verify-drawer__reject" onClick={() => handleSubmit('rejected')}>
              驳回
            </Button>
            <Button type="primary" onClick={() => handleSubmit('approved')}>
              审核通过
            </Button>
          </div>
        ) : null
      }
    >
      {record && (
        <div className="verify-drawer__body">
          <section className="verify-drawer__info">
            <h4>健康服务对象信息</h4>
            <dl>
              <div>
                <dt>姓名</dt>
                <dd>{record.targetName}</dd>
              </div>
              <div>
                <dt>与提交人关系</dt>
                <dd>{record.relation}</dd>
              </div>
              <div>
                <dt>身份证号码</dt>
                <dd>{record.idCard}</dd>
              </div>
              <div>
                <dt>提交人</dt>
                <dd>{record.submitter}</dd>
              </div>
              <div>
                <dt>提交时间</dt>
                <dd>{record.submitTime}</dd>
              </div>
            </dl>
          </section>

          <div className="verify-drawer__notice">
            身份证信息仅用于实名认证审核。审核人员应按最小权限查看，操作全程记录。
          </div>

          <section className="verify-drawer__section">
            <h4>审核结果</h4>
            {isAudit ? (
              <div className="verify-drawer__result-options">
                <button
                  type="button"
                  className={`verify-drawer__result-option${
                    result === 'approved' ? ' is-active is-approved' : ''
                  }`}
                  onClick={() => setResult('approved')}
                >
                  <i />审核通过
                </button>
                <button
                  type="button"
                  className={`verify-drawer__result-option${
                    result === 'rejected' ? ' is-active is-rejected' : ''
                  }`}
                  onClick={() => setResult('rejected')}
                >
                  <i />审核驳回
                </button>
              </div>
            ) : (
              <div
                className={`verify-drawer__result-readonly verify-drawer__result-readonly--${record.status}`}
              >
                {record.status === 'approved' ? '审核通过' : '审核驳回'}
                {record.auditor && <span>（审核人：{record.auditor}）</span>}
              </div>
            )}
          </section>

          <section className="verify-drawer__section">
            <h4>审核备注</h4>
            {isAudit ? (
              <>
                <Input.TextArea
                  rows={4}
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="审核通过：姓名与身份证信息核对一致。"
                />
                <p className="verify-drawer__remark-tip">
                  审核驳回时必须填写具体原因，结果将同步至 C 端。
                </p>
              </>
            ) : (
              <p className="verify-drawer__remark-readonly">
                {record.remark || '—'}
              </p>
            )}
          </section>

          <section className="verify-drawer__rules">
            <h4>一期审核规则</h4>
            <ul>
              <li>仅核对健康服务对象，不要求代下单家属重复实名认证</li>
              <li>审核通过后允许建档及预约医疗护理服务</li>
              <li>驳回必须填写原因，用户可修改身份证信息后重新提交</li>
              <li>家属查看健康资料由服务对象授权，与实名审核分开处理</li>
            </ul>
          </section>
        </div>
      )}
    </Drawer>
  )
}
