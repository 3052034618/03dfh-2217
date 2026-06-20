const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { generateMockVehicles, generateTemperatureHistory } = require('./mockData');

let mainWindow = null;
let detailWindow = null;
let recordWindow = null;
let historyWindow = null;

let vehicles = [];
let records = [];

function getRecordsFilePath() {
  try {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return path.join(userDataPath, 'records.json');
  } catch (e) {
    return path.join(__dirname, '..', 'records.json');
  }
}

function loadRecords() {
  try {
    const fp = getRecordsFilePath();
    if (fs.existsSync(fp)) {
      const raw = fs.readFileSync(fp, 'utf-8');
      if (raw && raw.trim()) {
        records = JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('[Records] 加载持久化记录失败，使用空列表:', e.message);
    records = [];
  }
}

function saveRecords() {
  try {
    const fp = getRecordsFilePath();
    fs.writeFileSync(fp, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Records] 保存持久化记录失败:', e.message);
  }
}

function syncVehiclesLatestRecord() {
  const vehicleRecordMap = {};
  records.forEach(r => {
    if (!vehicleRecordMap[r.vehicleId] || new Date(r.createdAt) > new Date(vehicleRecordMap[r.vehicleId].createdAt)) {
      vehicleRecordMap[r.vehicleId] = r;
    }
  });
  vehicles.forEach(v => {
    if (vehicleRecordMap[v.id]) {
      v.latestRecord = vehicleRecordMap[v.id];
      if (v.status === undefined || v.status !== 'received') {
        v.status = 'received';
      }
    }
  });
}

function detectMode() {
  if (process.env.NODE_ENV === 'development') return true;
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) return false;
  try {
    if (process.defaultApp) return true;
  } catch (e) {}
  return false;
}

const isDev = detectMode();

function getDevUrl(windowName) {
  return `http://localhost:5173/${windowName}.html`;
}

function getProdUrl(windowName) {
  const filePath = path.join(__dirname, '..', 'dist', `${windowName}.html`);
  return pathToFileURL(filePath).href;
}

function getWindowUrl(windowName) {
  const url = isDev ? getDevUrl(windowName) : getProdUrl(windowName);
  console.log(`[Electron] Loading ${windowName} window: ${url}`);
  return url;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '到车队列 - 冷链月台调度系统',
    backgroundColor: '#0f1419',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadURL(getWindowUrl('queue'));

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Main Window] Failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (detailWindow) {
      detailWindow.close();
      detailWindow = null;
    }
    if (recordWindow) {
      recordWindow.close();
      recordWindow = null;
    }
    if (historyWindow) {
      historyWindow.close();
      historyWindow = null;
    }
    app.quit();
  });
}

function createDetailWindow(vehicleId) {
  if (detailWindow) {
    detailWindow.focus();
    detailWindow.webContents.send('vehicle:selected', vehicleId);
    return;
  }

  detailWindow = new BrowserWindow({
    width: 960,
    height: 720,
    title: '车辆详情',
    backgroundColor: '#0f1419',
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  detailWindow.loadURL(getWindowUrl('detail'));

  detailWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Detail Window] Failed to load: ${errorCode} - ${errorDescription}`);
  });

  detailWindow.webContents.once('did-finish-load', () => {
    detailWindow.webContents.send('vehicle:selected', vehicleId);
  });

  detailWindow.on('closed', () => {
    detailWindow = null;
  });
}

function createRecordWindow(vehicleId) {
  if (recordWindow) {
    recordWindow.focus();
    recordWindow.webContents.send('record:init', vehicleId);
    return;
  }

  recordWindow = new BrowserWindow({
    width: 720,
    height: 800,
    title: '收货记录',
    backgroundColor: '#0f1419',
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  recordWindow.loadURL(getWindowUrl('record'));

  recordWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Record Window] Failed to load: ${errorCode} - ${errorDescription}`);
  });

  recordWindow.webContents.once('did-finish-load', () => {
    recordWindow.webContents.send('record:init', vehicleId);
  });

  recordWindow.on('closed', () => {
    recordWindow = null;
  });
}

