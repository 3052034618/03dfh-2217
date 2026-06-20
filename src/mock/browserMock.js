function isRunningInElectron() {
  if (typeof window !== 'undefined' && window.electronAPI) return true;
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().indexOf('electron') > -1) return true;
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) return true;
  return false;
}

if (!isRunningInElectron()) {

function getProductInfo(code) {
  const PRODUCT_TYPES = [
    { code: 'FROZEN_MEAT', name: '冷冻肉类', standardTemp: -18, threshold: -12 },
    { code: 'FROZEN_SEAFOOD', name: '冷冻水产', standardTemp: -20, threshold: -15 },
    { code: 'CHILLED_VEGETABLE', name: '冷藏蔬菜', standardTemp: 4, threshold: 8 },
    { code: 'CHILLED_FRUIT', name: '冷藏水果', standardTemp: 5, threshold: 10 },
    { code: 'DAIRY', name: '乳制品', standardTemp: 4, threshold: 7 },
    { code: 'VACCINE', name: '疫苗/医药', standardTemp: 2, threshold: 5 },
    { code: 'ICE_CREAM', name: '冰淇淋', standardTemp: -22, threshold: -18 },
    { code: 'PREPARED_FOOD', name: '速冻食品', standardTemp: -18, threshold: -12 }
  ];
  return PRODUCT_TYPES.find(p => p.code === code) || PRODUCT_TYPES[0];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function calcRiskScore(maxTemp, threshold, tempTrend, productType) {
  let score = 0;
  const diff = maxTemp - threshold;
  if (diff > 5) score += 50;
  else if (diff > 3) score += 35;
  else if (diff > 0) score += 20;
  else if (diff > -2) score += 5;
  if (tempTrend === 'rising_fast') score += 35;
  else if (tempTrend === 'rising') score += 20;
  else if (tempTrend === 'stable') score += 5;
  else if (tempTrend === 'falling') score += -5;
  if (productType === 'VACCINE') score += 15;
  else if (productType === 'ICE_CREAM') score += 10;
  else if (productType === 'FROZEN_SEAFOOD') score += 8;
  return Math.max(0, Math.min(100, score));
}

function getRiskLevel(score) {
  if (score >= 60) return 'critical';
  if (score >= 35) return 'warning';
  if (score >= 15) return 'attention';
  return 'normal';
}

function getTrendLabel(trend) {
  const labels = { rising_fast: '快速上升', rising: '缓慢上升', stable: '温度稳定', falling: '温度下降' };
  return labels[trend] || '未知';
}

function generateMockVehicles() {
  const PRODUCT_TYPES = [
    { code: 'FROZEN_MEAT', name: '冷冻肉类', standardTemp: -18, threshold: -12 },
    { code: 'FROZEN_SEAFOOD', name: '冷冻水产', standardTemp: -20, threshold: -15 },
    { code: 'CHILLED_VEGETABLE', name: '冷藏蔬菜', standardTemp: 4, threshold: 8 },
    { code: 'CHILLED_FRUIT', name: '冷藏水果', standardTemp: 5, threshold: 10 },
    { code: 'DAIRY', name: '乳制品', standardTemp: 4, threshold: 7 },
    { code: 'VACCINE', name: '疫苗/医药', standardTemp: 2, threshold: 5 },
    { code: 'ICE_CREAM', name: '冰淇淋', standardTemp: -22, threshold: -18 },
    { code: 'PREPARED_FOOD', name: '速冻食品', standardTemp: -18, threshold: -12 }
  ];
  const PLATE_NUMBERS = [
    '京A·88F21', '沪B·66K98', '粤C·12H45', '浙D·33L67', '苏E·99M12',
    '鲁F·55N88', '川G·77P23', '鄂H·44Q56', '闽J·22R34', '赣K·88S76',
    '皖L·11T09', '湘M·66U43', '豫N·33V21', '冀O·99W87', '晋P·55X65'
  ];
  const DRIVERS = [
    '张建国', '李卫东', '王志强', '刘建军', '陈明辉',
    '赵德昌', '孙立平', '周永兴', '吴文德', '郑海涛'
  ];
  const SUPPLIERS = [
    '中粮冷链物流', '双汇食品运输', '伊利集团物流', '三全食品配送',
    '蒙牛冷链运输', '安井食品物流', '正大集团配送', '雨润食品运输',
    '思念食品物流', '圣迪乐冷链'
  ];

  const vehicles = [];
  for (let i = 0; i < 12; i++) {
    const product = randomChoice(PRODUCT_TYPES);
    const trendChoices = ['rising_fast', 'rising', 'stable', 'falling'];
    const tempTrend = randomChoice(trendChoices);
    let maxTemp;
    if (tempTrend === 'rising_fast') {
      maxTemp = randomFloat(product.threshold + 1, product.threshold + 8, 1);
    } else if (tempTrend === 'rising') {
      maxTemp = randomFloat(product.threshold - 2, product.threshold + 4, 1);
    } else if (tempTrend === 'stable') {
      maxTemp = randomFloat(product.standardTemp - 3, product.standardTemp + 2, 1);
    } else {
      maxTemp = randomFloat(product.standardTemp - 5, product.standardTemp - 1, 1);
    }
    const etaMinutes = randomInt(2, 45);
    const now = new Date();
    const eta = new Date(now.getTime() + etaMinutes * 60000);
    const riskScore = calcRiskScore(maxTemp, product.threshold, tempTrend, product.code);
    const riskLevel = getRiskLevel(riskScore);
    let status;
    if (etaMinutes <= 5) status = 'approaching';
    else if (etaMinutes <= 15) status = 'waiting';
    else status = 'en_route';
    vehicles.push({
      id: `VH${String(1001 + i)}`,
      plateNumber: PLATE_NUMBERS[i % PLATE_NUMBERS.length],
      driver: randomChoice(DRIVERS),
      supplier: randomChoice(SUPPLIERS),
      productType: product.code,
      productName: product.name,
      standardTemp: product.standardTemp,
      thresholdTemp: product.threshold,
      maxTemp,
      tempTrend,
      trendLabel: getTrendLabel(tempTrend),
      riskScore,
      riskLevel,
      eta,
      etaMinutes,
      status,
      weight: randomFloat(5, 28, 1),
      pallets: randomInt(12, 48),
      trailerType: randomChoice(['冷藏半挂', '冷藏厢式', '冷藏集装箱']),
      phone: `1${randomInt(3, 9)}${String(randomInt(100000000, 999999999))}`,
      assignedDock: riskLevel === 'critical' ? randomInt(1, 4) : null,
      orderNo: `DD${Date.now()}${String(i).padStart(3, '0')}`
    });
  }
  return vehicles.sort((a, b) => b.riskScore - a.riskScore);
}

function generateTemperatureHistory(maxTemp, tempTrend, productType) {
  const product = getProductInfo(productType);
  const history = [];
  const now = new Date();
  const baseTemp = product.standardTemp;
  const points = 30;
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const progress = (points - i) / points;
    let temp;
    switch (tempTrend) {
      case 'rising_fast':
        temp = baseTemp + (maxTemp - baseTemp) * Math.pow(progress, 0.7) + randomFloat(-0.5, 0.5);
        break;
      case 'rising':
        temp = baseTemp + (maxTemp - baseTemp) * progress + randomFloat(-0.3, 0.3);
        break;
      case 'stable':
        temp = maxTemp + randomFloat(-0.8, 0.8);
        break;
      case 'falling':
        temp = maxTemp - (maxTemp - baseTemp) * progress + randomFloat(-0.3, 0.3);
        break;
      default:
        temp = baseTemp + randomFloat(-1, 1);
    }
    history.push({
      time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
      temp: parseFloat(temp.toFixed(1)),
      threshold: product.threshold,
      standard: product.standardTemp
    });
  }
  return history;
}

const mockState = {
  vehicles: generateMockVehicles(),
  records: [],
  detailVehicleId: null,
  recordVehicleId: null
};

const detailListeners = [];
const recordInitListeners = [];

const mockAPI = {
  vehicles: {
    getAll: async () => JSON.parse(JSON.stringify(mockState.vehicles)),
    getById: async (id) => {
      const vehicle = mockState.vehicles.find(v => v.id === id);
      if (vehicle) {
        return {
          ...JSON.parse(JSON.stringify(vehicle)),
          temperatureHistory: generateTemperatureHistory(
            vehicle.maxTemp, vehicle.tempTrend, vehicle.productType
          )
        };
      }
      return null;
    },
    sortByRisk: async () => {
      mockState.vehicles.sort((a, b) => b.riskScore - a.riskScore);
      return JSON.parse(JSON.stringify(mockState.vehicles));
    },
    updateStatus: async (id, status) => {
      const vehicle = mockState.vehicles.find(v => v.id === id);
      if (vehicle) {
        vehicle.status = status;
        return JSON.parse(JSON.stringify(vehicle));
      }
      return null;
    },
    onUpdated: (callback) => {
      setInterval(() => {
        mockState.vehicles = mockState.vehicles.map(v => {
          if (v.etaMinutes > 0) {
            return { ...v, etaMinutes: v.etaMinutes - 1, eta: new Date(Date.now() + (v.etaMinutes - 1) * 60000) };
          }
          return v;
        });
        callback(JSON.parse(JSON.stringify(mockState.vehicles)));
      }, 60000);
    },
    onSelected: (callback) => {
      detailListeners.push(callback);
      if (mockState.detailVehicleId) {
        callback(mockState.detailVehicleId);
      }
    },
    onVehicleUpdated: () => {}
  },
  records: {
    create: async (record) => {
      const newRecord = {
        id: `REC${Date.now()}`,
        ...record,
        createdAt: new Date().toISOString()
      };
      mockState.records.unshift(newRecord);
      return newRecord;
    },
    getAll: async () => JSON.parse(JSON.stringify(mockState.records)),
    onInit: (callback) => {
      recordInitListeners.push(callback);
      if (mockState.recordVehicleId) {
        callback(mockState.recordVehicleId);
      }
    },
    onCreated: () => {}
  },
  window: {
    openDetail: (vehicleId) => {
      mockState.detailVehicleId = vehicleId;
      const w = window.open(`detail.html`, '车辆详情', 'width=960,height=720');
      if (w) {
        w.mockVehicleId = vehicleId;
        setTimeout(() => {
          if (w.electronAPI && w.electronAPI.vehicles) {
            detailListeners.forEach(cb => cb(vehicleId));
            try { w.dispatchEvent(new CustomEvent('mock-vehicle-selected', { detail: vehicleId })); } catch (e) {}
          }
        }, 300);
      }
      detailListeners.forEach(cb => cb(vehicleId));
    },
    openRecord: (vehicleId) => {
      mockState.recordVehicleId = vehicleId;
      const w = window.open(`record.html`, '收货记录', 'width=720,height=800');
      if (w) {
        w.mockVehicleId = vehicleId;
        setTimeout(() => {
          recordInitListeners.forEach(cb => cb(vehicleId));
          try { w.dispatchEvent(new CustomEvent('mock-record-init', { detail: vehicleId })); } catch (e) {}
        }, 300);
      }
      recordInitListeners.forEach(cb => cb(vehicleId));
    },
    closeDetail: () => { window.close(); },
    closeRecord: () => { window.close(); }
  }
};

window.electronAPI = mockAPI;
window.mockAPI = mockAPI;
window.mockState = mockState;

}
