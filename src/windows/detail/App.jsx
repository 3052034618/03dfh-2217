import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { ensureBridge } from '../../mock/initBridge.js';

const SENSITIVE_PRODUCTS = ['VACCINE', 'ICE_CREAM', 'FROZEN_SEAFOOD'];

const TREND_SPEED = {
  rising_fast: { label: '快速上升', desc: '30分钟内升温超过3℃，制冷效率下降明显', severity: 'critical' },
  rising: { label: '缓慢上升', desc: '30分钟内升温1-3℃，需持续关注', severity: 'warning' },
  stable: { label: '温度稳定', desc: '温度波动在±1℃以内，制冷正常', severity: 'normal' },
  falling: { label: '温度下降', desc: '温度持续回落，制冷正常', severity: 'normal' }
};

function generateRiskReasons(vehicle) {
  const reasons = [];
  const tempDiff = vehicle.maxTemp - vehicle.thresholdTemp;

  if (tempDiff > 5) {
    reasons.push({
      icon: '🔥',
      title: `温度严重超标 ${tempDiff.toFixed(1)}℃`,
      desc: `在途最高温 ${vehicle.maxTemp}℃，远超阈值 ${vehicle.thresholdTemp}℃，货品已进入危险温区`,
      severity: 'critical',
      weight: 50
    });
  } else if (tempDiff > 3) {
    reasons.push({
      icon: '⚠️',
      title: `温度超标 ${tempDiff.toFixed(1)}℃`,
      desc: `在途最高温 ${vehicle.maxTemp}℃，超过阈值 ${vehicle.thresholdTemp}℃`,
      severity: 'warning',
      weight: 35
    });
  } else if (tempDiff > 0) {
    reasons.push({
      icon: '🌡️',
      title: `温度略超 ${tempDiff.toFixed(1)}℃`,
      desc: `在途最高温 ${vehicle.maxTemp}℃，略高于阈值 ${vehicle.thresholdTemp}℃`,
      severity: 'warning',
      weight: 20
    });
  } else if (tempDiff > -2) {
    reasons.push({
      icon: '📊',
      title: '温度接近阈值',
      desc: `在途最高温 ${vehicle.maxTemp}℃，距阈值 ${vehicle.thresholdTemp}℃ 仅 ${Math.abs(tempDiff).toFixed(1)}℃`,
      severity: 'attention',
      weight: 5
    });
  }

  const trendInfo = TREND_SPEED[vehicle.tempTrend];
  if (vehicle.tempTrend === 'rising_fast') {
    reasons.push({
      icon: '📈',
      title: `升温趋势：${trendInfo.label}`,
      desc: trendInfo.desc,
      severity: 'critical',
      weight: 35
    });
  } else if (vehicle.tempTrend === 'rising') {
    reasons.push({
      icon: '↗️',
      title: `升温趋势：${trendInfo.label}`,
      desc: trendInfo.desc,
      severity: 'warning',
      weight: 20
    });
  }

  if (SENSITIVE_PRODUCTS.includes(vehicle.productType)) {
    reasons.push({
      icon: '💊',
      title: `高敏感货品：${vehicle.productName}`,
      desc: `${vehicle.productName} 对温度波动极其敏感，轻微回温即可能影响品质`,
      severity: 'warning',
      weight: vehicle.productType === 'VACCINE' ? 15 : vehicle.productType === 'ICE_CREAM' ? 10 : 8
    });
  }

  return reasons.sort((a, b) => b.weight - a.weight);
}

const ACTION_ICONS = {
  dock: '🅿️',
  equipment: '🌡️',
  staff: '👥',
  backup: '🏭'
};

