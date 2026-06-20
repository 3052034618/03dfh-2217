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

  useEffect(() => {
    const bridge = ensureBridge();
    const { vehicles: vehiclesAPI } = bridge;
    const loadData = async () => {
      const data = await vehiclesAPI.getAll();
      setVehicles(data);
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
        {filteredVehicles.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            暂无符合条件的车辆
          </div>
        ) : (
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
