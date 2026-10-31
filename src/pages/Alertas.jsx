// =============================================================
// Alertas.jsx — Ruta "/alertas"
// Muestra: lista de alertas activas generadas comparando la última
//          lectura REAL de la base de datos (Firebase) contra los
//          umbrales configurados,
//          + tabla de umbrales con su estado (OK / ALERTA)
//
// La pantalla se actualiza sola cuando el sensor guarda una lectura nueva.
// Si todavía no hay lecturas, se muestra un aviso: nunca se inventan datos.
// =============================================================

import { useState, useEffect } from 'react'
import { formatHora } from '../data/mockData'
import { escucharLecturaActual } from '../data/firebaseService'
import './Alertas.css'

// Si la última lectura tiene más minutos que esto, se avisa que los
// valores pueden no reflejar el estado actual (sensor apagado, sin WiFi...)
const LECTURA_VIEJA_MIN = 60

const MSG_SIN_DATOS =
  'Todavía no hay lecturas en la base de datos, así que no se pueden evaluar las alertas. ' +
  'Cuando el sensor (o el simulador) guarde datos, van a aparecer acá.'

const MSG_ERROR =
  'No se pudo consultar la base de datos. Abrí la consola del navegador (F12) para ver el detalle.'

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

// ── Helper: "hace 5 min", "hace 2 h", "hace 3 días" ───────────────
function textoHace(fecha) {
  if (!fecha) return ''
  const min = Math.round((Date.now() - fecha.getTime()) / 60000)
  if (min < 1) return 'hace instantes'
  if (min < 60) return `hace ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.round(horas / 24)} días`
}

// ── Alertas: recorre TODOS los umbrales configurados contra la
// última lectura real, y arma la lista dinámicamente. La hora que se
// muestra en cada fila es la de la lectura, no la de ahora.
function generarAlertas(lectura) {
  const hora = lectura.timestamp ? formatHora(lectura.timestamp) : '—'

  const alertas = UMBRALES_CONFIG
    .filter(u => estaEnAlerta(u, lectura))
    .map(u => ({
      tipo:  u.tipo,
      icono: u.icono,
      texto: u.mensaje(lectura[u.variable]),
      hora,
    }))

  // Si ningún umbral está superado, se muestra un solo "todo OK"
  if (alertas.length === 0) {
    alertas.push({
      tipo:  'ok',
      icono: '✅',
      texto: 'Todos los valores dentro del rango normal para la estación',
      hora,
    })
  }

  // Alerta informativa siempre visible
  alertas.push({
    tipo:  'info',
    icono: 'ℹ️',
    texto: 'Monitoreo en tiempo real — la pantalla se actualiza cuando llega una lectura nueva',
    hora,
  })

  return alertas
}

// ── Sub-componente: cartel de estado (cargando / aviso / error) ───
function Aviso({ tipo = 'info', children }) {
  const colores = { info: '#8B949E', aviso: '#FBBF24', error: '#F87171' }
  const color = colores[tipo]
  return (
    <div style={{
      color,
      background: '#1C2333',
      border: `1px solid ${color}55`,
      borderRadius: '8px',
      padding: '1rem 1.25rem',
      margin: '1rem 0',
    }}>
      {children}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function Alertas() {
  // Estados posibles de la lectura:
  //   undefined → todavía está cargando
  //   null      → se consultó y no hay ninguna lectura guardada
  //   objeto    → la última lectura
  const [lectura, setLectura] = useState(undefined)
  const [error, setError] = useState(null)

  // Escucha en tiempo real: se suscribe al montar la página y se desuscribe
  // al salir (el return del useEffect).
  useEffect(() => {
    const dejarDeEscuchar = escucharLecturaActual(
      (l) => {
        setError(null)
        setLectura(l)
      },
      () => setError(MSG_ERROR)
    )
    return () => dejarDeEscuchar()
  }, [])

  // ── Cartel según el estado: error, cargando o sin datos ─────────
  if (error || lectura === undefined || lectura === null) {
    let cartel
    if (error) {
      cartel = <Aviso tipo="error">{error}</Aviso>
    } else if (lectura === undefined) {
      cartel = <Aviso>Cargando datos desde la base de datos...</Aviso>
    } else {
      cartel = <Aviso tipo="aviso">{MSG_SIN_DATOS}</Aviso>
    }
    return (
      <section>
        <h2 className="alertas-section-title">Alertas del Sistema</h2>
        {cartel}
      </section>
    )
  }

  // ── Hay lectura: se evalúan los umbrales ────────────────────────
  const alertas = generarAlertas(lectura)

  const minutosDesdeLectura = lectura.timestamp
    ? (Date.now() - lectura.timestamp.getTime()) / 60000
    : null
  const lecturaVieja = minutosDesdeLectura !== null && minutosDesdeLectura > LECTURA_VIEJA_MIN

  return (
    <section>
      <h2 className="alertas-section-title">Alertas del Sistema</h2>

      {/* ── Qué lectura se está evaluando ── */}
      {lectura.timestamp && (
        <Aviso tipo={lecturaVieja ? 'aviso' : 'info'}>
          Última lectura: {formatHora(lectura.timestamp)} ({textoHace(lectura.timestamp)}).
          {lecturaVieja && ' Los valores pueden no reflejar el estado actual: el sensor no envía datos hace un rato.'}
        </Aviso>
      )}

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
            {/* Hora de la lectura que generó la alerta */}
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