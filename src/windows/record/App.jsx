import React, { useState, useEffect } from 'react';
import { ensureBridge } from '../../mock/initBridge.js';

const PACKAGE_CONDITIONS = [
  { value: 'excellent', label: '完好', color: 'var(--risk-normal)' },
  { value: 'good', label: '轻微破损', color: 'var(--risk-attention)' },
  { value: 'damaged', label: '严重破损', color: 'var(--risk-warning)' },
  { value: 'contaminated', label: '污染/水渍', color: 'var(--risk-critical)' }
];

const DISPOSAL_OPTIONS = [
  { value: 'accept', label: '正常入库' },
  { value: 'conditional', label: '条件入库（需隔离观察）' },
  { value: 'reject', label: '拒收退回' },
  { value: 'quarantine', label: '隔离质检后决定' }
];

export default function App() {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [record, setRecord] = useState(null);

  const [form, setForm] = useState({
    arrivalTime: '',
    preOpenTemp: '',
    spotCheckTemp1: '',
    spotCheckTemp2: '',
    spotCheckTemp3: '',
    packageCondition: 'excellent',
    packageNotes: '',
    disposalDecision: 'accept',
    disposalNotes: '',
    receiverName: '',
    inspectorName: '',
    dockNumber: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const bridge = ensureBridge();
    const { vehicles: vehiclesAPI, records: recordsAPI } = bridge;
    const handleInit = async (id) => {
      setLoading(true);
      setSubmitted(false);
      const data = await vehiclesAPI.getById(id);
      setVehicle(data);
      
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      setForm(prev => ({
        ...prev,
        arrivalTime: timeStr,
        preOpenTemp: data ? data.maxTemp.toString() : '',
        dockNumber: data?.assignedDock ? data.assignedDock.toString() : ''
      }));
      setLoading(false);
    };

    recordsAPI.onInit(handleInit);

    if (window.mockVehicleId) {
      handleInit(window.mockVehicleId);
    }

    return () => {};
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.arrivalTime) newErrors.arrivalTime = '请填写到车时间';
    if (!form.preOpenTemp || isNaN(parseFloat(form.preOpenTemp))) newErrors.preOpenTemp = '请填写有效的开门前温度';
    if (!form.spotCheckTemp1 || isNaN(parseFloat(form.spotCheckTemp1))) newErrors.spotCheckTemp1 = '请填写抽检温度1';
    if (!form.packageCondition) newErrors.packageCondition = '请选择外包装状态';
    if (!form.disposalDecision) newErrors.disposalDecision = '请选择处置意见';
    if (!form.receiverName.trim()) newErrors.receiverName = '请填写收货员姓名';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calcAvgTemp = () => {
    const temps = [form.spotCheckTemp1, form.spotCheckTemp2, form.spotCheckTemp3]
      .filter(t => t && !isNaN(parseFloat(t)))
      .map(t => parseFloat(t));
    if (temps.length === 0) return null;
    return parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
  };

  const handleSubmit = async () => {
    if (!validateForm() || !vehicle) return;
    ensureBridge();

    const avgTemp = calcAvgTemp();
    const maxSpot = Math.max(
      parseFloat(form.spotCheckTemp1),
      parseFloat(form.spotCheckTemp2 || form.spotCheckTemp1),
      parseFloat(form.spotCheckTemp3 || form.spotCheckTemp1)
    );

    let finalDecision = form.disposalDecision;
    if (maxSpot > vehicle.thresholdTemp + 3) {
      finalDecision = form.disposalDecision === 'accept' ? 'quarantine' : form.disposalDecision;
    }

    const recordData = {
      vehicleId: vehicle.id,
      plateNumber: vehicle.plateNumber,
      supplier: vehicle.supplier,
      productType: vehicle.productType,
      productName: vehicle.productName,
      driver: vehicle.driver,
      arrivalTime: form.arrivalTime,
      arrivalDate: new Date().toISOString().split('T')[0],
      preOpenTemp: parseFloat(form.preOpenTemp),
      spotTemps: {
        t1: parseFloat(form.spotCheckTemp1),
        t2: form.spotCheckTemp2 ? parseFloat(form.spotCheckTemp2) : null,
        t3: form.spotCheckTemp3 ? parseFloat(form.spotCheckTemp3) : null,
        avg: avgTemp,
        max: maxSpot
      },
      packageCondition: form.packageCondition,
      packageConditionLabel: PACKAGE_CONDITIONS.find(c => c.value === form.packageCondition)?.label,
      packageNotes: form.packageNotes,
      disposalDecision: finalDecision,
      disposalDecisionLabel: DISPOSAL_OPTIONS.find(d => d.value === finalDecision)?.label,
      disposalNotes: form.disposalNotes,
      receiverName: form.receiverName,
      inspectorName: form.inspectorName,
      dockNumber: form.dockNumber ? parseInt(form.dockNumber) : null,
      maxInTransitTemp: vehicle.maxTemp,
      thresholdTemp: vehicle.thresholdTemp,
      standardTemp: vehicle.standardTemp,
      riskLevel: vehicle.riskLevel,
      isOverThreshold: maxSpot > vehicle.thresholdTemp,
      tempDiff: (maxSpot - vehicle.thresholdTemp).toFixed(1)
    };

    const bridge = ensureBridge();
    const { records: recordsAPI, vehicles: vehiclesAPI } = bridge;
    const result = await recordsAPI.create(recordData);
    setRecord(result);
    setSubmitted(true);

    await vehiclesAPI.updateStatus(vehicle.id, 'received');
  };

  const handleClose = () => {
    ensureBridge().window.closeRecord();
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

  if (submitted && record) {
    return <RecordPreview record={record} onClose={handleClose} />;
  }

  const avgTemp = calcAvgTemp();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: '#0f1419'
          }}>
            📝
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 3 }}>收货登记</h2>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              车辆已进场，请填写实际检测数据
            </div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleClose}>取消</button>
      </header>

      {vehicle && (
        <div style={{
          padding: '12px 24px',
          background: vehicle.riskLevel === 'critical' ? 'rgba(239, 68, 68, 0.08)' :
                      vehicle.riskLevel === 'warning' ? 'rgba(245, 158, 11, 0.06)' :
                      'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>车牌号</div>
            <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              {vehicle.plateNumber}
              <span className={`badge badge-${vehicle.riskLevel}`}>
                {vehicle.riskLevel === 'critical' ? '严重回温' :
                 vehicle.riskLevel === 'warning' ? '回温预警' : '正常'}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>货品</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{vehicle.productName}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>在途最高温</div>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: vehicle.maxTemp > vehicle.thresholdTemp ? 'var(--risk-critical)' : 'var(--risk-normal)',
              fontFamily: 'monospace'
            }}>
              {vehicle.maxTemp}℃ <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(阈值 {vehicle.thresholdTemp}℃)</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>供应商</div>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vehicle.supplier}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="⏰">到车与月台信息</SectionTitle>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }}>
            <FormField
              label="到车时间"
              required
              error={errors.arrivalTime}
            >
              <input
                type="time"
                value={form.arrivalTime}
                onChange={(e) => handleChange('arrivalTime', e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField
              label="月台号"
              hint="如3号月台则填3"
            >
              <input
                type="number"
                min="1"
                max="20"
                placeholder="请输入月台号"
                value={form.dockNumber}
                onChange={(e) => handleChange('dockNumber', e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="🌡️">温度检测记录</SectionTitle>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 16,
            marginBottom: 16
          }}>
            <FormField
              label="开门前厢温 (℃)"
              required
              error={errors.preOpenTemp}
              hint="红外测温记录"
            >
              <input
                type="number"
                step="0.1"
                placeholder="如 -15.3"
                value={form.preOpenTemp}
                onChange={(e) => handleChange('preOpenTemp', e.target.value)}
                style={{
                  ...inputStyle,
                  ...(form.preOpenTemp && vehicle && parseFloat(form.preOpenTemp) > vehicle.thresholdTemp
                    ? { borderColor: 'var(--risk-critical)', background: 'rgba(239, 68, 68, 0.05)' }
                    : {})
                }}
              />
            </FormField>
            <FormField
              label="抽检温度 1 (℃)"
              required
              error={errors.spotCheckTemp1}
              hint="探针插入货品中心"
            >
              <input
                type="number"
                step="0.1"
                placeholder="如 -14.0"
                value={form.spotCheckTemp1}
                onChange={(e) => handleChange('spotCheckTemp1', e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField
              label="抽检温度 2 (℃)"
              hint="选填，抽样检测"
            >
              <input
                type="number"
                step="0.1"
                placeholder="选填"
                value={form.spotCheckTemp2}
                onChange={(e) => handleChange('spotCheckTemp2', e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }}>
            <FormField
              label="抽检温度 3 (℃)"
              hint="选填，抽样检测"
            >
              <input
                type="number"
                step="0.1"
                placeholder="选填"
                value={form.spotCheckTemp3}
                onChange={(e) => handleChange('spotCheckTemp3', e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>抽检平均温度</div>
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: 20,
                fontWeight: 600,
                fontFamily: 'monospace',
                color: avgTemp !== null && vehicle && avgTemp > vehicle.thresholdTemp ? 'var(--risk-critical)' : 'var(--risk-normal)'
              }}>
                {avgTemp !== null ? `${avgTemp}℃` : '--'}
                {vehicle && avgTemp !== null && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                    {avgTemp > vehicle.thresholdTemp
                      ? `超阈值 +${(avgTemp - vehicle.thresholdTemp).toFixed(1)}℃`
                      : `低于阈值 ${(vehicle.thresholdTemp - avgTemp).toFixed(1)}℃`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="📦">外包装检查</SectionTitle>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              外包装整体状态 <span style={{ color: 'var(--risk-critical)' }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PACKAGE_CONDITIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleChange('packageCondition', c.value)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: `2px solid ${form.packageCondition === c.value ? c.color : 'var(--border-color)'}`,
                    background: form.packageCondition === c.value ? `${c.color}20` : 'var(--bg-secondary)',
                    color: form.packageCondition === c.value ? c.color : 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: form.packageCondition === c.value ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {errors.packageCondition && (
              <div style={{ fontSize: 11, color: 'var(--risk-critical)', marginTop: 4 }}>
                {errors.packageCondition}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              备注说明（选填）
            </div>
            <textarea
              placeholder="如有异常请描述具体情况，如：第3排左侧托盘外包装轻微破损，无渗漏..."
              rows={3}
              value={form.packageNotes}
              onChange={(e) => handleChange('packageNotes', e.target.value)}
              style={{
                ...inputStyle,
                padding: 10,
                resize: 'vertical',
                minHeight: 80,
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="✅">处置意见</SectionTitle>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              处置决定 <span style={{ color: 'var(--risk-critical)' }}>*</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DISPOSAL_OPTIONS.map(d => (
                <label
                  key={d.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: form.disposalDecision === d.value ? 'var(--bg-hover)' : 'var(--bg-secondary)',
                    border: `1px solid ${form.disposalDecision === d.value ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="disposal"
                    checked={form.disposalDecision === d.value}
                    onChange={() => handleChange('disposalDecision', d.value)}
                    style={{ width: 15, height: 15, cursor: 'pointer' }}
                  />
                  {d.label}
                  {d.value === 'quarantine' && (
                    <span style={{ fontSize: 11, color: 'var(--risk-warning)', marginLeft: 'auto' }}>
                      系统建议：抽检温度超过阈值+3℃时推荐此项
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              处置说明（选填）
            </div>
            <textarea
              placeholder="填写处置原因或后续安排..."
              rows={2}
              value={form.disposalNotes}
              onChange={(e) => handleChange('disposalNotes', e.target.value)}
              style={{
                ...inputStyle,
                padding: 10,
                resize: 'vertical',
                minHeight: 60,
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        <div className="card">
          <SectionTitle icon="👥">人员确认</SectionTitle>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }}>
            <FormField label="收货员" required error={errors.receiverName}>
              <input
                type="text"
                placeholder="请输入收货员姓名"
                value={form.receiverName}
                onChange={(e) => handleChange('receiverName', e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField label="质检员" hint="如有质检员参与请填写">
              <input
                type="text"
                placeholder="请输入质检员姓名"
                value={form.inspectorName}
                onChange={(e) => handleChange('inspectorName', e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>
        </div>
      </div>

      <footer style={{
        padding: '14px 24px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          提交后将自动生成处置记录并同步到到车队列
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={handleClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            提交并生成记录
          </button>
        </div>
      </footer>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  transition: 'all 0.2s ease'
};

function SectionTitle({ icon, children }) {
  return (
    <h3 style={{
      fontSize: 14,
      fontWeight: 600,
      marginBottom: 14,
      color: 'var(--accent-blue)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      <span>{icon}</span>
      {children}
    </h3>
  );
}

function FormField({ label, required, error, hint, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--risk-critical)' }}> *</span>}
        {hint && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 11 }}>({hint})</span>}
      </div>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--risk-critical)', marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function RecordPreview({ record, onClose }) {
  const now = new Date(record.createdAt);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <header style={{
        padding: '16px 24px',
        background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.2), var(--bg-secondary))',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: 'white'
          }}>✓</div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 3 }}>处置记录已生成</h2>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              记录编号 {record.id} · 生成于 {timeStr}
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onClose}>完成并关闭</button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 12,
            borderBottom: '1px dashed var(--border-color)',
            marginBottom: 14
          }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {record.plateNumber} · {record.productName}
            </div>
            <span className={`badge ${record.isOverThreshold ? 'badge-warning' : 'badge-normal'}`}>
              {record.isOverThreshold ? `超阈值 ${record.tempDiff}℃` : '温度合格'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PreviewItem label="到车时间" value={`${record.arrivalDate} ${record.arrivalTime}`} />
            {record.dockNumber && <PreviewItem label="卸货月台" value={`${record.dockNumber} 号`} />}
            <PreviewItem label="供应商" value={record.supplier} />
            <PreviewItem label="司机" value={record.driver} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--accent-blue)' }}>🌡️ 温度检测结果</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
            marginBottom: 12
          }}>
            <TempCard title="在途最高温" value={`${record.maxInTransitTemp}℃`} subtitle={`阈值 ${record.thresholdTemp}℃`} highlight={record.maxInTransitTemp > record.thresholdTemp} />
            <TempCard title="开门前厢温" value={`${record.preOpenTemp}℃`} highlight={record.preOpenTemp > record.thresholdTemp} />
            <TempCard title="抽检最高温" value={`${record.spotTemps.max}℃`} highlight={record.spotTemps.max > record.thresholdTemp} />
            <TempCard title="抽检平均" value={`${record.spotTemps.avg}℃`} highlight={record.spotTemps.avg > record.thresholdTemp} />
            <TempCard title="标准温度" value={`${record.standardTemp}℃`} subtitle="目标值" />
          </div>
          <div style={{
            display: 'flex',
            gap: 10,
            fontSize: 12,
            color: 'var(--text-secondary)'
          }}>
            <span>抽检记录：</span>
            <span>第1点 {record.spotTemps.t1}℃</span>
            {record.spotTemps.t2 !== null && <span>第2点 {record.spotTemps.t2}℃</span>}
            {record.spotTemps.t3 !== null && <span>第3点 {record.spotTemps.t3}℃</span>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--accent-blue)' }}>📦 外包装与处置</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PreviewItem
              label="外包装状态"
              value={record.packageConditionLabel}
              valueColor={
                record.packageCondition === 'excellent' ? 'var(--risk-normal)' :
                record.packageCondition === 'good' ? 'var(--risk-attention)' :
                record.packageCondition === 'damaged' ? 'var(--risk-warning)' : 'var(--risk-critical)'
              }
            />
            <PreviewItem
              label="处置决定"
              value={record.disposalDecisionLabel}
              valueColor={
                record.disposalDecision === 'accept' ? 'var(--risk-normal)' :
                record.disposalDecision === 'conditional' ? 'var(--risk-attention)' :
                record.disposalDecision === 'quarantine' ? 'var(--risk-warning)' : 'var(--risk-critical)'
              }
            />
            {record.packageNotes && <PreviewItem label="包装备注" value={record.packageNotes} />}
            {record.disposalNotes && <PreviewItem label="处置说明" value={record.disposalNotes} />}
          </div>
        </div>

        <div className="card">
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--accent-blue)' }}>👥 人员签字</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>收货员</div>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                padding: '12px 0',
                borderBottom: '1px solid var(--border-color)'
              }}>
                {record.receiverName || '--'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>质检员</div>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                padding: '12px 0',
                borderBottom: '1px solid var(--border-color)'
              }}>
                {record.inspectorName || '--'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>登记时间</div>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                padding: '12px 0',
                borderBottom: '1px solid var(--border-color)',
                fontFamily: 'monospace'
              }}>
                {timeStr}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewItem({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: valueColor || 'var(--text-primary)' }}>
        {value || '--'}
      </div>
    </div>
  );
}

function TempCard({ title, value, subtitle, highlight }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 8,
      background: 'var(--bg-secondary)',
      border: `1px solid ${highlight ? 'var(--risk-warning)' : 'var(--border-color)'}`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{title}</div>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        fontFamily: 'monospace',
        color: highlight ? 'var(--risk-critical)' : 'var(--text-primary)'
      }}>
        {value}
      </div>
      {subtitle && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}