function generateSuggestedActions(riskLevel, productType, assignedDock, standardTemp, thresholdTemp) {
  const actions = [];
  
  if (assignedDock) {
    actions.push({
      priority: 1,
      type: 'dock',
      title: `优先安排 ${assignedDock} 号月台`,
      description: `此车风险等级较高，请立即开启 ${assignedDock} 号月台并预冷至 ${standardTemp}℃`
    });
  } else {
    actions.push({
      priority: 1,
      type: 'dock',
      title: '立即安排月台',
      description: `请尽快指派空闲月台，建议选择靠近质检区的位置，预冷至 ${standardTemp}℃`
    });
  }
  
  actions.push({
    priority: 2,
    type: 'equipment',
    title: '准备测温设备',
    description: '取出红外测温枪与探针温度计，确认电量充足并校准完毕'
  });
  
  if (riskLevel === 'critical') {
    actions.push({
      priority: 3,
      type: 'staff',
      title: '紧急通知质检员到场',
      description: '此车存在严重回温风险，请质检员立即到位，准备加严抽检方案'
    });
    actions.push({
      priority: 4,
      type: 'backup',
      title: '准备应急冷库位',
      description: '如检测不合格需立即转仓，请预先确认-25℃应急冷库有可用库容'
    });
  } else if (riskLevel === 'warning') {
    actions.push({
      priority: 3,
      type: 'staff',
      title: '通知质检员待命',
      description: '此车有回温风险，请质检员在车辆到达前5分钟到位准备抽检'
    });
  } else {
    actions.push({
      priority: 3,
      type: 'staff',
      title: '安排常规质检流程',
      description: '按照标准抽检流程安排收货组与质检员'
    });
  }
  
  return actions.sort((a, b) => a.priority - b.priority);
}

