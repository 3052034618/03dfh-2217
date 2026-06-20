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
  vehicles = generateMockVehicles();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('vehicles:getAll', () => {
  return vehicles;
});

ipcMain.handle('vehicles:getById', (_, id) => {
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
    mainWindow && mainWindow.webContents.send('vehicles:updated', vehicles);
    detailWindow && detailWindow.webContents.send('vehicle:updated', vehicle);
    return vehicle;
  }
  return null;
});

ipcMain.handle('records:create', (_, record) => {
  const newRecord = {
    id: `REC${Date.now()}`,
    ...record,
    createdAt: new Date().toISOString()
  };
  records.unshift(newRecord);
  mainWindow && mainWindow.webContents.send('records:created', newRecord);
  historyWindow && historyWindow.webContents.send('records:updated', records);
  detailWindow && detailWindow.webContents.send('record:created', newRecord);
  return newRecord;
});

ipcMain.handle('records:getAll', () => {
  return records;
});

ipcMain.handle('records:getByVehicleId', (_, vehicleId) => {
  return records.filter(r => r.vehicleId === vehicleId);
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
