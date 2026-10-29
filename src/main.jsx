// main.jsx — Punto de entrada de la aplicación React
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter habilita React Router en toda la app */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
