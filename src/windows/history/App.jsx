import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ensureBridge } from '../../mock/initBridge.js';

const RISK_FILTERS = [
  { key: 'all', label: '全部风险' },
  { key: 'critical', label: '严重' },
  { key: 'warning', label: '预警' },
  { key: 'attention', label: '关注' },
  { key: 'normal', label: '正常' }
];

const DISPOSAL_FILTERS = [
  { key: 'all', label: '全部处置' },
  { key: 'accept', label: '正常入库' },
  { key: 'conditional', label: '条件入库' },
  { key: 'quarantine', label: '隔离质检' },
  { key: 'reject', label: '拒收退回' }
];

const DISPOSAL_LABELS = {
  accept: '正常入库',
  conditional: '条件入库',
  quarantine: '隔离质检',
  reject: '拒收退回'
};

const DISPOSAL_COLORS = {
  accept: 'var(--risk-normal)',
  conditional: 'var(--risk-attention)',
  quarantine: 'var(--risk-warning)',
  reject: 'var(--risk-critical)'
};

const RISK_LABELS = {
  critical: '严重',
  warning: '预警',
  attention: '关注',
  normal: '正常'
};

const RISK_COLORS = {
  critical: 'var(--risk-critical)',
  warning: 'var(--risk-warning)',
  attention: 'var(--risk-attention)',
  normal: 'var(--risk-normal)'
};

const QUALITY_STATUS = {
  pending_review: { label: '待复核', color: 'var(--risk-warning)', bg: 'rgba(245, 158, 11, 0.15)', next: 'under_qc', nextLabel: '开始质检' },
  under_qc: { label: '质检中', color: 'var(--risk-warning)', bg: 'rgba(245, 158, 11, 0.15)', next: 'sampling', nextLabel: '抽样送检' },
  sampling: { label: '已抽样', color: 'var(--risk-attention)', bg: 'rgba(251, 191, 36, 0.15)', next: 'qc_complete', nextLabel: '质检完成' },
  qc_complete: { label: '质检完成', color: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.15)', next: null },
  released: { label: '放行入库', color: 'var(--risk-normal)', bg: 'rgba(34, 197, 94, 0.15)', next: null, isEnd: true },
  returned: { label: '已退回', color: 'var(--risk-critical)', bg: 'rgba(239, 68, 68, 0.15)', next: null, isEnd: true }
};

const NEED_REVIEW = ['quarantine', 'reject'];

const REVIEW_CONCLUSION_OPTIONS = [
  { key: 'confirmed', label: '维持原决定' },
  { key: 'downgrade', label: '降低处置等级' },
  { key: 'accept', label: '改为正常入库' },
  { key: 'reject', label: '改为拒收退回' }
];

