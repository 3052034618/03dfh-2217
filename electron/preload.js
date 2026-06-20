const { contextBridge, ipcRenderer } = require('electron');

window.__IS_ELECTRON__ = true;

contextBridge.exposeInMainWorld('electronAPI', {
  vehicles: {
    getAll: () => ipcRenderer.invoke('vehicles:getAll'),
    getById: (id) => ipcRenderer.invoke('vehicles:getById', id),
    sortByRisk: () => ipcRenderer.invoke('vehicles:sortByRisk'),
    updateStatus: (id, status) => ipcRenderer.invoke('vehicles:updateStatus', id, status),
    onUpdated: (callback) => {
      ipcRenderer.on('vehicles:updated', (_, data) => callback(data));
    },
    onSelected: (callback) => {
      ipcRenderer.on('vehicle:selected', (_, data) => callback(data));
    },
    onVehicleUpdated: (callback) => {
      ipcRenderer.on('vehicle:updated', (_, data) => callback(data));
    }
  },
  records: {
    create: (record) => ipcRenderer.invoke('records:create', record),
    getAll: () => ipcRenderer.invoke('records:getAll'),
    getByVehicleId: (vehicleId) => ipcRenderer.invoke('records:getByVehicleId', vehicleId),
    updateReview: (recordId, reviewData) => ipcRenderer.invoke('records:updateReview', recordId, reviewData),
    updateQualityStatus: (recordId, status, statusLabel, operator, note) => ipcRenderer.invoke('records:updateQualityStatus', recordId, status, statusLabel, operator, note),
    addFollowUp: (recordId, followUp) => ipcRenderer.invoke('records:addFollowUp', recordId, followUp),
    onInit: (callback) => {
      ipcRenderer.on('record:init', (_, data) => callback(data));
    },
    onCreated: (callback) => {
      ipcRenderer.on('records:created', (_, data) => callback(data));
    },
    onUpdated: (callback) => {
      ipcRenderer.on('records:updated', (_, data) => callback(data));
    }
  },
  window: {
    openDetail: (vehicleId) => ipcRenderer.send('window:openDetail', vehicleId),
    openRecord: (vehicleId) => ipcRenderer.send('window:openRecord', vehicleId),
    openHistory: () => ipcRenderer.send('window:openHistory'),
    closeDetail: () => ipcRenderer.send('window:closeDetail'),
    closeRecord: () => ipcRenderer.send('window:closeRecord'),
    closeHistory: () => ipcRenderer.send('window:closeHistory')
  }
});