export default function App() {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [latestRecord, setLatestRecord] = useState(null);
  const [vehicleRecords, setVehicleRecords] = useState([]);

  useEffect(() => {
    const bridge = ensureBridge();
    const { vehicles: vehiclesAPI, records: recordsAPI } = bridge;
    const handleSelected = async (id) => {
      setLoading(true);
      const data = await vehiclesAPI.getById(id);
      setVehicle(data);
      setLatestRecord(data?.latestRecord || null);

      const recs = await recordsAPI.getByVehicleId(id);
      setVehicleRecords(recs);

      setLoading(false);
    };

    vehiclesAPI.onSelected(handleSelected);
    vehiclesAPI.onVehicleUpdated((v) => {
      setVehicle(prev => prev && prev.id === v.id ? { ...prev, ...v } : prev);
      if (v.latestRecord) {
        setLatestRecord(v.latestRecord);
      }
    });

    recordsAPI.onCreated((rec) => {
      if (vehicle && rec.vehicleId === vehicle.id) {
        setLatestRecord(rec);
        setVehicleRecords(prev => [rec, ...prev]);
      }
    });

    if (window.mockVehicleId) {
      handleSelected(window.mockVehicleId);
    }

    return () => {};
  }, [vehicle]);

  const handleClose = () => {
    ensureBridge().window.closeDetail();
  };

  const handleStartReceiving = () => {
    if (vehicle) {
      ensureBridge().window.openRecord(vehicle.id);
    }
  };

  if (loading && !vehicle) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)'
      }}>
        加载中...
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)'
      }}>
        请从队列选择一辆车查看详情
      </div>
    );
  }

  const suggestedActions = generateSuggestedActions(
    vehicle.riskLevel,
    vehicle.productType,
    vehicle.assignedDock,
    vehicle.standardTemp,
    vehicle.thresholdTemp
  );

  const etaDate = new Date(vehicle.eta);
  const etaTime = `${String(etaDate.getHours()).padStart(2, '0')}:${String(etaDate.getMinutes()).padStart(2, '0')}`;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <header style={{
        padding: '16px 24px',
        background: vehicle.riskLevel === 'critical'
          ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), var(--bg-secondary))'
          : vehicle.riskLevel === 'warning'
            ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), var(--bg-secondary))'
            : 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${
              vehicle.riskLevel === 'critical' ? '#ef4444' :
              vehicle.riskLevel === 'warning' ? '#f59e0b' :
              vehicle.riskLevel === 'attention' ? '#eab308' : '#22c55e'
            }, ${
              vehicle.riskLevel === 'critical' ? '#dc2626' :
              vehicle.riskLevel === 'warning' ? '#d97706' :
              vehicle.riskLevel === 'attention' ? '#ca8a04' : '#16a34a'
            })`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            color: 'white'
          }}>
            🚚
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>{vehicle.plateNumber}</h2>
              <span className={`badge badge-${vehicle.riskLevel}`}>
                {vehicle.riskLevel === 'critical' ? '严重回温' :
                 vehicle.riskLevel === 'warning' ? '回温预警' :
                 vehicle.riskLevel === 'attention' ? '关注' : '正常'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {vehicle.trailerType} · 订单号 {vehicle.orderNo}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={handleClose}>关闭</button>
          <button
            className={`btn ${vehicle.riskLevel === 'critical' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleStartReceiving}
          >
            开始收货
          </button>
        </div>
      </header>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 20
      }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--accent-blue)' }}>
            📋 基本信息
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16
          }}>
            <InfoItem label="供应商" value={vehicle.supplier} />
            <InfoItem label="司机" value={vehicle.driver} />
            <InfoItem label="联系电话" value={vehicle.phone} />
            <InfoItem label="货品类别" value={vehicle.productName} highlight />
            <InfoItem label="在途最高温" value={`${vehicle.maxTemp}℃`}
              valueColor={vehicle.maxTemp > vehicle.thresholdTemp ? 'var(--risk-critical)' : 'var(--risk-normal)'} />
            <InfoItem label="温度阈值" value={`${vehicle.thresholdTemp}℃`} />
            <InfoItem label="标准温度" value={`${vehicle.standardTemp}℃`} />
            <InfoItem label="升温趋势" value={vehicle.trendLabel} />
            <InfoItem label="货物重量" value={`${vehicle.weight} 吨`} />
            <InfoItem label="托盘数量" value={`${vehicle.pallets} 个`} />
            <InfoItem label="风险评分" value={`${vehicle.riskScore} 分`}
              valueColor={vehicle.riskScore >= 60 ? 'var(--risk-critical)' :
                         vehicle.riskScore >= 35 ? 'var(--risk-warning)' : 'var(--risk-normal)'} />
            <InfoItem label="预计到达" value={etaTime} highlight />
          </div>
        </div>

        <RiskReasonCard vehicle={vehicle} />

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--accent-blue)' }}>
            📈 最近30分钟温度趋势
          </h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vehicle.temperatureHistory || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  interval={4}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v}℃`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  formatter={(value) => [`${value}℃`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  y={vehicle.thresholdTemp}
                  stroke="var(--risk-warning)"
                  strokeDasharray="5 5"
                  label={{ value: '阈值', position: 'right', fontSize: 11, fill: 'var(--risk-warning)' }}
                />
                <ReferenceLine
                  y={vehicle.standardTemp}
                  stroke="var(--accent-blue)"
                  strokeDasharray="3 3"
                  label={{ value: '标准', position: 'left', fontSize: 11, fill: 'var(--accent-blue)' }}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  name="厢内温度"
                  stroke={vehicle.riskLevel === 'critical' ? '#ef4444' :
                          vehicle.riskLevel === 'warning' ? '#f59e0b' : '#22c55e'}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {latestRecord && (
          <LatestRecordCard record={latestRecord} />
        )}

        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--accent-blue)' }}>
            ⚡ 建议动作
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestedActions.map((action, idx) => (
              <div
                key={idx}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${action.priority <= 2 ? 'var(--border-color)' : 'var(--border-color)'}`,
                  borderLeft: `4px solid ${
                    action.type === 'dock' ? 'var(--accent-blue)' :
                    action.type === 'equipment' ? 'var(--risk-warning)' :
                    action.type === 'staff' ? 'var(--status-approaching)' : 'var(--risk-critical)'
                  }`,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start'
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--bg-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0
                }}>
                  {ACTION_ICONS[action.type] || '📌'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 4
                  }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: action.priority <= 2 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-hover)',
                      color: action.priority <= 2 ? 'var(--risk-critical)' : 'var(--text-secondary)'
                    }}>
                      P{action.priority}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{action.title}</span>
                  </div>
                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6
                  }}>
                    {action.description}
                  </p>
                </div>
                <div>
                  <input
                    type="checkbox"
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskReasonCard({ vehicle }) {
  const reasons = generateRiskReasons(vehicle);
  if (reasons.length === 0) return null;

  const SEVERITY_COLORS = {
    critical: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: 'var(--risk-critical)' },
    warning: { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.3)', text: 'var(--risk-warning)' },
    attention: { bg: 'rgba(234, 179, 8, 0.10)', border: 'rgba(234, 179, 8, 0.3)', text: 'var(--risk-attention)' },
    normal: { bg: 'rgba(34, 197, 94, 0.10)', border: 'rgba(34, 197, 94, 0.3)', text: 'var(--risk-normal)' }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--accent-blue)' }}>
        ⚠️ 风险原因说明
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reasons.map((reason, idx) => {
          const style = SEVERITY_COLORS[reason.severity] || SEVERITY_COLORS.normal;
          return (
            <div
              key={idx}
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: style.bg,
                border: `1px solid ${style.border}`,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}
            >
              <div style={{ fontSize: 20, flexShrink: 0 }}>{reason.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: style.text,
                  marginBottom: 2
                }}>
                  {reason.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {reason.desc}
                </div>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 4,
                background: style.border,
                color: style.text
              }}>
                +{reason.weight}分
              </div>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 12, paddingTop: 12,
        borderTop: '1px dashed var(--border-color)',
        fontSize: 12, color: 'var(--text-muted)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>风险评分合计：<strong style={{ color: vehicle.riskScore >= 60 ? 'var(--risk-critical)' : vehicle.riskScore >= 35 ? 'var(--risk-warning)' : 'var(--text-primary)' }}>{vehicle.riskScore}</strong> / 100 分</span>
        <span>优先级：{vehicle.riskLevel === 'critical' ? 'P0 最高优先' : vehicle.riskLevel === 'warning' ? 'P1 高优先' : vehicle.riskLevel === 'attention' ? 'P2 关注' : 'P3 正常'}</span>
      </div>
    </div>
  );
}

