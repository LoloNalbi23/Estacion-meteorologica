// =============================================================
// Navbar.jsx — Barra de navegación superior fija
// Contiene: logo, título del proyecto, links a las 4 rutas,
// indicador de estado "En línea" y hora de última actualización
// =============================================================

import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './Navbar.css'
import { insertarLecturaPrueba } from '../prueba.js'

// ── Íconos SVG inline (sin dependencia extra) ─────────────────────

// Ícono dashboard (onda / pulso)
const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

// Ícono histórico (barras)
const IconHistory = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6"  y1="20" x2="6"  y2="14" />
  </svg>
)

// Ícono flujo del sistema (compartir / nodos)
const IconFlow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5"  r="3" />
    <circle cx="6"  cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
  </svg>
)

// Ícono alertas (campana)
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

// Ícono nube (logo)
const IconCloud = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
  </svg>
)

// Ícono refresh
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

// ── Componente principal ──────────────────────────────────────────
export default function Navbar() {
  // Redondea "hacia abajo" a la hora en punto (minutos y segundos a 0),
  // mismo criterio que usa el historial en Apiweather.js — así "Última
  // actualización" siempre muestra algo prolijo como 14:00, nunca 14:33.
  const redondearHora = (fecha) => {
    const d = new Date(fecha)
    d.setMinutes(0, 0, 0)
    return d
  }

  // Estado para la hora en punto mostrada
  const [hora, setHora] = useState(redondearHora(new Date()))

  // No hace falta re-chequear cada segundo si igual se muestra
  // redondeado a la hora — con revisar cada minuto alcanza para
  // detectar el cambio de hora en punto.
  useEffect(() => {
    const timer = setInterval(() => setHora(redondearHora(new Date())), 60 * 1000)
    return () => clearInterval(timer) // limpia al desmontar
  }, [])

  // Formatea la hora como "HH:MM" (siempre en punto, sin segundos)
  const horaStr = hora.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <header className="navbar">
      {/* ── Fila superior: logo + estado ── */}
      <div className="navbar-top">
        {/* Logo + título + subtítulo */}
        <NavLink to="/" className="navbar-brand">
          <div className="navbar-icon">
            <IconCloud />
          </div>
          <div className="navbar-title-group">
            <span className="navbar-title">Estación Meteorológica</span>
            <span className="navbar-subtitle">ESP32 · API Flask · React · SQLite</span>
          </div>
        </NavLink>

        {/* Indicador de estado y reloj */}
        <div className="navbar-status">
          <span className="status-dot" />
          <span className="status-online">En línea</span>
          <span className="status-time">Última actualización: {horaStr}</span>
          <button className="btn-refresh" title="Actualizar datos" onClick={() => setHora(redondearHora(new Date()))}>
            <IconRefresh />
          </button>
        </div>
      </div>

      {/* ── Fila inferior: links de navegación ── */}
      <nav className="navbar-links">
        {/* NavLink aplica clase "active" automáticamente con React Router */}
        <NavLink to="/"         end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <IconDashboard /> Dashboard
        </NavLink>
        <NavLink to="/history"     className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <IconHistory /> Histórico
        </NavLink>
        <NavLink to="/proyecto"    className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <IconFlow /> Flujo del Sistema
        </NavLink>
        <NavLink to="/alertas"     className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <IconAlert /> Alertas
        </NavLink>
        <NavLink to="/lecturas"     className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <IconAlert /> Lecturas
        </NavLink>
        <button onClick={insertarLecturaPrueba}>Insertar prueba</button>
      </nav>
    </header>
  )
}