
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';
import './styles/main.css';
import './styles/login.css';

// Import and assign process globally for browser compatibility
import process from 'process';
if (typeof window !== 'undefined') {
  window.process = process;
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);