import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

const { vehicles: vehiclesAPI, window: windowAPI } = window.electronAPI;

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

  useEffect(() => {
    const handleSelected = async (id) => {
      setLoading(true);
      const data = await vehiclesAPI.getById(id);
      setVehicle(data);
      setLoading(false);
    };

    vehiclesAPI.onSelected(handleSelected);
    vehiclesAPI.onVehicleUpdated((v) => {
      setVehicle(prev => prev && prev.id === v.id ? { ...prev, ...v } : prev);
    });

    if (window.mockVehicleId) {
      handleSelected(window.mockVehicleId);
    }

    return () => {};
  }, []);

  const handleClose = () => {
    windowAPI.closeDetail();
  };

  const handleStartReceiving = () => {
    if (vehicle) {
      windowAPI.openRecord(vehicle.id);
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
