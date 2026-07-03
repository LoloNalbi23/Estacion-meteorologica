// =============================================================
// History.jsx — Ruta "/history"
// Muestra: 4 gráficos de línea (temperatura, humedad, presión, lux)
//          con selector Día / Semana / Año,
//          + tabla con las últimas 12 lecturas horarias
// =============================================================

import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Los 3 períodos usan datos reales — ver Apiweather.js:
//  - Día:    OpenWeatherMap (lectura actual) + caminata anclada en localStorage
//  - Semana: Open-Meteo Forecast API (past_days=7)
//  - Año:    Open-Meteo Archive API (reanálisis ERA5, promedio mensual)
import { formatHora, formatFecha } from '../data/mockData'
import { getHistorial24h, getHistorialSemana, getHistorialAnio } from '../data/Apiweather'
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

// ── Componente principal ──────────────────────────────────────────
export default function History() {
  // Período seleccionado: '1d' | '7d' | '12m'
  const [periodo, setPeriodo] = useState('1d')

  // Historial de las últimas 24h, anclado a la lectura real (se necesita
  // siempre, no solo cuando periodo === '1d', porque la tabla de abajo
  // lo muestra sin importar qué tab esté activa)
  const [historial24h, setHistorial24h] = useState([])
  const [cargando, setCargando] = useState(true)

  // Semana y Año se piden a Open-Meteo la primera vez que se abre esa
  // pestaña (lazy) y quedan en memoria — no hace falta re-pedirlos cada
  // vez que el usuario cambia de tab dentro de la misma visita.
  const [historialSemana, setHistorialSemana] = useState([])
  const [historialAnio, setHistorialAnio] = useState([])
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false)
  const [errorPeriodo, setErrorPeriodo] = useState(null)

  useEffect(() => {
    getHistorial24h().then(h => {
      setHistorial24h(h)
      setCargando(false)
    })
  }, [])

  useEffect(() => {
    if (periodo === '7d' && historialSemana.length === 0) {
      setErrorPeriodo(null)
      setCargandoPeriodo(true)
      getHistorialSemana()
        .then(setHistorialSemana)
        .catch(() => setErrorPeriodo('No se pudo obtener el historial semanal (Open-Meteo).'))
        .finally(() => setCargandoPeriodo(false))
    }
    if (periodo === '12m' && historialAnio.length === 0) {
      setErrorPeriodo(null)
      setCargandoPeriodo(true)
      getHistorialAnio()
        .then(setHistorialAnio)
        .catch(() => setErrorPeriodo('No se pudo obtener el historial anual (Open-Meteo).'))
        .finally(() => setCargandoPeriodo(false))
    }
  }, [periodo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selección de datos y etiquetas según el período ──────────────
  const { datos, labels } = (() => {
    if (periodo === '7d') {
      return {
        datos: historialSemana,
        labels: historialSemana.map(d => formatFecha(d.timestamp))
      }
    }
    if (periodo === '12m') {
      return {
        datos: historialAnio,
        labels: historialAnio.map(d => d.label) // "Ene", "Feb", etc.
      }
    }
    // Por defecto: últimas 24h (un punto por hora)
    return {
      datos: historial24h,
      labels: historial24h.map(d => formatHora(d.timestamp))
    }
  })()

  if (cargando) {
    return <p style={{ color: '#8B949E', padding: '2rem' }}>Cargando datos...</p>
  }

  // Semana/Año todavía no llegaron (o fallaron) → mostrar estado en vez
  // de gráficos vacíos
  if (periodo !== '1d' && cargandoPeriodo) {
    return <p style={{ color: '#8B949E', padding: '2rem' }}>Consultando historial real en Open-Meteo...</p>
  }
  if (periodo !== '1d' && errorPeriodo) {
    return <p style={{ color: '#F87171', padding: '2rem' }}>{errorPeriodo}</p>
  }

  // Título dinámico según período
  const tituloSeccion = {
    '1d':  'DATOS HISTÓRICOS — ÚLTIMAS 24 H',
    '7d':  'DATOS HISTÓRICOS — ÚLTIMA SEMANA',
    '12m': 'DATOS HISTÓRICOS — ÚLTIMO AÑO',
  }[periodo]

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

      {/* ── Tabla de registros de las últimas 12 horas ── */}
      {/* Siempre muestra historial24h (las últimas 12 de las 24h ancladas),
          independientemente del período elegido en los tabs */}
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
            {/* 12 filas — una por hora, en orden descendente (más reciente arriba) */}
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
    </section>
  )
}
