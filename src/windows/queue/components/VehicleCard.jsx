import React from 'react';

const TREND_ICONS = {
  rising_fast: '📈',
  rising: '↗️',
  stable: '➡️',
  falling: '↘️'
};

const STATUS_STYLES = {
  en_route: { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--status-enroute)' },
  approaching: { bg: 'rgba(139, 92, 246, 0.15)', color: 'var(--status-approaching)' },
  waiting: { bg: 'rgba(107, 114, 128, 0.15)', color: 'var(--status-waiting)' },
  received: { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--risk-normal)' }
};

const STATUS_LABELS = {
  en_route: '在途',
  approaching: '即将到达',
  waiting: '等待入场',
  received: '已收货'
};

const DISPOSAL_COLORS = {
  accept: 'var(--risk-normal)',
  conditional: 'var(--risk-attention)',
  quarantine: 'var(--risk-warning)',
  reject: 'var(--risk-critical)'
};

const QUALITY_STATUS = {
  pending_review: { label: '待复核', color: 'var(--risk-warning)', bg: 'rgba(245, 158, 11, 0.15)' },
  under_qc: { label: '质检中', color: 'var(--risk-warning)', bg: 'rgba(245, 158, 11, 0.15)' },
  sampling: { label: '已抽样', color: 'var(--risk-attention)', bg: 'rgba(251, 191, 36, 0.15)' },
  qc_complete: { label: '质检完成', color: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.15)' },
  released: { label: '放行入库', color: 'var(--risk-normal)', bg: 'rgba(34, 197, 94, 0.15)' },
  returned: { label: '已退回', color: 'var(--risk-critical)', bg: 'rgba(239, 68, 68, 0.15)' }
};

