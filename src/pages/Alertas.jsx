// =============================================================
// Alertas.jsx — Ruta "/alertas"
// Muestra: lista de alertas activas generadas comparando la lectura
//          REAL actual contra los umbrales configurados,
//          + tabla de umbrales con su estado (OK / ALERTA)
// =============================================================

import { useState, useEffect } from 'react'
import { formatHora } from '../data/mockData'
import { getLecturaActual } from '../data/Apiweather'
import './Alertas.css'

// ── Umbrales configurados ──────────────────────────────────────────
// Cada entrada define nombre, valor límite, variable a comparar,
// operador ('>' | '<'), unidad de display, severidad y el mensaje que
// se muestra en la lista de alertas cuando se supera.
const UMBRALES_CONFIG = [
  {
    nombre:   'Temperatura máx.',
    limite:   35,
    unidad:   '°C',
    variable: 'temperatura',
    op:       '>',
    tipo:     'danger',
    icono:    '🔴',
    mensaje:  (v) => `Temperatura crítica: ${v}°C supera el límite de 35°C`,
  },
  {
    nombre:   'Temperatura mín.',
    limite:   10,
    unidad:   '°C',
    variable: 'temperatura',
    op:       '<',
    tipo:     'warn',
    icono:    '🔵',
    mensaje:  (v) => `Temperatura baja: ${v}°C por debajo de 10°C`,
  },
  {
    nombre:   'Humedad máx.',
    limite:   80,
    unidad:   '%',
    variable: 'humedad',
    op:       '>',
    tipo:     'warn',
    icono:    '⚠️',
    mensaje:  (v) => `Humedad relativa alta (${v}%) — posible condensación`,
  },
  {
    nombre:   'Humedad mín.',
    limite:   30,
    unidad:   '%',
    variable: 'humedad',
    op:       '<',
    tipo:     'warn',
    icono:    '⚠️',
    mensaje:  (v) => `Humedad muy baja: ${v}% — riesgo de sequedad`,
  },
  {
    nombre:   'Presión máx.',
    limite:   1030,
    unidad:   ' hPa',
    variable: 'presion',
    op:       '>',
    tipo:     'info',
    icono:    'ℹ️',
    mensaje:  (v) => `Presión atmosférica alta (${v} hPa) — típico de tiempo estable`,
  },
  {
    nombre:   'Presión mín.',
    limite:   990,
    unidad:   ' hPa',
    variable: 'presion',
    op:       '<',
    tipo:     'info',
    icono:    'ℹ️',
    mensaje:  (v) => `Presión atmosférica baja (${v} hPa) — posible mal tiempo`,
  },
  {
    nombre:   'Luminosidad máx.',
    limite:   800,
    unidad:   ' lux',
    variable: 'luminosidad',
    op:       '>',
    tipo:     'warn',
    icono:    '☀️',
    mensaje:  (v) => `Luminosidad muy alta (${v} lux) — exceso de sol/luz directa`,
  },
]

// ── Helper: evalúa si un umbral está en alerta ────────────────────
// Compara el valor actual contra el límite con el operador definido
function estaEnAlerta(umbral, lectura) {
  const val = lectura[umbral.variable]
  if (val == null) return false // sin dato (ej. luminosidad de noche puede ser 0, pero null = no disponible)
  return umbral.op === '>' ? val > umbral.limite : val < umbral.limite
}

// ── Alertas: recorre TODOS los umbrales configurados contra la
// lectura real, y arma la lista dinámicamente. Antes esto estaba
// hardcodeado a mano y le faltaban casos (presión alta, luminosidad
// alta nunca se chequeaban) — ahora cubre exactamente lo que dice la
// tabla de umbrales de abajo, ni más ni menos.
function generarAlertas(lectura) {
  const ahora = new Date()

  const alertas = UMBRALES_CONFIG
    .filter(u => estaEnAlerta(u, lectura))
    .map(u => ({
      tipo:  u.tipo,
      icono: u.icono,
      texto: u.mensaje(lectura[u.variable]),
      hora:  formatHora(ahora),
    }))

  // Si ningún umbral está superado, se muestra un solo "todo OK"
  if (alertas.length === 0) {
    alertas.push({
      tipo:  'ok',
      icono: '✅',
      texto: 'Todos los valores dentro del rango normal para la estación',
      hora:  formatHora(ahora),
    })
  }

  // Alerta informativa siempre visible
  alertas.push({
    tipo:  'info',
    icono: 'ℹ️',
    texto: 'Sistema de monitoreo activo — la lectura se actualiza en cada visita',
    hora:  formatHora(ahora),
  })

  return alertas
}

// ── Componente principal ──────────────────────────────────────────
export default function Alertas() {
  // Antes esta pantalla usaba lecturaActual de mockData.js — un valor
  // congelado, generado una sola vez con Math.random() al cargar el
  // módulo, que nunca cambiaba. Por eso siempre daba "todo OK" pase lo
  // que pase. Ahora usa la lectura real de la estación (misma función
  // que Dashboard).
  const [lectura, setLectura] = useState(null)

  useEffect(() => {
    getLecturaActual().then(setLectura)
  }, [])

  if (!lectura) {
    return <p style={{ color: '#8B949E', padding: '2rem' }}>Cargando datos...</p>
  }

  const alertas = generarAlertas(lectura)

  return (
    <section>
      <h2 className="alertas-section-title">Alertas del Sistema</h2>

      {/* ── Lista de alertas activas ── */}
      <div className="alertas-list">
        {alertas.map((alerta, i) => (
          <div key={i} className={`alerta-row alerta-${alerta.tipo}`}>
            <div className="alerta-left">
              {/* Ícono del tipo de alerta */}
              <span className="alerta-icono">{alerta.icono}</span>
              {/* Mensaje descriptivo */}
              <span className="alerta-texto">{alerta.texto}</span>
            </div>
            {/* Hora en que se generó la alerta */}
            <span className="alerta-hora">{alerta.hora}</span>
          </div>
        ))}
      </div>

      {/* ── Panel de umbrales configurados ── */}
      <div className="umbrales-panel">
        <p className="umbrales-title">Umbrales Configurados</p>

        {/* Una fila por cada umbral definido en UMBRALES_CONFIG */}
        {UMBRALES_CONFIG.map((u, i) => {
          // Determina si el valor actual supera este umbral
          const enAlerta = estaEnAlerta(u, lectura)
          const valorActual = lectura[u.variable]

          // Chip de estado: ALERTA si supera, OK si no
          const chipClass = enAlerta ? 'estado-chip estado-alerta' : 'estado-chip estado-ok'
          const chipLabel = enAlerta ? 'ALERTA' : 'OK'

          return (
            <div key={i} className="umbral-row">
              {/* Nombre del umbral (ej: "Temperatura máx.") */}
              <span className="umbral-nombre">{u.nombre}</span>

              <div className="umbral-right">
                {/* Valor límite configurado */}
                <span className="umbral-valor">
                  {u.limite}{u.unidad}
                </span>

                {/* Chip dinámico: OK verde / ALERTA ámbar */}
                <span className={chipClass}>{chipLabel}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
