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

const NEED_REVIEW = ['quarantine', 'reject'];

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

function RecordRow({ record, onViewDetail, onStartReview }) {
  const time = new Date(record.createdAt);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  const canReview = NEED_REVIEW.includes(record.disposalDecision) && !record.review;
  const hasReviewed = !!record.review;

  return (
    <div
      style={{
        margin: '6px 0',
        padding: 14,
        borderRadius: 10,
        background: 'var(--bg-card)',
        border: `1px solid ${hasReviewed ? 'var(--risk-normal)' : canReview ? 'var(--risk-warning)' : 'var(--border-color)'}`,
        display: 'grid',
        gridTemplateColumns: '160px 220px 1fr 140px 140px 180px 180px',
        gap: 12,
        alignItems: 'center'
      }}
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
          <span
            className={`badge badge-${record.riskLevel}`}
            style={{ fontSize: 10 }}
          >
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
      </div>

      <div>
        <div style={{
          fontSize: 17, fontWeight: 600, fontFamily: 'monospace',
          color: record.isOverThreshold ? 'var(--risk-critical)' : 'var(--text-primary)'
        }}>
          {record.spotTemps?.max}℃
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          标准 {record.standardTemp}℃ / 阈值 {record.thresholdTemp}℃
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
        {hasReviewed ? (
          <div style={{ fontSize: 11, color: 'var(--risk-normal)' }}>
            ✓ 已复核 · {formatTime(record.review.reviewedAt)}
          </div>
        ) : canReview ? (
          <div style={{ fontSize: 11, color: 'var(--risk-warning)' }}>
            ⚠ 待复核
          </div>
        ) : null}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          👷 {record.receiverName || '未记录'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-outline" onClick={onViewDetail}>
            查看详情
          </button>
          {canReview && (
            <button className="btn btn-sm btn-primary" onClick={() => onStartReview(record)}>
              发起复核
            </button>
          )}
        </div>
        {record.notes && record.notes.length > 18 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, textAlign: 'right' }}
               title={record.notes}>
            {record.notes.slice(0, 18)}…
          </div>
        ) : record.notes ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, textAlign: 'right' }}>
            {record.notes}
          </div>
        ) : null}
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
  const [showHandover, setShowHandover] = useState(false);
  const [copiedReview, setCopiedReview] = useState(false);

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
      pendingReview: todayRecords.filter(r => NEED_REVIEW.includes(r.disposalDecision) && !r.review).length,
      reviewed: todayRecords.filter(r => r.review).length
    };
  }, [todayRecords]);

  const hasAnyFilter = riskFilter !== 'all' || disposalFilter !== 'all' || plateSearch.trim() !== '';

  const handleViewDetail = (vehicleId) => {
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

  const handleCopyHandover = async () => {
    const text = generateHandoverText(todayRecords, today);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedReview(true);
      setTimeout(() => setCopiedReview(false), 2000);
    } catch (e) {}
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
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 10,
          fontSize: 12
        }}>
          <StatBadge label="今日处理" value={stats.total} color="var(--text-primary)" icon="🚚" />
          <StatBadge label="正常入库" value={stats.accept} color="var(--risk-normal)" icon="✅" />
          <StatBadge label="待复核" value={stats.pendingReview} color="var(--risk-warning)" icon="⚠️" />
          <StatBadge label="已复核" value={stats.reviewed} color="var(--risk-normal)" icon="✓" />
          <StatBadge label="拒收退回" value={stats.reject} color="var(--risk-critical)" icon="🚫" />
        </div>
      )}

      <div style={{
        padding: '8px 24px 4px',
        display: 'grid',
        gridTemplateColumns: '160px 220px 1fr 140px 140px 180px 180px',
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
        <div>处置决定 / 复核</div>
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
              onViewDetail={() => handleViewDetail(record.vehicleId)}
              onStartReview={handleStartReview}
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
