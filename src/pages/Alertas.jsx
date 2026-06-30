// =============================================================
// Alertas.jsx — Ruta "/alertas"
// Muestra: lista de alertas activas generadas comparando la lectura
//          actual contra los umbrales hardcodeados,
//          + tabla de umbrales con su estado (OK / ALERTA)
// =============================================================

import { lecturaActual, UMBRALES, formatHora } from '../data/mockData'
import './Alertas.css'

// ── Umbrales hardcodeados ─────────────────────────────────────────
// Cada entrada define nombre, valor límite, variable a comparar,
// operador ('>' | '<') y unidad de display
const UMBRALES_CONFIG = [
  {
    nombre:   'Temperatura máx.',
    limite:   35,
    unidad:   '°C',
    variable: 'temperatura',
    op:       '>',          // dispara alerta si temperatura > 35
  },
  {
    nombre:   'Temperatura mín.',
    limite:   10,
    unidad:   '°C',
    variable: 'temperatura',
    op:       '<',          // dispara alerta si temperatura < 10
  },
  {
    nombre:   'Humedad máx.',
    limite:   80,
    unidad:   '%',
    variable: 'humedad',
    op:       '>',
  },
  {
    nombre:   'Humedad mín.',
    limite:   30,
    unidad:   '%',
    variable: 'humedad',
    op:       '<',
  },
  {
    nombre:   'Presión máx.',
    limite:   1030,
    unidad:   ' hPa',
    variable: 'presion',
    op:       '>',
  },
  {
    nombre:   'Presión mín.',
    limite:   990,
    unidad:   ' hPa',
    variable: 'presion',
    op:       '<',
  },
  {
    nombre:   'Luminosidad máx.',
    limite:   800,
    unidad:   ' lux',
    variable: 'luminosidad',
    op:       '>',
  },
]

// ── Helper: evalúa si un umbral está en alerta ────────────────────
// Compara el valor actual contra el límite con el operador definido
function estaEnAlerta(umbral, lectura) {
  const val = lectura[umbral.variable]
  return umbral.op === '>' ? val > umbral.limite : val < umbral.limite
}

// ── Alertas narrativas fijas + generadas dinámicamente ───────────
// Las primeras son descriptivas (info/ok), las dinámicas dependen de datos
function generarAlertas(lectura) {
  const alertas = []
  const ahora = new Date()

  // ── Alertas dinámicas: se generan si algún umbral está superado ──
  // Temperatura alta
  if (lectura.temperatura > 35) {
    alertas.push({
      tipo: 'danger',
      icono: '🔴',
      texto: `Temperatura crítica: ${lectura.temperatura}°C supera el límite de 35°C`,
      hora: formatHora(ahora),
    })
  }
  // Temperatura baja
  if (lectura.temperatura < 10) {
    alertas.push({
      tipo: 'warn',
      icono: '🔵',
      texto: `Temperatura baja: ${lectura.temperatura}°C por debajo de 10°C`,
      hora: formatHora(ahora),
    })
  }
  // Humedad alta
  if (lectura.humedad > 80) {
    alertas.push({
      tipo: 'warn',
      icono: '⚠️',
      texto: `Humedad relativa supera el 80% — posible condensación`,
      hora: formatHora(ahora),
    })
  }
  // Humedad baja
  if (lectura.humedad < 30) {
    alertas.push({
      tipo: 'warn',
      icono: '⚠️',
      texto: `Humedad muy baja: ${lectura.humedad}% — riesgo de sequedad`,
      hora: formatHora(ahora),
    })
  }
  // Presión en descenso (simulado como info)
  if (lectura.presion < 1010) {
    alertas.push({
      tipo: 'info',
      icono: 'ℹ️',
      texto: `Presión atmosférica baja (${lectura.presion} hPa) — posible mal tiempo`,
      hora: formatHora(ahora),
    })
  }

  // ── Alertas de estado OK (siempre presentes si no hay alerta) ───
  if (!alertas.find(a => a.tipo === 'danger' || a.tipo === 'warn')) {
    alertas.push({
      tipo: 'ok',
      icono: '✅',
      texto: 'Temperatura dentro del rango normal para la estación',
      hora: formatHora(new Date(ahora.getTime() - 1000 * 60 * 60)),
    })
  }

  // Alerta informativa siempre visible
  alertas.push({
    tipo: 'info',
    icono: 'ℹ️',
    texto: 'Sistema de monitoreo activo — actualizando cada 60 segundos',
    hora: formatHora(new Date(ahora.getTime() - 1000 * 60 * 90)),
  })

  return alertas
}

// ── Componente principal ──────────────────────────────────────────
export default function Alertas() {
  // Genera la lista de alertas usando la lectura actual
  const alertas = generarAlertas(lecturaActual)

  return (
    <section>
      <h2 className="alertas-section-title">Alertas del Sistema</h2>

      {/* ── Lista de alertas activas ── */}
      <div className="alertas-list">
        {alertas.length === 0 ? (
          // Estado vacío: sin alertas
          <div className="alerta-row alerta-ok">
            <div className="alerta-left">
              <span className="alerta-icono">✅</span>
              <span className="alerta-texto">Sin alertas activas — todos los valores en rango</span>
            </div>
          </div>
        ) : (
          alertas.map((alerta, i) => (
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
          ))
        )}
      </div>

      {/* ── Panel de umbrales configurados ── */}
      <div className="umbrales-panel">
        <p className="umbrales-title">Umbrales Configurados</p>

        {/* Una fila por cada umbral definido en UMBRALES_CONFIG */}
        {UMBRALES_CONFIG.map((u, i) => {
          // Determina si el valor actual supera este umbral
          const enAlerta = estaEnAlerta(u, lecturaActual)
          const valorActual = lecturaActual[u.variable]

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
