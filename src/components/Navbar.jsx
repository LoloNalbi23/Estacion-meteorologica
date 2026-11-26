// =============================================================
// Navbar.jsx — Barra de navegación superior fija
// Contiene: logo, título del proyecto, links a las 4 rutas y el estado
// de la estación según la última lectura REAL guardada en Firestore.
// =============================================================

import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useEstacion } from '../contexto/EstacionContext'
import { useTema } from '../temas/TemaContext'
import { TEMAS } from '../temas/temas'
import { formatHora, formatFecha } from '../data/formato'
import './Navbar.css'

// El ESP32 envía una lectura cada 5 minutos. Si pasan más de 15 minutos
// (3 envíos perdidos) se considera que la estación no está mandando datos.
const MINUTOS_EN_LINEA = 15

// Traduce la última lectura a un estado visible: clase CSS + textos.
function estadoEstacion(lectura, error, ahora) {
  if (error) return { clase: 'error', texto: 'Sin conexión con Firebase', detalle: '' }
  if (lectura === undefined) return { clase: 'cargando', texto: 'Conectando…', detalle: '' }
  if (lectura === null || !lectura.timestamp) {
    return { clase: 'inactiva', texto: 'Sin lecturas todavía', detalle: '' }
  }

  const fecha = lectura.timestamp
  const esHoy = fecha.toDateString() === new Date(ahora).toDateString()
  const detalle = `Última lectura: ${esHoy ? '' : `${formatFecha(fecha)} `}${formatHora(fecha)}`
  const minutos = (ahora - fecha.getTime()) / 60000

  return minutos <= MINUTOS_EN_LINEA
    ? { clase: 'en-linea', texto: 'Estación en línea', detalle }
    : { clase: 'inactiva', texto: 'Sin datos recientes', detalle }
}

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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
  </svg>
)

// ── Selector de estética (Original / Papel / Cielo) ───────────────
function SelectorTema() {
  const { tema, setTema } = useTema()
  return (
    <div className="selector-tema">
      {/* Etiqueta afuera del recuadro: así no se confunde con una opción */}
      <span className="selector-tema-label" id="etiqueta-estetica">Estética</span>
      <div className="selector-tema-opciones" role="group" aria-labelledby="etiqueta-estetica">
        {TEMAS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="selector-tema-opcion"
            aria-pressed={tema === t.id}
            title={t.descripcion}
            onClick={() => setTema(t.id)}
          >
            {t.nombre}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function Navbar() {
  // Última lectura compartida por toda la app (ver EstacionContext)
  const { lectura, error } = useEstacion()
  const [ahora, setAhora] = useState(() => Date.now())

  // Recalcula cada 30 s para que el estado pase a "Sin datos recientes"
  // aunque no llegue ninguna lectura nueva.
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30 * 1000)
    return () => clearInterval(timer)
  }, [])

  const estado = estadoEstacion(lectura, error, ahora)

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
            <span className="navbar-subtitle">Sensores ESP32 → Firebase</span>
          </div>
        </NavLink>

        <div className="navbar-acciones">
          {/* Estado de la estación según la última lectura real */}
          <div className={`navbar-status estado-${estado.clase}`} role="status">
            <span className="status-dot" />
            <span className="status-texto">{estado.texto}</span>
            {estado.detalle && <span className="status-time">{estado.detalle}</span>}
          </div>

          <SelectorTema />
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
      </nav>
    </header>
  )
}
