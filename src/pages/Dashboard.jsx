import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

import { formatHora } from '../data/mockData'
import { escucharHistorial24h } from '../data/firebaseService'
import './Dashboard.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const VARIABLES = {
  temperatura: { label: 'Temperatura', color: '#FBBF24', unit: '°C',   key: 'temperatura' },
  humedad:     { label: 'Humedad',     color: '#38BDF8', unit: '%',    key: 'humedad'     },
  velocidad_viento: { label: 'Viento', color: '#34D399', unit: ' km/h', key: 'velocidad_viento' },
  co_concentracion: { label: 'CO', color: '#FB7185', unit: ' ppm', key: 'co_concentracion' },
  presion:     { label: 'Presión (opcional)', color: '#A78BFA', unit: ' hPa', key: 'presion' },
}

function calcDelta(actual, anterior, decimales = 1) {
  const diff = parseFloat((actual - anterior).toFixed(decimales))
  const tipo = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
  const signo = diff > 0 ? '+' : ''
  return { texto: `${signo}${diff}`, tipo }
}

// Delta seguro: si falta un dato opcional, no intenta restarlo.
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
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [intentoConexion, setIntentoConexion] = useState(0)

  useEffect(() => {
    const dejarDeEscuchar = escucharHistorial24h(
      (nuevasLecturas) => {
        setHistorial(nuevasLecturas)
        setLectura(nuevasLecturas[nuevasLecturas.length - 1] ?? null)
        setError(null)
        setCargando(false)
      },
      (errorFirestore) => {
        setError(errorFirestore)
        setCargando(false)
      }
    )

    return () => dejarDeEscuchar()
  }, [intentoConexion])

  if (cargando) return <p style={{ color: '#8B949E', padding: '2rem' }}>Cargando datos desde la base de datos...</p>
  if (error) {
    return (
      <section>
        <h2 className="dash-section-title">Lectura en Tiempo Real</h2>
        <div role="alert" style={{ color: '#F87171', padding: '1rem 2rem' }}>
          <p>No se pudieron cargar las lecturas desde Firestore.</p>
          <p>{error.code ? `${error.code}: ` : ''}{error.message ?? String(error)}</p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setCargando(true)
              setIntentoConexion((intento) => intento + 1)
            }}
          >
            Reintentar
          </button>
        </div>
      </section>
    )
  }
  if (!lectura || historial.length === 0) return <p style={{ color: '#8B949E', padding: '2rem' }}>Todavía no hay lecturas en la base de datos.</p>

  // El historial viene ordenado de más viejo a más nuevo; excluimos la lectura
  // actual para comparar las tarjetas con la lectura anterior.
  const penultima = historial.length > 1 ? historial[historial.length - 2] : null
  const variablesDisponibles = Object.entries(VARIABLES)
    .filter(([, variable]) => historial.some(d => d[variable.key] != null))
  const variableActiva = variablesDisponibles.some(([key]) => key === varActiva)
    ? varActiva
    : variablesDisponibles[0]?.[0]
  const config = VARIABLES[variableActiva] ?? VARIABLES.temperatura

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
      delta: calcDeltaSeguro(lectura.temperatura, penultima?.temperatura),
      unidadDelta: '°C', colorClass: 'color-temp', icono: '🌡️'
    },
    {
      label: 'HUMEDAD', valor: lectura.humedad, unidad: ' %',
      delta: calcDeltaSeguro(lectura.humedad, penultima?.humedad),
      unidadDelta: '%', colorClass: 'color-hum', icono: '💧'
    },
    {
      label: 'VELOCIDAD DEL VIENTO', valor: lectura.velocidad_viento, unidad: ' km/h',
      delta: calcDeltaSeguro(lectura.velocidad_viento, penultima?.velocidad_viento),
      unidadDelta: ' km/h', colorClass: 'color-wind', icono: '🌬️'
    },
    {
      label: 'CO (MONÓXIDO DE CARBONO)', valor: lectura.co_concentracion, unidad: ' ppm',
      delta: calcDeltaSeguro(lectura.co_concentracion, penultima?.co_concentracion),
      unidadDelta: ' ppm', colorClass: 'color-co', icono: '🫧'
    },
  ]
  tarjetas.push({
    label: 'PRESIÓN ATM.', valor: lectura.presion, unidad: ' hPa',
    delta: calcDeltaSeguro(lectura.presion, penultima?.presion),
    unidadDelta: ' hPa', colorClass: 'color-pres', icono: '🌀'
  })
  const tarjetasDisponibles = tarjetas.filter(t => t.valor != null)

  return (
    <section>
      <h2 className="dash-section-title">Lectura en Tiempo Real</h2>
      <div className="dash-metrics-grid">
        {tarjetasDisponibles.length > 0
          ? tarjetasDisponibles.map(t => <MetricCard key={t.label} {...t} />)
          : <p style={{ color: '#8B949E', padding: '1rem' }}>La última lectura no contiene mediciones disponibles.</p>}
      </div>
      <div className="dash-chart-panel">
        <div className="dash-chart-header">
          <span className="dash-chart-title">Últimas 24 Horas</span>
          <div className="chart-tabs">
            {variablesDisponibles.map(([key, cfg]) => (
              <button
                key={key}
                className={`chart-tab ${variableActiva === key ? 'active' : ''}`}
                onClick={() => setVarActiva(key)}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dash-chart-wrapper">
          {variablesDisponibles.length > 0
            ? <Line data={chartData} options={chartOptions} />
            : <p style={{ color: '#8B949E', padding: '1rem' }}>No hay variables con datos para graficar.</p>}
        </div>
      </div>
    </section>
  )
}
