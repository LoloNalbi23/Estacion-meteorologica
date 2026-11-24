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
    mensaje:  (v) => `Temperatura alta: ${v}°C supera el máximo configurado de 35°C`,
  },
  {
    nombre:   'Temperatura mín.',
    limite:   5,
    unidad:   '°C',
    variable: 'temperatura',
    op:       '<',
    tipo:     'warn',
    icono:    '🔵',
    mensaje:  (v) => `Temperatura baja: ${v}°C está por debajo del mínimo configurado de 5°C`,
  },
  {
    nombre:   'Humedad máx.',
    limite:   75,
    unidad:   '%',
    variable: 'humedad',
    op:       '>',
    tipo:     'warn',
    icono:    '⚠️',
    mensaje:  (v) => `Humedad relativa alta: ${v}% supera el máximo configurado de 75%`,
  },
  {
    nombre:   'Humedad mín.',
    limite:   10,
    unidad:   '%',
    variable: 'humedad',
    op:       '<',
    tipo:     'warn',
    icono:    '⚠️',
    mensaje:  (v) => `Humedad relativa baja: ${v}% está por debajo del mínimo configurado de 10%`,
  },
  {
    nombre:   'Velocidad del viento máx.',
    limite:   50,
    unidad:   ' km/h',
    variable: 'velocidad_viento',
    op:       '>',
    tipo:     'danger',
    icono:    '🌬️',
    display:  '≤ 50 km/h',
    mensaje:  (v) => `Velocidad del viento (${v} km/h) supera el máximo configurado de 50 km/h`,
  },
  {
    nombre:   'CO máx. (MQ-7)',
    limite:   10,
    unidad:   ' ppm',
    variable: 'co_concentracion',
    op:       '>',
    tipo:     'danger',
    icono:    '⚠️',
    display:  '0–10 ppm',
    mensaje:  (v) => `CO medido (${v} ppm) supera el máximo configurado de 10 ppm`,
  },
  {
    nombre:   'CO mín. (MQ-7)',
    limite:   0,
    unidad:   ' ppm',
    variable: 'co_concentracion',
    op:       '<',
    tipo:     'warn',
    icono:    '⚠️',
    mensaje:  (v) => `CO medido (${v} ppm) está por debajo del mínimo configurado de 0 ppm`,
  },
  {
    nombre:   'Presión máx. (BME280)',
    limite:   1020,
    unidad:   ' hPa',
    variable: 'presion',
    op:       '>',
    tipo:     'info',
    icono:    'ℹ️',
    mensaje:  (v) => `Presión atmosférica (${v} hPa) supera el máximo configurado de 1020 hPa`,
  },
  {
    nombre:   'Presión mín. (BME280)',
    limite:   1010,
    unidad:   ' hPa',
    variable: 'presion',
    op:       '<',
    tipo:     'info',
    icono:    'ℹ️',
    mensaje:  (v) => `Presión atmosférica (${v} hPa) está por debajo del mínimo configurado de 1010 hPa`,
  },
]

// ── Helper: evalúa si un umbral está en alerta ────────────────────
// Compara el valor actual contra el límite con el operador definido
function estaEnAlerta(umbral, lectura) {
  const val = lectura[umbral.variable]
  if (val == null) return false // variable opcional no disponible
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

  // No declarar que todos los valores están OK si faltan mediciones.
  if (alertas.length === 0) {
    const camposSinDato = [
      'temperatura', 'humedad', 'velocidad_viento', 'co_concentracion',
    ]
    const sinLectura = camposSinDato.filter(campo => lectura[campo] == null)

    alertas.push({
      tipo:  'info',
      icono: 'ℹ️',
      texto: sinLectura.length
        ? `No se superaron los umbrales evaluables; no hay datos de ${sinLectura.join(', ')}.`
        : lectura.presion == null
          ? 'Las variables con lectura están dentro de rango; no llegó la presión opcional del BME280.'
          : 'Todos los valores están dentro de los rangos configurados.',
      hora,
    })
  }

  const coActual = lectura.co_concentracion
  alertas.push({
    tipo: 'info',
    icono: '🫧',
    texto: coActual == null
      ? 'No hay lectura de CO disponible para evaluar.'
      : `CO medido por el MQ-7: ${coActual} ppm. El umbral es 10 ppm; el rango especificado del sensor empieza en 10 ppm, y esta lectura no sustituye una alarma certificada de CO.`,
    hora,
  })

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

        {/* Muestra los límites y el estado de cada variable configurada. */}
        {UMBRALES_CONFIG.map((u, i) => {
          // Determina si el valor actual supera este umbral
          const enAlerta = estaEnAlerta(u, lectura)
          const tieneDato = lectura[u.variable] != null

          // No mostrar OK si el sensor no entregó esa variable.
          const chipClass = !tieneDato
            ? 'estado-chip estado-pendiente'
            : enAlerta ? 'estado-chip estado-alerta' : 'estado-chip estado-ok'
          const chipLabel = !tieneDato ? 'SIN DATO' : enAlerta ? 'ALERTA' : 'OK'

          return (
            <div key={i} className="umbral-row">
              {/* Nombre del umbral (ej: "Temperatura máx.") */}
              <span className="umbral-nombre">{u.nombre}</span>

              <div className="umbral-right">
                {/* Valor límite configurado */}
                <span className="umbral-valor">
                  {u.display ?? `${u.limite}${u.unidad}`}
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
