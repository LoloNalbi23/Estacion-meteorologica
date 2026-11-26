// main.jsx — Punto de entrada de la aplicación React
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { EstacionProvider } from './contexto/EstacionContext'
import { TemaProvider } from './temas/TemaContext'
import { leerTemaGuardado, leerTonoGuardado } from './temas/temas'
import './temas/temas.css'
import './index.css'

// Aplicar la estética guardada antes del primer render, para que la página
// no aparezca un instante con el tema equivocado.
document.documentElement.dataset.tema = leerTemaGuardado()
document.documentElement.style.setProperty('--cielo-h', String(leerTonoGuardado()))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter habilita React Router en toda la app */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <EstacionProvider>
        <TemaProvider>
          <App />
        </TemaProvider>
      </EstacionProvider>
    </BrowserRouter>
  </React.StrictMode>
)
