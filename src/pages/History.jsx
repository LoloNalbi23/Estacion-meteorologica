// =============================================================
// History.jsx — Ruta "/history"
// Muestra: 4 gráficos de línea (temperatura, humedad, presión, lux)
//          con selector Día / Semana / Año,
//          + tabla con las últimas 12 lecturas
//
// TODOS los datos salen de Firebase (Firestore). Si no hay datos para el
// período elegido, se muestra un aviso: nunca se inventan ni se rellenan.
//  - Día:    lecturas de las últimas 24 h
//  - Semana: promedio por día de los últimos 7 días
//  - Año:    promedio por mes de los últimos 12 meses
// =============================================================

import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

import { formatHora, formatFecha } from '../data/mockData'
import { getHistorial24h, getHistorialSemana, getHistorialAnio } from '../data/firebaseService'
import './History.css'

// Registro de módulos Chart.js (solo necesario una vez en la app,
// pero lo dejamos aquí por claridad)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

// ── Configuración de los 4 gráficos ───────────────────────────────
// Cada entrada define qué variable graficar y con qué color
const GRAFICOS = [
  { key: 'temperatura', label: 'TEMPERATURA', color: '#FBBF24', unit: '°C'  },
  { key: 'humedad',     label: 'HUMEDAD',     color: '#38BDF8', unit: '%'   },
  { key: 'presion',     label: 'PRESIÓN',     color: '#A78BFA', unit: ' hPa'},
  { key: 'luminosidad', label: 'LUMINOSIDAD', color: '#FDE68A', unit: ' lux'},
]

// ── Mensajes ──────────────────────────────────────────────────────
const MSG_VACIO = {
  '1d':  'No hay lecturas de las últimas 24 horas en la base de datos. Cuando el sensor (o el simulador) guarde datos, van a aparecer acá.',
  '7d':  'No hay datos de la última semana en la base de datos todavía.',
  '12m': 'No hay datos del último año en la base de datos todavía.',
}

const MSG_ERROR =
  'No se pudo consultar la base de datos. Abrí la consola del navegador (F12) para ver el detalle. ' +
  'Si el error menciona un índice, tocá el link que trae para crearlo, esperá unos minutos y recargá.'

// Cuántos puntos tendría el gráfico si hubiera datos de todo el período
const ESPERADOS = {
  '7d':  { cantidad: 7,  unidad: 'días' },
  '12m': { cantidad: 12, unidad: 'meses' },
}

