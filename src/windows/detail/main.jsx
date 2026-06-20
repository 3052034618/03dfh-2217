import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../styles/global.css';
import '../../mock/browserMock.js';
import App from './App.jsx';

if (window.mockVehicleId) {
  const id = window.mockVehicleId;
  const fireEvent = () => {
    if (window.electronAPI && window.electronAPI.vehicles) {
      if (window.electronAPI._selectedFired) return;
      window.electronAPI._selectedFired = true;
      const listeners = window._detailListeners || [];
      listeners.forEach(cb => cb(id));
    }
  };
  fireEvent();
  setTimeout(fireEvent, 50);
  setTimeout(fireEvent, 200);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