const REVIEW_NEXT_ACTION_OPTIONS = [
  { key: 'qc_continue', label: '继续质检流程' },
  { key: 'warehouse_in', label: '通知仓管入库' },
  { key: 'supplier_contact', label: '联系供应商退回' },
  { key: 'customer_notify', label: '通知客户处理方案' },
  { key: 'temperature_verify', label: '重新核验温度' },
  { key: 'product_sample', label: '抽样送检化验' }
];

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function EmptyState({ icon, title, description, actionText, onAction }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px',
      minHeight: 320
    }}>
      <div style={{
        fontSize: 56,
        marginBottom: 20,
        opacity: 0.5,
        lineHeight: 1
      }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center', maxWidth: 380 }}>
        {description}
      </div>
      {actionText && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}

function RecordRow({ record, onViewDetail, onStartReview, onQualityAction }) {
  const time = new Date(record.createdAt);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  const canReview = NEED_REVIEW.includes(record.disposalDecision) && !record.review;
  const hasReviewed = !!record.review;
  const qs = record.qualityStatus;
  const qsInfo = qs ? QUALITY_STATUS[qs] : null;

  return (
    <div
      onClick={() => onViewDetail(record)}
      style={{
        margin: '6px 0',
        padding: 14,
        borderRadius: 10,
        background: 'var(--bg-card)',
        border: `1px solid ${hasReviewed ? 'var(--risk-normal)' : canReview ? 'var(--risk-warning)' : qsInfo ? qsInfo.color : 'var(--border-color)'}`,
        display: 'grid',
        gridTemplateColumns: '150px 200px 1fr 130px 120px 170px 190px',
        gap: 12,
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent-blue)' }}>
          {timeStr}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {record.arrivalDate}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{record.plateNumber}</span>
          <span className={`badge badge-${record.riskLevel}`} style={{ fontSize: 10 }}>
            {RISK_LABELS[record.riskLevel] || record.riskLevel}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          👤 {record.driver}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
          📦 {record.productName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          🏭 {record.supplier}
        </div>
        {record.disposalNotes && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)', marginTop: 3,
            maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }} title={record.disposalNotes}>
            💬 {record.disposalNotes}
          </div>
        )}
      </div>

      <div>
        <div style={{
          fontSize: 17, fontWeight: 600, fontFamily: 'monospace',
          color: record.isOverThreshold ? 'var(--risk-critical)' : 'var(--text-primary)'
        }}>
          {record.spotTemps?.max}℃
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          阈值 {record.thresholdTemp}℃
        </div>
      </div>

      <div>
        <div style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          color: RISK_COLORS[record.riskLevel],
          background: `${RISK_COLORS[record.riskLevel]}1a`
        }}>
          {RISK_LABELS[record.riskLevel] || record.riskLevel}
        </div>
      </div>

      <div>
        <div style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          color: DISPOSAL_COLORS[record.disposalDecision],
          background: `${DISPOSAL_COLORS[record.disposalDecision]}1a`,
          marginBottom: 4
        }}>
          {DISPOSAL_LABELS[record.disposalDecision] || record.disposalDecisionLabel || record.disposalDecision}
        </div>
        {qsInfo && (
          <div style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            color: qsInfo.color,
            background: qsInfo.bg,
            marginBottom: 4
          }}>
            {qsInfo.label}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          👷 {record.receiverName || '未记录'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); onViewDetail(record); }}>
            查看详情
          </button>
          {canReview && (
            <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); onStartReview(record); }}>
              发起复核
            </button>
          )}
          {qsInfo && qsInfo.next && !canReview && (
            <button className="btn btn-sm" style={{ background: qsInfo.bg, color: qsInfo.color, border: `1px solid ${qsInfo.color}55` }}
                    onClick={(e) => { e.stopPropagation(); onQualityAction(record, 'next'); }}>
              {qsInfo.nextLabel}
            </button>
          )}
          {qs === 'qc_complete' && (
            <>
              <button className="btn btn-sm" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--risk-normal)', border: '1px solid rgba(34,197,94,0.4)' }}
                      onClick={(e) => { e.stopPropagation(); onQualityAction(record, 'released'); }}>
                放行
              </button>
              <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--risk-critical)', border: '1px solid rgba(239,68,68,0.35)' }}
                      onClick={(e) => { e.stopPropagation(); onQualityAction(record, 'returned'); }}>
                退回
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewDialog({ record, onClose, onSubmit }) {
  const [conclusion, setConclusion] = useState('confirmed');
  const [reviewer, setReviewer] = useState('');
  const [nextAction, setNextAction] = useState('qc_continue');
  const [note, setNote] = useState('');

  if (!record) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reviewer.trim()) return;
    onSubmit({
      conclusion,
      conclusionLabel: REVIEW_CONCLUSION_OPTIONS.find(o => o.key === conclusion)?.label,
      reviewer: reviewer.trim(),
      nextAction,
      nextActionLabel: REVIEW_NEXT_ACTION_OPTIONS.find(o => o.key === nextAction)?.label,
      note: note.trim()
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        width: 560,
        background: 'var(--bg-card)',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{
          padding: '18px 22px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>异常复核 - {record.plateNumber}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {DISPOSAL_LABELS[record.disposalDecision] || record.disposalDecisionLabel} · {record.productName}
            </div>
          </div>
          <button className="btn btn-sm btn-outline" onClick={onClose}>关闭</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          <div style={{
            padding: 14,
            borderRadius: 10,
            background: `${DISPOSAL_COLORS[record.disposalDecision]}12`,
            border: `1px solid ${DISPOSAL_COLORS[record.disposalDecision]}55`,
            marginBottom: 18
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>原处置信息</div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 14, fontSize: 13
            }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>处置决定</div>
                <div style={{ fontWeight: 500, color: DISPOSAL_COLORS[record.disposalDecision] }}>
                  {DISPOSAL_LABELS[record.disposalDecision]}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>抽检最高温</div>
                <div style={{
                  fontWeight: 500, fontFamily: 'monospace',
                  color: record.isOverThreshold ? 'var(--risk-critical)' : 'var(--text-primary)'
                }}>{record.spotTemps?.max}℃</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>原收货员</div>
                <div style={{ fontWeight: 500 }}>{record.receiverName || '未记录'}</div>
              </div>
            </div>
            {record.notes && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>处置备注</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>{record.notes}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>复核结论</span>
              <select
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                className="form-input"
                style={{ fontSize: 13 }}
              >
                {REVIEW_CONCLUSION_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>复核人</span>
              <input
                type="text"
                placeholder="请输入复核人姓名"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                className="form-input"
                required
              />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>后续动作</span>
            <select
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="form-input"
              style={{ fontSize: 13 }}
            >
              {REVIEW_NEXT_ACTION_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>复核备注（选填）</span>
            <textarea
              rows={3}
              placeholder="补充复核过程、数据验证等说明..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="form-input"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary">提交复核</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordDetailDialog({ record, onClose, onQualityAction, onAddFollowUp }) {
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [followType, setFollowType] = useState('note');
  const [followNote, setFollowNote] = useState('');
  const [followOperator, setFollowOperator] = useState('');

  if (!record) return null;

  const qs = record.qualityStatus;
  const qsInfo = qs ? QUALITY_STATUS[qs] : null;

  const handleAddFollowUp = (e) => {
    e.preventDefault();
    if (!followNote.trim()) return;
    const typeLabelMap = { note: '备注', temperature: '温度复测', qc: '质检记录', contact: '沟通记录' };
    onAddFollowUp(record.id, {
      type: followType,
      typeLabel: typeLabelMap[followType] || '跟进',
      operator: followOperator.trim() || '值班员',
      note: followNote.trim()
    });
    setShowAddFollowUp(false);
    setFollowNote('');
    setFollowOperator('');
  };

  const sortedFollowUps = (record.followUps || []).slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: 24
    }} onClick={onClose}>
      <div style={{
        width: 820,
        maxHeight: '90vh',
        background: 'var(--bg-card)',
        borderRadius: 14,
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '18px 24px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{record.plateNumber}</span>
              <span className={`badge badge-${record.riskLevel}`} style={{ fontSize: 11 }}>
                {RISK_LABELS[record.riskLevel] || record.riskLevel}
              </span>
              <span style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                color: DISPOSAL_COLORS[record.disposalDecision],
                background: `${DISPOSAL_COLORS[record.disposalDecision]}1a`
              }}>
                {DISPOSAL_LABELS[record.disposalDecision] || record.disposalDecisionLabel}
              </span>
              {qsInfo && (
                <span style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  color: qsInfo.color, background: qsInfo.bg
                }}>
                  {qsInfo.label}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              📦 {record.productName} · 🏭 {record.supplier} · 👤 {record.driver}
            </div>
          </div>
          <button className="btn btn-sm btn-outline" onClick={onClose}>关闭</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <Section title="📋 收货登记信息">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <InfoItem label="到车时间" value={record.arrivalTime || '-'} mono />
              <InfoItem label="开门前温度" value={record.doorOpenTemp != null ? `${record.doorOpenTemp}℃` : '-'} mono />
              <InfoItem label="抽检最高温" value={`${record.spotTemps?.max || '-'}℃`}
                        valueColor={record.isOverThreshold ? 'var(--risk-critical)' : 'var(--risk-normal)'} mono />
              <InfoItem label="温度阈值" value={`${record.thresholdTemp}℃`} mono />
              <InfoItem label="外包装状态" value={record.packageConditionLabel || record.packageCondition || '-'} />
              <InfoItem label="收货员" value={record.receiverName || '未记录'} />
              <InfoItem label="处置决定" value={DISPOSAL_LABELS[record.disposalDecision] || record.disposalDecisionLabel}
                        valueColor={DISPOSAL_COLORS[record.disposalDecision]} />
              <InfoItem label="登记时间" value={formatTime(record.createdAt)} mono />
            </div>
            {record.disposalNotes && (
              <div style={{
                marginTop: 12, padding: '10px 14px',
                borderRadius: 8, background: 'var(--bg-secondary)',
                fontSize: 12, lineHeight: 1.7
              }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>处置说明：</span>
                <span style={{ color: 'var(--text-secondary)' }}>{record.disposalNotes}</span>
              </div>
            )}
            {record.packageNotes && (
              <div style={{
                marginTop: 8, padding: '10px 14px',
                borderRadius: 8, background: 'var(--bg-secondary)',
                fontSize: 12, lineHeight: 1.7
              }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>包装备注：</span>
                <span style={{ color: 'var(--text-secondary)' }}>{record.packageNotes}</span>
              </div>
            )}
          </Section>

          {record.review && (
            <Section title="✓ 复核信息">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <InfoItem label="复核结论" value={record.review.conclusionLabel || record.review.conclusion} />
                <InfoItem label="复核人" value={record.review.reviewer} />
                <InfoItem label="复核时间" value={formatTime(record.review.reviewedAt)} mono />
              </div>
              <div style={{
                marginTop: 12, padding: '10px 14px',
                borderRadius: 8, background: 'var(--bg-secondary)',
                fontSize: 12, lineHeight: 1.7
              }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>后续动作：</span>
                <span style={{ color: 'var(--text-secondary)' }}>{record.review.nextActionLabel || record.review.nextAction}</span>
              </div>
              {record.review.note && (
                <div style={{
                  marginTop: 8, padding: '10px 14px',
                  borderRadius: 8, background: 'var(--bg-secondary)',
                  fontSize: 12, lineHeight: 1.7
                }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>复核备注：</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{record.review.note}</span>
                </div>
              )}
            </Section>
          )}

          <Section title="📊 质检跟进过程" action={
            qsInfo && !qsInfo.isEnd ? (
              <button className="btn btn-xs btn-outline" onClick={() => setShowAddFollowUp(true)}>
                + 添加跟进
              </button>
            ) : null
          }>
            {qsInfo && (
              <div style={{
                padding: 12, borderRadius: 10,
                background: qsInfo.bg, border: `1px solid ${qsInfo.color}44`,
                marginBottom: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 10
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: qsInfo.color }}>
                    当前状态：{qsInfo.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    共 {record.followUps?.length || 0} 条跟进记录
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {qsInfo.next && (
                    <button className="btn btn-sm" style={{ background: qsInfo.color, color: 'white', border: 'none' }}
                            onClick={() => onQualityAction(record, 'next')}>
                      {qsInfo.nextLabel}
                    </button>
                  )}
                  {qs === 'qc_complete' && (
                    <>
                      <button className="btn btn-sm" style={{ background: 'var(--risk-normal)', color: 'white', border: 'none' }}
                              onClick={() => onQualityAction(record, 'released')}>
                        放行入库
                      </button>
                      <button className="btn btn-sm" style={{ background: 'var(--risk-critical)', color: 'white', border: 'none' }}
                              onClick={() => onQualityAction(record, 'returned')}>
                        退回处理
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {showAddFollowUp && (
              <div style={{
                padding: 14, borderRadius: 10,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                marginBottom: 16
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>添加跟进记录</div>
                <form onSubmit={handleAddFollowUp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select value={followType} onChange={(e) => setFollowType(e.target.value)}
                            className="form-input" style={{ fontSize: 12 }}>
                      <option value="note">备注</option>
                      <option value="temperature">温度复测</option>
                      <option value="qc">质检记录</option>
                      <option value="contact">沟通记录</option>
                    </select>
                    <input type="text" placeholder="操作人（选填）" value={followOperator}
                           onChange={(e) => setFollowOperator(e.target.value)}
                           className="form-input" style={{ fontSize: 12 }} />
                  </div>
                  <textarea rows={2} placeholder="跟进内容..." value={followNote}
                            onChange={(e) => setFollowNote(e.target.value)}
                            className="form-input" style={{ fontSize: 12, resize: 'vertical' }} required />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" className="btn btn-xs btn-outline" onClick={() => setShowAddFollowUp(false)}>
                      取消
                    </button>
                    <button type="submit" className="btn btn-xs btn-primary">
                      添加
                    </button>
                  </div>
                </form>
              </div>
            )}

            {sortedFollowUps.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                暂无跟进记录
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 16 }}>
                <div style={{
                  position: 'absolute', left: 5, top: 6, bottom: 6,
                  width: 2, background: 'var(--border-color)'
                }} />
                {sortedFollowUps.map((fu, idx) => (
                  <div key={fu.id || idx} style={{ position: 'relative', marginBottom: 14, paddingLeft: 18 }}>
                    <div style={{
                      position: 'absolute', left: -13, top: 4,
                      width: 10, height: 10, borderRadius: '50%',
                      background: fu.type === 'register' ? 'var(--accent-blue)' :
                                 fu.type === 'review' ? 'var(--risk-normal)' :
                                 fu.type === 'status_change' ? 'var(--risk-warning)' :
                                 'var(--text-muted)',
                      boxShadow: '0 0 0 3px var(--bg-card)'
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fu.typeLabel || fu.type}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {fu.operator} · {formatTime(fu.timestamp)}
                      </span>
                    </div>
                    {fu.note && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {fu.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, paddingBottom: 8,
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value, valueColor, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: 13,
        fontWeight: 500,
        color: valueColor || 'var(--text-primary)',
        fontFamily: mono ? 'monospace' : 'inherit'
      }}>
        {value}
      </div>
    </div>
  );
}

function generateHandoverText(todayRecords, todayStr) {
  const lines = [];
  lines.push(`【冷链月台交接摘要】 ${todayStr}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);

  const riskGroups = { critical: [], warning: [], attention: [], normal: [] };
  todayRecords.forEach(r => { if (riskGroups[r.riskLevel]) riskGroups[r.riskLevel].push(r); });

  const disposalGroups = { accept: [], conditional: [], quarantine: [], reject: [] };
  todayRecords.forEach(r => { if (disposalGroups[r.disposalDecision]) disposalGroups[r.disposalDecision].push(r); });

  lines.push(`📊 今日处置汇总：共 ${todayRecords.length} 车`);
  lines.push(`  · 严重 ${riskGroups.critical.length} · 预警 ${riskGroups.warning.length} · 关注 ${riskGroups.attention.length} · 正常 ${riskGroups.normal.length}`);
  lines.push(`  · 正常入库 ${disposalGroups.accept.length} · 条件入库 ${disposalGroups.conditional.length} · 隔离质检 ${disposalGroups.quarantine.length} · 拒收退回 ${disposalGroups.reject.length}`);
  lines.push(``);

  const pendingReview = todayRecords.filter(r => NEED_REVIEW.includes(r.disposalDecision) && !r.review);
  if (pendingReview.length > 0) {
    lines.push(`⚠️  待复核车辆（${pendingReview.length} 车）- 请下一班跟进：`);
    pendingReview.forEach((r, i) => {
      lines.push(`  ${i + 1}. 【${DISPOSAL_LABELS[r.disposalDecision]}】${r.plateNumber} ${r.productName} · 抽检${r.spotTemps?.max}℃ · 收货员 ${r.receiverName || '未知'}${r.notes ? ' · ' + r.notes : ''}`);
    });
    lines.push(``);
  }

  const quarantined = disposalGroups.quarantine.filter(r => r.review);
  if (quarantined.length > 0) {
    lines.push(`🔬 已复核隔离质检（${quarantined.length} 车）：`);
    quarantined.forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.plateNumber} ${r.productName} · ${r.review.conclusionLabel} · 后续：${r.review.nextActionLabel}${r.review.note ? ' · ' + r.review.note : ''}`);
    });
    lines.push(``);
  }

  const rejected = disposalGroups.reject.filter(r => r.review);
  if (rejected.length > 0) {
    lines.push(`🚫 已复核拒收退回（${rejected.length} 车）：`);
    rejected.forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.plateNumber} ${r.productName} · ${r.review.conclusionLabel} · 后续：${r.review.nextActionLabel}`);
    });
    lines.push(``);
  }

  const conditionalReviewed = disposalGroups.conditional;
  if (conditionalReviewed.length > 0) {
    lines.push(`📝 条件入库车辆（${conditionalReviewed.length} 车）- 建议持续观察：`);
    conditionalReviewed.slice(0, 5).forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.plateNumber} ${r.productName} · 抽检${r.spotTemps?.max}℃${r.notes ? ' · ' + r.notes : ''}`);
    });
    if (conditionalReviewed.length > 5) lines.push(`  ... 共 ${conditionalReviewed.length} 条，详情见系统`);
    lines.push(``);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`交接人：________    接班人：________    日期：${todayStr}`);
  return lines.join('\n');
}

function HandoverDialog({ records, todayStr, onClose }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const summaryText = useMemo(() => generateHandoverText(records, todayStr), [records, todayStr]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
      } else if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        width: 620,
        maxHeight: '85vh',
        background: 'var(--bg-card)',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '18px 22px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>📋 班组交接摘要</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              突出异常车辆，支持一键复制发群
            </div>
          </div>
          <button className="btn btn-sm btn-outline" onClick={onClose}>关闭</button>
        </div>

        <div style={{
          padding: 18,
          flex: 1,
          overflow: 'auto'
        }}>
          <textarea
            ref={textareaRef}
            readOnly
            value={summaryText}
            style={{
              width: '100%',
              height: '100%',
              minHeight: 360,
              padding: 14,
              borderRadius: 10,
              background: '#0e1420',
              color: '#e2e8f0',
              border: '1px solid #2a3648',
              fontSize: 12.5,
              fontFamily: 'Menlo, Consolas, "Cascadia Code", monospace',
              lineHeight: 1.7,
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        <div style={{
          padding: '14px 22px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10
        }}>
          <button className="btn btn-outline" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? '✓ 已复制到剪贴板' : '复制文字并发群'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plateSearch, setPlateSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [disposalFilter, setDisposalFilter] = useState('all');

  const [reviewRecord, setReviewRecord] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [showHandover, setShowHandover] = useState(false);

  useEffect(() => {
    const bridge = ensureBridge();
    const { records: recordsAPI } = bridge;

    const loadData = async () => {
      setLoading(true);
      const data = await recordsAPI.getAll();
      setRecords(data);
      setLoading(false);
    };

    loadData();

    recordsAPI.onUpdated((updated) => {
      setRecords([...updated]);
    });

    return () => {};
  }, []);

  useEffect(() => {
    if (!detailRecord) return;
    const fresh = records.find(r => r.id === detailRecord.id);
    if (fresh && fresh !== detailRecord) {
      setDetailRecord(fresh);
    }
  }, [records, detailRecord]);

  const today = new Date().toISOString().split('T')[0];

  const todayRecords = useMemo(() => {
    return records.filter(r => r.arrivalDate === today);
  }, [records, today]);

  const filteredRecords = useMemo(() => {
    return todayRecords
      .filter(r => riskFilter === 'all' ? true : r.riskLevel === riskFilter)
      .filter(r => disposalFilter === 'all' ? true : r.disposalDecision === disposalFilter)
      .filter(r => plateSearch.trim() === ''
        ? true
        : r.plateNumber.toLowerCase().includes(plateSearch.trim().toLowerCase()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [todayRecords, plateSearch, riskFilter, disposalFilter]);

  const stats = useMemo(() => {
    return {
      total: todayRecords.length,
      critical: todayRecords.filter(r => r.riskLevel === 'critical').length,
      accept: todayRecords.filter(r => r.disposalDecision === 'accept').length,
      conditional: todayRecords.filter(r => r.disposalDecision === 'conditional').length,
      quarantine: todayRecords.filter(r => r.disposalDecision === 'quarantine').length,
      reject: todayRecords.filter(r => r.disposalDecision === 'reject').length,
      pendingReview: todayRecords.filter(r => r.qualityStatus === 'pending_review' || (NEED_REVIEW.includes(r.disposalDecision) && !r.review)).length,
      underQc: todayRecords.filter(r => r.qualityStatus && ['under_qc', 'sampling', 'qc_complete'].includes(r.qualityStatus)).length,
      reviewed: todayRecords.filter(r => r.review).length
    };
  }, [todayRecords]);

  const hasAnyFilter = riskFilter !== 'all' || disposalFilter !== 'all' || plateSearch.trim() !== '';

  const handleViewRecordDetail = (record) => {
    setDetailRecord(record);
  };

  const handleViewVehicleDetail = (vehicleId) => {
    ensureBridge().window.openDetail(vehicleId);
  };

  const handleClose = () => {
    ensureBridge().window.closeHistory();
  };

  const handleResetFilters = () => {
    setPlateSearch('');
    setRiskFilter('all');
    setDisposalFilter('all');
  };

  const handleStartReview = (record) => {
    setReviewRecord(record);
  };

  const handleSubmitReview = async (reviewData) => {
    if (!reviewRecord) return;
    const bridge = ensureBridge();
    const { records: recordsAPI } = bridge;
    await recordsAPI.updateReview(reviewRecord.id, reviewData);
    setReviewRecord(null);
  };

  const handleQualityAction = async (record, action) => {
    const bridge = ensureBridge();
    const { records: recordsAPI } = bridge;

    if (action === 'next') {
      const qsInfo = QUALITY_STATUS[record.qualityStatus];
      if (qsInfo && qsInfo.next) {
        const nextInfo = QUALITY_STATUS[qsInfo.next];
        await recordsAPI.updateQualityStatus(
          record.id, qsInfo.next,
          nextInfo ? nextInfo.label : qsInfo.next,
          '值班员',
          `状态更新为：${nextInfo ? nextInfo.label : qsInfo.next}`
        );
      }
    } else if (action === 'released') {
      await recordsAPI.updateQualityStatus(record.id, 'released', '放行入库', '值班员', '质检通过，放行入库');
    } else if (action === 'returned') {
      await recordsAPI.updateQualityStatus(record.id, 'returned', '已退回', '值班员', '质检不合格，退回处理');
    }
  };

  const handleAddFollowUp = async (recordId, followUp) => {
    const bridge = ensureBridge();
    const { records: recordsAPI } = bridge;
    await recordsAPI.addFollowUp(recordId, followUp);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <header style={{
        padding: '16px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
          }}>📋</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 2 }}>今日处置记录</h1>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              已处置 {stats.total} 车 · 正常入库 {stats.accept} · 异常 {stats.conditional + stats.quarantine + stats.reject}
              {stats.pendingReview > 0 && (
                <span style={{ color: 'var(--risk-warning)', marginLeft: 8 }}>
                  ⚠ 待复核 {stats.pendingReview}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            onClick={() => {
              if (todayRecords.length === 0) return;
              setShowHandover(true);
            }}
            disabled={todayRecords.length === 0}
          >
            📋 生成交接摘要
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleClose}>关闭</button>
        </div>
      </header>

      <div style={{
        padding: '12px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="🔍 输入车牌号搜索，如 京A·88F21"
            value={plateSearch}
            onChange={(e) => setPlateSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {RISK_FILTERS.map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${riskFilter === f.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setRiskFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {DISPOSAL_FILTERS.map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${disposalFilter === f.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setDisposalFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button className="btn btn-sm btn-outline" onClick={handleResetFilters}>
          重置筛选
        </button>
      </div>

      {stats.total > 0 && (
        <div style={{
          padding: '10px 24px',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 10,
          fontSize: 12
        }}>
          <StatBadge label="今日处理" value={stats.total} color="var(--text-primary)" icon="🚚" />
          <StatBadge label="正常入库" value={stats.accept} color="var(--risk-normal)" icon="✅" />
          <StatBadge label="待复核" value={stats.pendingReview} color="var(--risk-warning)" icon="⚠️" />
          <StatBadge label="质检中" value={stats.underQc} color="var(--risk-attention)" icon="🔬" />
          <StatBadge label="已复核" value={stats.reviewed} color="var(--risk-normal)" icon="✓" />
          <StatBadge label="拒收退回" value={stats.reject} color="var(--risk-critical)" icon="🚫" />
        </div>
      )}

      <div style={{
        padding: '8px 24px 4px',
        display: 'grid',
        gridTemplateColumns: '150px 200px 1fr 130px 120px 170px 190px',
        gap: 12,
        fontSize: 12,
        color: 'var(--text-muted)',
        fontWeight: 500
      }}>
        <div>处置时间</div>
        <div>车辆信息</div>
        <div>货品与供应商</div>
        <div>抽检最高温</div>
        <div>风险等级</div>
        <div>处置 / 质检状态</div>
        <div style={{ textAlign: 'right' }}>操作</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 24px' }}>
        {loading ? (
          <EmptyState
            icon="⏳"
            title="加载中..."
            description="正在从本地存储加载今日处置记录，请稍候..."
          />
        ) : todayRecords.length === 0 ? (
          <EmptyState
            icon="📭"
            title="今天还没有处置记录"
            description={`今天是 ${today}，目前还没有完成收货登记的车辆。在到车队列里点击「开始收货」完成登记后，记录会出现在这里。`}
            actionText="返回到车队列"
            onAction={handleClose}
          />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={plateSearch.trim() ? `没有车牌号包含「${plateSearch.trim()}」的记录` :
              riskFilter !== 'all' ? `没有「${RISK_FILTERS.find(f => f.key === riskFilter)?.label}」风险等级的记录` :
              `没有「${DISPOSAL_FILTERS.find(f => f.key === disposalFilter)?.label}」处置的记录`
            }
            description={`当前 ${hasAnyFilter ? '有筛选条件，' : ''}共有 ${todayRecords.length} 条今日处置记录。${hasAnyFilter ? '试试调整或重置筛选条件吧。' : ''}`}
            actionText={hasAnyFilter ? '重置筛选条件' : null}
            onAction={hasAnyFilter ? handleResetFilters : null}
          />
        ) : (
          filteredRecords.map(record => (
            <RecordRow
              key={record.id}
              record={record}
              onViewDetail={handleViewRecordDetail}
              onStartReview={handleStartReview}
              onQualityAction={handleQualityAction}
            />
          ))
        )}
      </div>

      {reviewRecord && (
        <ReviewDialog
          record={reviewRecord}
          onClose={() => setReviewRecord(null)}
          onSubmit={handleSubmitReview}
        />
      )}

      {detailRecord && (
        <RecordDetailDialog
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          onQualityAction={handleQualityAction}
          onAddFollowUp={handleAddFollowUp}
        />
      )}

      {showHandover && (
        <HandoverDialog
          records={todayRecords}
          todayStr={today}
          onClose={() => setShowHandover(false)}
        />
      )}
    </div>
  );
}

function StatBadge({ label, value, color, icon }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 8,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)'
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color, fontFamily: 'monospace' }}>{value}</div>
      </div>
    </div>
  );
}