function LatestRecordCard({ record }) {
  const DISPOSAL_COLORS = {
    accept: 'var(--risk-normal)',
    conditional: 'var(--risk-attention)',
    quarantine: 'var(--risk-warning)',
    reject: 'var(--risk-critical)'
  };
  const DISPOSAL_LABELS = {
    accept: '正常入库',
    conditional: '条件入库',
    quarantine: '隔离质检',
    reject: '拒收退回'
  };
  const NEED_REVIEW = ['quarantine', 'reject'];
  const QUALITY_STATUS = {
    pending_review: { label: '待复核', color: 'var(--risk-warning)', bg: 'rgba(245, 158, 11, 0.15)' },
    under_qc: { label: '质检中', color: 'var(--risk-warning)', bg: 'rgba(245, 158, 11, 0.15)' },
    sampling: { label: '已抽样', color: 'var(--risk-attention)', bg: 'rgba(251, 191, 36, 0.15)' },
    qc_complete: { label: '质检完成', color: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.15)' },
    released: { label: '放行入库', color: 'var(--risk-normal)', bg: 'rgba(34, 197, 94, 0.15)' },
    returned: { label: '已退回', color: 'var(--risk-critical)', bg: 'rgba(239, 68, 68, 0.15)' }
  };

  const time = new Date(record.createdAt);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  const isOver = record.isOverThreshold || (record.spotTemps?.max > record.thresholdTemp);
  const tempDiff = record.tempDiff != null ? record.tempDiff : (record.spotTemps?.max - record.thresholdTemp).toFixed(1);
  const hasReviewed = !!record.review;
  const canReview = NEED_REVIEW.includes(record.disposalDecision) && !hasReviewed;
  const qs = record.qualityStatus;
  const qsInfo = qs ? QUALITY_STATUS[qs] : null;
  const followUps = record.followUps || [];
  const sortedFollowUps = followUps.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--accent-blue)' }}>
        ✅ 最新收货记录
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
          生成于 {record.arrivalDate} {timeStr} · {record.id}
        </span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>处置决定</div>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: DISPOSAL_COLORS[record.disposalDecision]
          }}>
            {record.disposalDecisionLabel || DISPOSAL_LABELS[record.disposalDecision] || record.disposalDecision}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>抽检最高温</div>
          <div style={{
            fontSize: 16, fontWeight: 700, fontFamily: 'monospace',
            color: isOver ? 'var(--risk-critical)' : 'var(--risk-normal)'
          }}>
            {record.spotTemps?.max}℃
            {isOver && (
              <span style={{ fontSize: 11, marginLeft: 4, fontWeight: 500 }}>
                超 {tempDiff}℃
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            标准 {record.standardTemp}℃ · 阈值 {record.thresholdTemp}℃
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>外包装状态</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{record.packageConditionLabel || record.packageCondition}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>收货员</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{record.receiverName || '未记录'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>到车时间</div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 500 }}>{record.arrivalTime || '-'}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            开门前 {record.doorOpenTemp != null ? record.doorOpenTemp + '℃' : '未记录'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {record.disposalNotes && (
          <div style={{
            flex: 1, minWidth: 260,
            padding: '10px 14px',
            borderRadius: 6,
            background: 'var(--bg-secondary)',
            fontSize: 12, color: 'var(--text-secondary)'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>处置说明：</span>
            {record.disposalNotes}
          </div>
        )}
        {record.packageNotes && (
          <div style={{
            flex: 1, minWidth: 260,
            padding: '10px 14px',
            borderRadius: 6,
            background: 'var(--bg-secondary)',
            fontSize: 12, color: 'var(--text-secondary)'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>包装备注：</span>
            {record.packageNotes}
          </div>
        )}
      </div>

      {canReview && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          fontSize: 12,
          color: 'var(--risk-warning)'
        }}>
          ⚠ 此车为【{DISPOSAL_LABELS[record.disposalDecision]}】，待质检主管复核。请在「今日处置记录」中发起复核。
        </div>
      )}

      {hasReviewed && (
        <div style={{
          padding: 14,
          borderRadius: 10,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          marginTop: 4
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--risk-normal)' }}>
              ✓ 复核信息
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(record.review.reviewedAt).toLocaleString('zh-CN')}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>复核结论</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{record.review.conclusionLabel}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>复核人</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{record.review.reviewer}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>后续动作</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{record.review.nextActionLabel}</div>
            </div>
          </div>
          {record.review.note && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              borderRadius: 6,
              background: 'var(--bg-primary)',
              fontSize: 12, color: 'var(--text-secondary)'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>复核备注：</span>
              {record.review.note}
            </div>
          )}
        </div>
      )}

      {qsInfo && sortedFollowUps.length > 0 && (
        <div style={{
          padding: 14,
          borderRadius: 10,
          background: qsInfo.bg,
          border: `1px solid ${qsInfo.color}44`,
          marginTop: 12
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: qsInfo.color }}>
              📊 质检跟进过程
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 6,
              fontSize: 12, fontWeight: 500,
              color: qsInfo.color, background: 'rgba(255,255,255,0.85)'
            }}>
              当前：{qsInfo.label}
            </div>
          </div>
          <div style={{ position: 'relative', paddingLeft: 20, paddingTop: 4 }}>
            <div style={{
              position: 'absolute', left: 8, top: 6, bottom: 6,
              width: 2, background: `${qsInfo.color}55`
            }} />
            {sortedFollowUps.map((fu, idx) => (
              <div key={fu.id || idx} style={{ position: 'relative', marginBottom: 12, paddingLeft: 14 }}>
                <div style={{
                  position: 'absolute', left: -17, top: 3,
                  width: 12, height: 12, borderRadius: '50%',
                  background: fu.type === 'register' ? 'var(--accent-blue)' :
                             fu.type === 'review' ? 'var(--risk-normal)' :
                             fu.type === 'status_change' ? qsInfo.color :
                             'var(--text-muted)',
                  boxShadow: '0 0 0 3px var(--bg-card)'
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fu.typeLabel || fu.type}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {fu.operator} · {new Date(fu.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
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
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, valueColor, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: 13,
        fontWeight: highlight ? 600 : 500,
        color: valueColor || (highlight ? 'var(--accent-blue)' : 'var(--text-primary)')
      }}>
        {value}
      </div>
    </div>
  );
}
