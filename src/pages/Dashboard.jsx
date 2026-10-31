import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

import { formatHora } from '../data/mockData'
import { getLecturaActual, getHistorial24h } from '../data/firebaseService'
import './Dashboard.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const VARIABLES = {
  temperatura: { label: 'Temperatura', color: '#FBBF24', unit: '°C',   key: 'temperatura' },
  humedad:     { label: 'Humedad',     color: '#38BDF8', unit: '%',    key: 'humedad'     },
  presion:     { label: 'Presión',     color: '#A78BFA', unit: ' hPa', key: 'presion'     },
  luminosidad: { label: 'Luminosidad', color: '#FDE68A', unit: ' lux', key: 'luminosidad' },
}

function calcDelta(actual, anterior, decimales = 1) {
  const diff = parseFloat((actual - anterior).toFixed(decimales))
  const tipo = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
  const signo = diff > 0 ? '+' : ''
  return { texto: `${signo}${diff}`, tipo }
}

// Delta seguro: si falta el dato (ej. luminosidad = null), no explota
function calcDeltaSeguro(actual, anterior, decimales = 1) {
  if (actual == null || anterior == null) {
    return { texto: '—', tipo: 'same' }
  }
  return calcDelta(actual, anterior, decimales)
}

function MetricCard({ label, valor, unidad, delta, unidadDelta, colorClass, icono }) {
  const arrow = delta.tipo === 'up' ? '↑' : delta.tipo === 'down' ? '↓' : '→'
  const deltaClass = `metric-delta delta-${delta.tipo}`
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">{icono}</span>
      </div>
      <div className={`metric-value ${colorClass}`}>
        {valor != null ? valor : '—'}
        <span className="metric-unit">{unidad}</span>
      </div>
      <span className={deltaClass}>
        {arrow} {delta.texto}{delta.tipo !== 'same' || delta.texto !== '—' ? unidadDelta : ''} vs hora anterior
      </span>
    </div>
  )
}

export default function Dashboard() {
  const [varActiva, setVarActiva] = useState('temperatura')
  const [lectura, setLectura] = useState(null)
  const [historial, setHistorial] = useState([])

  useEffect(() => {
    getLecturaActual().then(setLectura)
    getHistorial24h().then(setHistorial)
  }, [])

  // ── El if va ANTES de usar lectura, pero DESPUÉS de los hooks ────
  if (!lectura || historial.length === 0) return <p style={{ color: '#8B949E', padding: '2rem' }}>Cargando datos...</p>

  // A partir de acá lectura e historial están disponibles.
  // penultima = último registro guardado del historial (la hora más
  // reciente ya "cerrada"); lectura = snapshot en vivo de ahora mismo.
  const penultima = historial[historial.length - 1] || historial[0]
  const config = VARIABLES[varActiva]

  const chartData = {
    labels: historial.map(d => formatHora(d.timestamp)),
    datasets: [{
      label: config.label,
      data: historial.map(d => d[config.key]),
      borderColor: config.color,
      backgroundColor: `${config.color}18`,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: true,
    }]
  }

  const chartOptions = {
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
        callbacks: { label: (ctx) => ` ${ctx.parsed.y}${config.unit}` }
      }
    },
    scales: {
      x: {
        ticks: { color: '#484F58', font: { family: 'JetBrains Mono', size: 10 }, maxRotation: 0, maxTicksLimit: 12 },
        grid: { color: '#21262D' },
      },
      y: {
        ticks: { color: '#484F58', font: { family: 'JetBrains Mono', size: 10 }, padding: 8 },
        grid: { color: '#21262D' },
        border: { dash: [4, 4] },
      }
    },
    interaction: { mode: 'index', intersect: false },
  }

  const tarjetas = [
    {
      label: 'TEMPERATURA', valor: lectura.temperatura, unidad: ' °C',
      delta: calcDeltaSeguro(lectura.temperatura, penultima.temperatura),
      unidadDelta: '°C', colorClass: 'color-temp', icono: '🌡️'
    },
    {
      label: 'HUMEDAD', valor: lectura.humedad, unidad: ' %',
      delta: calcDeltaSeguro(lectura.humedad, penultima.humedad),
      unidadDelta: '%', colorClass: 'color-hum', icono: '💧'
    },
    {
      label: 'PRESIÓN ATM.', valor: lectura.presion, unidad: ' hPa',
      delta: calcDeltaSeguro(lectura.presion, penultima.presion),
      unidadDelta: ' hPa', colorClass: 'color-pres', icono: '🌀'
    },
    {
      label: 'LUMINOSIDAD', valor: lectura.luminosidad, unidad: ' lux',
      delta: calcDeltaSeguro(lectura.luminosidad, penultima.luminosidad),
      unidadDelta: ' lux', colorClass: 'color-lux', icono: '☀️'
    },
  ]

  return (
    <section>
      <h2 className="dash-section-title">Lectura en Tiempo Real</h2>
      <div className="dash-metrics-grid">
        {tarjetas.map(t => <MetricCard key={t.label} {...t} />)}
      </div>
      <div className="dash-chart-panel">
        <div className="dash-chart-header">
          <span className="dash-chart-title">Últimas 24 Horas</span>
          <div className="chart-tabs">
            {Object.entries(VARIABLES).map(([key, cfg]) => (
              <button
                key={key}
                className={`chart-tab ${varActiva === key ? 'active' : ''}`}
                onClick={() => setVarActiva(key)}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dash-chart-wrapper">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </section>
  )
}