function createHistoryWindow() {
  if (historyWindow) {
    historyWindow.focus();
    return;
  }

  historyWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    title: '今日处置记录',
    backgroundColor: '#0f1419',
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  historyWindow.loadURL(getWindowUrl('history'));

  historyWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[History Window] Failed to load: ${errorCode} - ${errorDescription}`);
  });

  historyWindow.on('closed', () => {
    historyWindow = null;
  });
}

app.whenReady().then(() => {
  console.log(`[Electron] Mode: ${isDev ? 'Development' : 'Production'}`);
  console.log(`[Electron] Records file: ${getRecordsFilePath()}`);
  loadRecords();
  vehicles = generateMockVehicles();
  syncVehiclesLatestRecord();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  saveRecords();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('vehicles:getAll', () => {
  syncVehiclesLatestRecord();
  return vehicles;
});

ipcMain.handle('vehicles:getById', (_, id) => {
  syncVehiclesLatestRecord();
  const vehicle = vehicles.find(v => v.id === id);
  if (vehicle) {
    return {
      ...vehicle,
      temperatureHistory: generateTemperatureHistory(
        vehicle.maxTemp,
        vehicle.tempTrend,
        vehicle.productType
      )
    };
  }
  return null;
});

ipcMain.handle('vehicles:sortByRisk', () => {
  vehicles.sort((a, b) => b.riskScore - a.riskScore);
  mainWindow && mainWindow.webContents.send('vehicles:updated', vehicles);
  return vehicles;
});

ipcMain.handle('vehicles:updateStatus', (_, id, status, latestRecord) => {
  const vehicle = vehicles.find(v => v.id === id);
  if (vehicle) {
    vehicle.status = status;
    if (latestRecord) {
      vehicle.latestRecord = latestRecord;
    }
    saveRecords();
    mainWindow && mainWindow.webContents.send('vehicles:updated', vehicles);
    detailWindow && detailWindow.webContents.send('vehicle:updated', vehicle);
    return vehicle;
  }
  return null;
});

ipcMain.handle('records:create', (_, record) => {
  const initialQualityStatus = (record.disposalDecision === 'quarantine' || record.disposalDecision === 'reject')
    ? 'pending_review'
    : null;
  const initialFollowUps = [];
  if (initialQualityStatus) {
    initialFollowUps.push({
      id: `FU${Date.now()}`,
      type: 'register',
      typeLabel: '收货登记',
      operator: record.receiverName || '值班员',
      note: `完成收货登记，处置决定：${record.disposalDecisionLabel || record.disposalDecision}`,
      timestamp: new Date().toISOString()
    });
  }
  const newRecord = {
    id: `REC${Date.now()}`,
    ...record,
    review: null,
    qualityStatus: initialQualityStatus,
    followUps: initialFollowUps,
    createdAt: new Date().toISOString()
  };
  records.unshift(newRecord);
  saveRecords();
  syncVehiclesLatestRecord();
  mainWindow && mainWindow.webContents.send('vehicles:updated', vehicles);
  mainWindow && mainWindow.webContents.send('records:created', newRecord);
  historyWindow && historyWindow.webContents.send('records:updated', records);
  detailWindow && detailWindow.webContents.send('record:created', newRecord);
  detailWindow && detailWindow.webContents.send('vehicle:updated', vehicles.find(v => v.id === newRecord.vehicleId));
  return newRecord;
});

ipcMain.handle('records:getAll', () => {
  return records;
});

ipcMain.handle('records:getByVehicleId', (_, vehicleId) => {
  return records.filter(r => r.vehicleId === vehicleId);
});

ipcMain.handle('records:updateReview', (_, recordId, reviewData) => {
  const idx = records.findIndex(r => r.id === recordId);
  if (idx === -1) return null;
  records[idx] = {
    ...records[idx],
    review: {
      ...reviewData,
      reviewedAt: new Date().toISOString()
    }
  };
  if (records[idx].qualityStatus === 'pending_review') {
    records[idx].qualityStatus = 'under_qc';
    records[idx].followUps.push({
      id: `FU${Date.now()}`,
      type: 'review',
      typeLabel: '复核通过',
      operator: reviewData.reviewer || '复核人',
      note: `复核结论：${reviewData.conclusionLabel || reviewData.conclusion} · 后续：${reviewData.nextActionLabel || reviewData.nextAction}${reviewData.note ? ' · ' + reviewData.note : ''}`,
      timestamp: new Date().toISOString()
    });
  }
  saveRecords();
  syncVehiclesLatestRecord();
  const updatedRecord = records[idx];
  mainWindow && mainWindow.webContents.send('vehicles:updated', vehicles);
  historyWindow && historyWindow.webContents.send('records:updated', records);
  detailWindow && detailWindow.webContents.send('record:created', updatedRecord);
  detailWindow && detailWindow.webContents.send('vehicle:updated', vehicles.find(v => v.id === updatedRecord.vehicleId));
  return updatedRecord;
});

ipcMain.handle('records:updateQualityStatus', (_, recordId, status, statusLabel, operator, note) => {
  const idx = records.findIndex(r => r.id === recordId);
  if (idx === -1) return null;
  records[idx] = {
    ...records[idx],
    qualityStatus: status
  };
  if (!records[idx].followUps) records[idx].followUps = [];
  records[idx].followUps.push({
    id: `FU${Date.now()}`,
    type: 'status_change',
    typeLabel: statusLabel || status,
    operator: operator || '值班员',
    note: note || `状态变更为：${statusLabel || status}`,
    timestamp: new Date().toISOString()
  });
  saveRecords();
  syncVehiclesLatestRecord();
  const updatedRecord = records[idx];
  mainWindow && mainWindow.webContents.send('vehicles:updated', vehicles);
  historyWindow && historyWindow.webContents.send('records:updated', records);
  detailWindow && detailWindow.webContents.send('record:created', updatedRecord);
  detailWindow && detailWindow.webContents.send('vehicle:updated', vehicles.find(v => v.id === updatedRecord.vehicleId));
  return updatedRecord;
});

ipcMain.handle('records:addFollowUp', (_, recordId, followUp) => {
  const idx = records.findIndex(r => r.id === recordId);
  if (idx === -1) return null;
  if (!records[idx].followUps) records[idx].followUps = [];
  const newFollowUp = {
    id: `FU${Date.now()}`,
    ...followUp,
    timestamp: new Date().toISOString()
  };
  records[idx].followUps.push(newFollowUp);
  saveRecords();
  syncVehiclesLatestRecord();
  const updatedRecord = records[idx];
  mainWindow && mainWindow.webContents.send('vehicles:updated', vehicles);
  historyWindow && historyWindow.webContents.send('records:updated', records);
  detailWindow && detailWindow.webContents.send('record:created', updatedRecord);
  detailWindow && detailWindow.webContents.send('vehicle:updated', vehicles.find(v => v.id === updatedRecord.vehicleId));
  return newFollowUp;
});

ipcMain.on('window:openDetail', (_, vehicleId) => {
  createDetailWindow(vehicleId);
});

ipcMain.on('window:openRecord', (_, vehicleId) => {
  createRecordWindow(vehicleId);
});

ipcMain.on('window:openHistory', () => {
  createHistoryWindow();
});

ipcMain.on('window:closeDetail', () => {
  if (detailWindow) {
    detailWindow.close();
  }
});

ipcMain.on('window:closeRecord', () => {
  if (recordWindow) {
    recordWindow.close();
  }
});

ipcMain.on('window:closeHistory', () => {
  if (historyWindow) {
    historyWindow.close();
  }
});