export default function VehicleCard({ vehicle, priority, onViewDetail, onStartReceiving }) {
  const isReceived = vehicle.status === 'received';

  const priorityStyle = isReceived
    ? {
        bg: 'linear-gradient(135deg, #22c55e, #16a34a)',
        text: 'white',
        label: '已收货'
      }
    : priority <= 3
    ? {
        bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
        text: 'white',
        label: '优先卸货'
      }
    : priority <= 6
      ? {
          bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          text: 'white',
          label: '次优先'
        }
      : {
          bg: 'var(--bg-hover)',
          text: 'var(--text-secondary)',
          label: '正常队列'
        };

  const tempDiff = (vehicle.maxTemp - vehicle.thresholdTemp).toFixed(1);
  const tempOverThreshold = vehicle.maxTemp > vehicle.thresholdTemp;

  const formatEta = (minutes) => {
    if (minutes <= 0) return '已到达';
    if (minutes < 60) return `${minutes} 分钟后`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}小时${m}分后`;
  };

  const etaDate = new Date(vehicle.eta);
  const etaTime = `${String(etaDate.getHours()).padStart(2, '0')}:${String(etaDate.getMinutes()).padStart(2, '0')}`;

  return (
    <div
      style={{
        margin: '6px 0',
        padding: 14,
        borderRadius: 10,
        background: vehicle.riskLevel === 'critical'
          ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 30%)'
          : vehicle.riskLevel === 'warning'
            ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.06) 0%, var(--bg-card) 30%)'
            : 'var(--bg-card)',
        border: `1px solid ${vehicle.riskLevel === 'critical'
          ? 'rgba(239, 68, 68, 0.4)'
          : vehicle.riskLevel === 'warning'
            ? 'rgba(245, 158, 11, 0.3)'
            : 'var(--border-color)'}`,
        display: 'grid',
        gridTemplateColumns: '120px 180px 1fr 140px 120px 140px 200px',
        gap: 12,
        alignItems: 'center',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.borderColor = 'var(--accent-blue)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
      }}
      onClick={onViewDetail}
    >
      <div>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: priorityStyle.bg,
          color: priorityStyle.text,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700
        }}>
          <div style={{ fontSize: isReceived ? 18 : 20, lineHeight: 1 }}>
            {isReceived ? '✓' : `#${priority}`}
          </div>
          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.9 }}>{priorityStyle.label}</div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 0.5
          }}>
            {vehicle.plateNumber}
          </span>
          <span className={`badge badge-${vehicle.riskLevel}`}>
            {vehicle.riskLevel === 'critical' ? '严重回温' :
             vehicle.riskLevel === 'warning' ? '回温预警' :
             vehicle.riskLevel === 'attention' ? '关注' : '正常'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
          🚚 {vehicle.trailerType}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          👤 {vehicle.driver}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: 4,
            background: 'var(--bg-hover)',
            fontSize: 12,
            fontWeight: 500
          }}>
            {vehicle.productName}
          </span>
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)'
          }}>
            标准 {vehicle.standardTemp}℃ · 阈值 {vehicle.thresholdTemp}℃
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
          {vehicle.supplier}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          📦 {vehicle.pallets} 托盘 · {vehicle.weight} 吨
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: tempOverThreshold ? 'var(--risk-critical)' : 'var(--text-primary)',
          fontFamily: 'monospace',
          marginBottom: 2
        }}>
          {vehicle.maxTemp}℃
        </div>
        <div style={{ fontSize: 11, color: tempOverThreshold ? 'var(--risk-critical)' : 'var(--text-muted)' }}>
          {tempOverThreshold ? `超阈值 +${tempDiff}℃` : '正常范围内'}
        </div>
      </div>

      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4
        }}>
          <span style={{ fontSize: 18 }}>{TREND_ICONS[vehicle.tempTrend]}</span>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: vehicle.tempTrend === 'rising_fast' ? 'var(--risk-critical)' :
                   vehicle.tempTrend === 'rising' ? 'var(--risk-warning)' :
                   vehicle.tempTrend === 'falling' ? 'var(--risk-normal)' : 'var(--text-secondary)'
          }}>
            {vehicle.trendLabel}
          </span>
        </div>
        <div style={{
          ...STATUS_STYLES[vehicle.status],
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11
        }}>
          {STATUS_LABELS[vehicle.status]}
        </div>
      </div>

      <div>
        {isReceived && vehicle.latestRecord ? (
          <>
            <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: DISPOSAL_COLORS[vehicle.latestRecord.disposalDecision] || 'var(--text-primary)',
            marginBottom: 4
          }}>
            {vehicle.latestRecord.disposalDecisionLabel || vehicle.latestRecord.disposalDecision}
          </div>
            <div style={{
            fontSize: 11,
            color: (vehicle.latestRecord.isOverThreshold || vehicle.latestRecord.spotTemps?.max > vehicle.latestRecord.thresholdTemp) ? 'var(--risk-critical)' : 'var(--text-muted)'
          }}>
            抽检 {vehicle.latestRecord.spotTemps?.max}℃
            {(vehicle.latestRecord.isOverThreshold || vehicle.latestRecord.spotTemps?.max > vehicle.latestRecord.thresholdTemp) && (
              <span>
                 · 超{vehicle.latestRecord.tempDiff || (vehicle.latestRecord.spotTemps?.max - vehicle.latestRecord.thresholdTemp).toFixed(1)}℃
              </span>
            )}
          </div>
            <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginTop: 2
          }}>
            👷 {vehicle.latestRecord.receiverName || '未记录'} · {new Date(vehicle.latestRecord.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 处置
          </div>
            {vehicle.latestRecord.qualityStatus && QUALITY_STATUS[vehicle.latestRecord.qualityStatus] && (
            <div style={{
              fontSize: 11, marginTop: 4,
              padding: '2px 8px', borderRadius: 4, display: 'inline-block',
              color: QUALITY_STATUS[vehicle.latestRecord.qualityStatus].color,
              background: QUALITY_STATUS[vehicle.latestRecord.qualityStatus].bg,
              fontWeight: 500
            }}>
              📍 {QUALITY_STATUS[vehicle.latestRecord.qualityStatus].label}
            </div>
          )}
            {!vehicle.latestRecord.qualityStatus && vehicle.latestRecord.review ? (
            <div style={{ fontSize: 11, color: 'var(--risk-normal)', marginTop: 3 }}>
              ✓ 已复核 · {vehicle.latestRecord.review.conclusionLabel || '已处理完毕'}
            </div>
          ) : !vehicle.latestRecord.qualityStatus && (vehicle.latestRecord.disposalDecision === 'quarantine' || vehicle.latestRecord.disposalDecision === 'reject') && (
            <div style={{ fontSize: 11, color: 'var(--risk-warning)', marginTop: 3 }}>
              ⚠ 待复核
            </div>
          )}
            {(vehicle.latestRecord.disposalNotes || vehicle.latestRecord.packageNotes) && (
            <div style={{
              marginTop: 6, padding: '6px 10px', borderRadius: 6,
              background: 'var(--bg-secondary)', fontSize: 11, color: 'var(--text-secondary)',
              lineHeight: 1.5, maxHeight: 48, overflow: 'hidden'
            }}>
              {vehicle.latestRecord.disposalNotes && (
                <div><span style={{ color: 'var(--text-muted)' }}>处置：</span>{vehicle.latestRecord.disposalNotes}</div>
              )}
              {vehicle.latestRecord.packageNotes && (
                <div style={{ marginTop: 2 }}><span style={{ color: 'var(--text-muted)' }}>包装：</span>{vehicle.latestRecord.packageNotes}</div>
              )}
            </div>
          )}
          </>
        ) : (
          <>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: vehicle.etaMinutes <= 10 ? 'var(--accent-blue)' : 'var(--text-primary)',
              fontFamily: 'monospace',
              marginBottom: 2
            }}>
              {etaTime}
            </div>
            <div style={{
              fontSize: 11,
              color: vehicle.etaMinutes <= 10 ? 'var(--accent-blue)' : 'var(--text-muted)'
            }}>
              {formatEta(vehicle.etaMinutes)}
            </div>
            {vehicle.assignedDock && (
              <div style={{
                marginTop: 4,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(79, 195, 247, 0.15)',
                color: 'var(--accent-blue)',
                fontSize: 11,
                display: 'inline-block'
              }}>
                月台 #{vehicle.assignedDock}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <button
          className="btn btn-sm btn-outline"
          onClick={onViewDetail}
        >
          详情
        </button>
        {!isReceived && (
          <button
            className={`btn btn-sm ${vehicle.riskLevel === 'critical' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onStartReceiving}
          >
            开始收货
          </button>
        )}
      </div>
    </div>
  );
}
