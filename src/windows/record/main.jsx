import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../styles/global.css';
import '../../mock/browserMock.js';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
