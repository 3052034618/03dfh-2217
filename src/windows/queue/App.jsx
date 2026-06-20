import React, { useState, useEffect } from 'react';
import { ensureBridge } from '../../mock/initBridge.js';
import VehicleCard from './components/VehicleCard.jsx';
import StatsBar from './components/StatsBar.jsx';

const RISK_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'critical', label: '严重' },
  { key: 'warning', label: '预警' },
  { key: 'attention', label: '关注' },
  { key: 'normal', label: '正常' }
];

const STATUS_LABELS = {
  en_route: '在途',
  approaching: '即将到达',
  waiting: '等待入场'
};

export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortByRisk, setSortByRisk] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bridge = ensureBridge();
    const { vehicles: vehiclesAPI } = bridge;
    const loadData = async () => {
      setLoading(true);
      const data = await vehiclesAPI.getAll();
      setVehicles(data);
      setLoading(false);
    };
    loadData();

    vehiclesAPI.onUpdated((updated) => {
      setVehicles([...updated]);
    });

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filteredVehicles = vehicles
    .filter(v => filter === 'all' ? true : v.riskLevel === filter)
    .sort((a, b) => sortByRisk ? (b.riskScore - a.riskScore) : (a.etaMinutes - b.etaMinutes));

  const stats = {
    total: vehicles.length,
    critical: vehicles.filter(v => v.riskLevel === 'critical').length,
    warning: vehicles.filter(v => v.riskLevel === 'warning').length,
    approaching: vehicles.filter(v => v.etaMinutes <= 10).length
  };

  const handleViewDetail = (id) => {
    ensureBridge().window.openDetail(id);
  };

  const handleStartReceiving = (id) => {
    ensureBridge().window.openRecord(id);
  };

  const formatTime = (date) => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)'
    }}>
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
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #00bcd4, #4fc3f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22
          }}>❄</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 2 }}>冷链月台调度系统</h1>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              收货班组 · 车辆到队监控
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <StatsBar stats={stats} />
          <button
            className="btn btn-outline"
            onClick={() => ensureBridge().window.openHistory()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>📋</span>
            今日处置记录
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 300, color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {formatDate(currentTime)}
            </div>
          </div>
        </div>
      </header>

      <div style={{
        padding: '12px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {RISK_FILTERS.map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span style={{
                marginLeft: 4,
                padding: '0 6px',
                borderRadius: 8,
                background: filter === f.key ? 'rgba(0,0,0,0.2)' : 'var(--bg-hover)',
                fontSize: 11
              }}>
                {f.key === 'all' ? vehicles.length : vehicles.filter(v => v.riskLevel === f.key).length}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={sortByRisk}
              onChange={(e) => setSortByRisk(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            按回温风险优先排序
          </label>
        </div>
      </div>

      <div style={{
        padding: '8px 24px 4px',
        display: 'grid',
        gridTemplateColumns: '120px 180px 1fr 140px 120px 140px 200px',
        gap: 12,
        fontSize: 12,
        color: 'var(--text-muted)',
        fontWeight: 500
      }}>
        <div>优先级</div>
        <div>车辆信息</div>
        <div>货品 / 温度监控</div>
        <div>在途最高温</div>
        <div>升温趋势</div>
        <div>预计到达</div>
        <div style={{ textAlign: 'right' }}>操作</div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 24px 24px'
      }}>
        {loading ? (
          <EmptyState
            icon="⏳"
            title="正在获取队列数据中..."
            description="正在加载到车队列，稍候片刻"
          />
        ) : filteredVehicles.length === 0 ? (
          filter === 'all' ? (
          <EmptyState
            icon="🚚"
            title="今天没有待处理的车辆"
            description={`当前时间 ${formatTime(currentTime)}，暂无车辆在途或等待入场。值班员可以先休息一下，新的车辆任务会自动进入队列。如果是早班刚上班或晚班已清场的话，稍后会出现这种情况。`}
          />
        ) : (
          <EmptyState
            icon="🔍"
            title={`没有「${RISK_FILTERS.find(f => f.key === filter)?.label || filter}」等级的车辆`}
            description={`目前共有 ${vehicles.length} 辆车在队列中。当前筛选等级为「${RISK_FILTERS.find(f => f.key === filter)?.label}」，此等级下暂无车辆，试试切换筛选或`}
            actionText="查看全部车辆"
            onAction={() => setFilter('all')}
          />
        )) : (
          filteredVehicles.map((vehicle, index) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              priority={index + 1}
              onViewDetail={() => handleViewDetail(vehicle.id)}
              onStartReceiving={() => handleStartReceiving(vehicle.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, actionText, onAction }) {
  return (
    <div style={{
      height: '100%', minHeight: 350,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 14
    }}>
      <div style={{ fontSize: 56, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, textAlign: 'center', whiteSpace: 'pre-line' }}>
        {description}
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary btn-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