// ── Opciones comunes de Chart.js para todos los gráficos ─────────
// Recibe el color de la variable para personalizar el tooltip
function makeChartOptions(color, unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1C2333',
        borderColor: '#30363D',
        borderWidth: 1,
        titleColor: '#8B949E',
        bodyColor: '#E6EDF3',
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        titleFont: { family: 'JetBrains Mono', size: 11 },
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y}${unit}`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#484F58',
          font: { family: 'JetBrains Mono', size: 9 },
          maxRotation: 0,
          maxTicksLimit: 8,
        },
        grid: { color: '#1C2333' },
      },
      y: {
        ticks: {
          color: '#484F58',
          font: { family: 'JetBrains Mono', size: 9 },
          padding: 6,
        },
        grid: { color: '#1C2333' },
        border: { dash: [4, 4] },
      }
    },
    interaction: { mode: 'index', intersect: false },
  }
}

// ── Sub-componente: un panel con un único gráfico ─────────────────
function ChartPanel({ config, labels, datos }) {
  // Construye el objeto de datos que espera Chart.js
  const chartData = {
    labels,
    datasets: [{
      label: config.label,
      data: datos.map(d => d[config.key]),
      borderColor: config.color,
      backgroundColor: `${config.color}15`,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: true,
    }]
  }

  return (
    <div className="history-chart-panel">
      <p className="history-chart-label">{config.label}</p>
      <div className="history-chart-wrapper">
        <Line data={chartData} options={makeChartOptions(config.color, config.unit)} />
      </div>
    </div>
  )
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
export default function History() {
  // Período seleccionado: '1d' | '7d' | '12m'
  const [periodo, setPeriodo] = useState('1d')

  // Para cada período:  null = todavía no se pidió
  //                     []   = se pidió y no hay datos
  // El historial de 24 h se necesita siempre: la tabla de abajo lo muestra
  // sin importar qué pestaña esté activa.
  const [historial24h, setHistorial24h] = useState(null)
  const [historialSemana, setHistorialSemana] = useState(null)
  const [historialAnio, setHistorialAnio] = useState(null)

  // Error por período, para poder reintentar al volver a la pestaña
  const [errores, setErrores] = useState({})

  // Pide un período a Firebase y guarda el resultado (o el error)
  function cargar(clave, pedir, guardar) {
    setErrores((prev) => ({ ...prev, [clave]: null }))
    pedir()
      .then(guardar)
      .catch((e) => {
        console.error(`Error cargando el período ${clave}:`, e)
        setErrores((prev) => ({ ...prev, [clave]: MSG_ERROR }))
      })
  }

  // Día: se pide al entrar a la página
  useEffect(() => {
    cargar('1d', getHistorial24h, setHistorial24h)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Semana y Año: se piden la primera vez que se abre la pestaña (lazy)
  // y quedan en memoria mientras dure la visita.
  useEffect(() => {
    if (periodo === '7d' && historialSemana === null) {
      cargar('7d', getHistorialSemana, setHistorialSemana)
    }
    if (periodo === '12m' && historialAnio === null) {
      cargar('12m', getHistorialAnio, setHistorialAnio)
    }
  }, [periodo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Datos y estado del período activo ────────────────────────────
  const datosPeriodo = {
    '1d': historial24h,
    '7d': historialSemana,
    '12m': historialAnio,
  }[periodo]
  const error = errores[periodo]
  const cargandoActual = datosPeriodo === null && !error
  const datos = datosPeriodo ?? []

  const labels = (() => {
    if (periodo === '7d')  return datos.map(d => formatFecha(d.timestamp))
    if (periodo === '12m') return datos.map(d => d.label) // "Ene", "Feb", etc.
    return datos.map(d => formatHora(d.timestamp))        // últimas 24 h
  })()

  // Si hay datos pero de menos días/meses de los esperados, se avisa
  const esperado = ESPERADOS[periodo]
  const esParcial = esperado && datos.length > 0 && datos.length < esperado.cantidad

  // Título dinámico según período
  const tituloSeccion = {
    '1d':  'DATOS HISTÓRICOS — ÚLTIMAS 24 H',
    '7d':  'DATOS HISTÓRICOS — ÚLTIMA SEMANA',
    '12m': 'DATOS HISTÓRICOS — ÚLTIMO AÑO',
  }[periodo]

  // ── Cuerpo según el estado: error, cargando, vacío o con datos ───
  let cuerpo
  if (error) {
    cuerpo = <Aviso tipo="error">{error}</Aviso>
  } else if (cargandoActual) {
    cuerpo = <Aviso>Cargando datos desde la base de datos...</Aviso>
  } else if (datos.length === 0) {
    cuerpo = <Aviso tipo="aviso">{MSG_VACIO[periodo]}</Aviso>
  } else {
    cuerpo = (
      <>
        {esParcial && (
          <Aviso tipo="aviso">
            Hay datos de {datos.length} de los últimos {esperado.cantidad} {esperado.unidad}.
            Los períodos sin lecturas no se muestran.
          </Aviso>
        )}

        {/* ── Grilla 2x2 de gráficos de línea ── */}
        <div className="history-charts-grid">
          {GRAFICOS.map(cfg => (
            <ChartPanel
              key={cfg.key}
              config={cfg}
              labels={labels}
              datos={datos}
            />
          ))}
        </div>
      </>
    )
  }

  return (
    <section>
      {/* ── Encabezado: título + tabs de período ── */}
      <div className="history-header">
        <h2 className="history-title">{tituloSeccion}</h2>

        {/* Selector de período temporal */}
        <div className="period-tabs">
          {[
            { key: '1d',  label: 'Día'    },
            { key: '7d',  label: 'Semana' },
            { key: '12m', label: 'Año'    },
          ].map(p => (
            <button
              key={p.key}
              className={`period-tab ${periodo === p.key ? 'active' : ''}`}
              onClick={() => setPeriodo(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {cuerpo}

      {/* ── Tabla con las últimas 12 lecturas guardadas ── */}
      {/* Muestra historial24h, independientemente del período elegido en
          los tabs. Solo se ve cuando el período activo tiene datos: si hay
          un cartel (cargando, error o sin datos), la tabla se oculta. */}
      {!error && !cargandoActual && datos.length > 0 &&
        historial24h && historial24h.length > 0 && (
        <div className="history-table-panel">
          <p className="history-table-title">Tabla de Registros</p>

          <table className="reg-table">
            <thead>
              <tr>
                <th className="th-hora">Hora</th>
                <th className="th-temp">Temp (°C)</th>
                <th className="th-hum">Humedad (%)</th>
                <th className="th-pres">Presión (hPa)</th>
                <th className="th-lux">Lux</th>
              </tr>
            </thead>
            <tbody>
              {/* Últimas 12 lecturas, la más reciente arriba */}
              {[...historial24h].slice(-12).reverse().map((reg, i) => (
                <tr key={i}>
                  <td className="td-hora">{formatHora(reg.timestamp)}</td>
                  <td className="td-temp">{reg.temperatura}</td>
                  <td className="td-hum">{reg.humedad}</td>
                  <td className="td-pres">{reg.presion}</td>
                  <td className="td-lux">{reg.luminosidad.toLocaleString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}