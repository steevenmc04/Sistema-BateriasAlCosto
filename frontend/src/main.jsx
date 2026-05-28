import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter as Router } from 'react-router-dom';
import App from './App.jsx'
import './index.css'

/**
 * Punto de entrada del cliente React.
 * Mantiene `StrictMode` para detectar efectos colaterales durante desarrollo.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
