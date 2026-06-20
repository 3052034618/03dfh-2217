import React, { useState, useEffect, useMemo } from 'react';
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

const DISPOSAL_COLORS = {
  accept: 'var(--risk-normal)',
  conditional: 'var(--risk-attention)',
  quarantine: 'var(--risk-warning)',
  reject: 'var(--risk-critical)'
};

const RISK_COLORS = {
  critical: 'var(--risk-critical)',
  warning: 'var(--risk-warning)',
  attention: 'var(--risk-attention)',
  normal: 'var(--risk-normal)'
};

export default function App() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plateSearch, setPlateSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [disposalFilter, setDisposalFilter] = useState('all');

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

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => r.arrivalDate === today)
      .filter(r => riskFilter === 'all' ? true : r.riskLevel === riskFilter)
      .filter(r => disposalFilter === 'all' ? true : r.disposalDecision === disposalFilter)
      .filter(r => plateSearch.trim() === ''
        ? true
        : r.plateNumber.toLowerCase().includes(plateSearch.trim().toLowerCase()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [records, plateSearch, riskFilter, disposalFilter, today]);

  const stats = useMemo(() => {
    const todayRecords = records.filter(r => r.arrivalDate === today);
    return {
      total: todayRecords.length,
      critical: todayRecords.filter(r => r.riskLevel === 'critical').length,
      accept: todayRecords.filter(r => r.disposalDecision === 'accept').length,
      conditional: todayRecords.filter(r => r.disposalDecision === 'conditional').length,
      quarantine: todayRecords.filter(r => r.disposalDecision === 'quarantine').length,
      reject: todayRecords.filter(r => r.disposalDecision === 'reject').length
    };
  }, [records, today]);

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
            </div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleClose}>关闭</button>
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

      <div style={{
        padding: '8px 24px 4px',
        display: 'grid',
        gridTemplateColumns: '160px 220px 1fr 140px 140px 160px 140px',
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
        <div>处置决定</div>
        <div style={{ textAlign: 'right' }}>操作</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 24px' }}>
        {loading ? (
          <EmptyState
            icon="⏳"
            title="加载中..."
            description="正在获取今日处置记录"
          />
        ) : filteredRecords.length === 0 ? (
          records.length === 0 ? (
            <EmptyState
              icon="📭"
              title="今天还没有处置记录"
              description="完成收货登记后，记录会显示在这里"
            />
          ) : (
            <EmptyState
              icon="🔍"
              title="没有符合筛选条件的记录"
              description="试试调整筛选条件，或点击"
              actionText="重置筛选"
              onAction={handleResetFilters}
            />
          )
        ) : (
          filteredRecords.map(record => (
            <RecordRow
              key={record.id}
              record={record}
              onViewDetail={() => handleViewDetail(record.vehicleId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RecordRow({ record, onViewDetail }) {
  const time = new Date(record.createdAt);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;

  return (
    <div
      style={{
        margin: '6px 0',
        padding: 14,
        borderRadius: 10,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        display: 'grid',
        gridTemplateColumns: '160px 220px 1fr 140px 140px 160px 140px',
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
            {record.riskLevel === 'critical' ? '严重' :
             record.riskLevel === 'warning' ? '预警' :
             record.riskLevel === 'attention' ? '关注' : '正常'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          👤 {record.driver}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 4,
            background: 'var(--bg-hover)', fontSize: 12, fontWeight: 500
          }}>
            {record.productName}
          </span>
          <span style={{
            fontSize: 12, color: record.isOverThreshold ? 'var(--risk-critical)' : 'var(--risk-normal)'
          }}>
            {record.isOverThreshold ? `超阈值 ${record.tempDiff}℃` : '温度合格'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          🏭 {record.supplier}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 20, fontWeight: 700, fontFamily: 'monospace',
          color: record.spotTemps.max > record.thresholdTemp ? 'var(--risk-critical)' : 'var(--risk-normal)'
        }}>
          {record.spotTemps.max}℃
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          阈值 {record.thresholdTemp}℃
        </div>
      </div>

      <div>
        <span style={{
          padding: '4px 10px', borderRadius: 4,
          background: `${RISK_COLORS[record.riskLevel]}20`,
          color: RISK_COLORS[record.riskLevel],
          fontSize: 12, fontWeight: 600
        }}>
          {record.riskLevel === 'critical' ? '严重回温' :
           record.riskLevel === 'warning' ? '回温预警' :
           record.riskLevel === 'attention' ? '关注' : '正常'}
        </span>
      </div>

      <div>
        <span style={{
          padding: '4px 10px', borderRadius: 4,
          background: `${DISPOSAL_COLORS[record.disposalDecision]}20`,
          color: DISPOSAL_COLORS[record.disposalDecision],
          fontSize: 12, fontWeight: 600
        }}>
          {record.disposalDecisionLabel}
        </span>
        {record.disposalNotes && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            marginTop: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 180
          }}>
            {record.disposalNotes}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-outline" onClick={onViewDetail}>
          查看详情
        </button>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, actionText, onAction }) {
  return (
    <div style={{
      height: '100%', minHeight: 300,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)',
      gap: 12
    }}>
      <div style={{ fontSize: 48, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</div>
      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        {description}
        {actionText && (
          <button
            onClick={onAction}
            style={{
              color: 'var(--accent-blue)',
              background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 13,
              textDecoration: 'underline',
              padding: 0
            }}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}
