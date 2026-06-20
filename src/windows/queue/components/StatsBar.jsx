import React from 'react';

export default function StatsBar({ stats }) {
  const items = [
    { label: '待处理', value: stats.total, color: 'var(--text-primary)' },
    { label: '严重回温', value: stats.critical, color: 'var(--risk-critical)' },
    { label: '回温预警', value: stats.warning, color: 'var(--risk-warning)' },
    { label: '10分钟内到达', value: stats.approaching, color: 'var(--accent-blue)' }
  ];

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {items.map(item => (
        <div key={item.label} style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 22,
            fontWeight: 600,
            color: item.color,
            lineHeight: 1.2
          }}>
            {item.value}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginTop: 2
          }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
