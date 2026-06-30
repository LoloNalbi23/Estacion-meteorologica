// =============================================================
// Dashboard.jsx — Ruta "/" (pantalla de inicio)
// Muestra: 7 tarjetas de métricas en tiempo real +
//          gráfico de línea de las últimas 24h con selector de variable
// =============================================================

import { useState, useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Datos mock — se reemplazarán por fetch() a Flask cuando esté lista la API
import { datos12h, lecturaActual, formatHora } from '../data/mockData'
import './Dashboard.css'

// ── Registro de módulos de Chart.js necesarios ────────────────────
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

// ── Configuración de colores por variable ─────────────────────────
// Cada entrada define el color de línea y relleno del gráfico
const VARIABLES = {
  temperatura: { label: 'Temperatura',  color: '#FBBF24', unit: '°C',  key: 'temperatura' },
  humedad:     { label: 'Humedad',      color: '#38BDF8', unit: '%',   key: 'humedad'     },
  presion:     { label: 'Presión',      color: '#A78BFA', unit: ' hPa',key: 'presion'     },
  luminosidad: { label: 'Luminosidad',  color: '#FDE68A', unit: ' lux',key: 'luminosidad' },
}

// ── Helper: calcula delta vs registro anterior ────────────────────
// Devuelve { valor, tipo: 'up' | 'down' | 'same' }
function calcDelta(actual, anterior, decimales = 1) {
  const diff = parseFloat((actual - anterior).toFixed(decimales))
  const tipo = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
  const signo = diff > 0 ? '+' : ''
  return { texto: `${signo}${diff}`, tipo }
}

// ── Sub-componente: tarjeta de una métrica ────────────────────────
function MetricCard({ label, valor, unidad, delta, unidadDelta, colorClass, icono }) {
  // Flecha según tendencia
  const arrow = delta.tipo === 'up' ? '↑' : delta.tipo === 'down' ? '↓' : '→'
  const deltaClass = `metric-delta delta-${delta.tipo}`

  return (
    <div className="metric-card">
      {/* Nombre de la variable + ícono */}
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">{icono}</span>
      </div>

      {/* Valor numérico grande */}
      <div className={`metric-value ${colorClass}`}>
        {valor}
        <span className="metric-unit">{unidad}</span>
      </div>

      {/* Comparativa con la lectura de hace 1 hora */}
      <span className={deltaClass}>
        {arrow} {delta.texto}{unidadDelta} vs hora anterior
      </span>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function Dashboard() {
  // Variable seleccionada para el gráfico (por defecto: temperatura)
  const [varActiva, setVarActiva] = useState('temperatura')

  // Lectura actual y penúltima (para calcular delta)
  const actual    = lecturaActual
  const penultima = datos12h[datos12h.length - 2] || datos12h[0]

  // ── Datos del gráfico: etiquetas (horas) + valores de la variable activa ──
  // Genera datos con más puntos para que se vea suave como en la captura
  const labels = datos12h.map(d => formatHora(d.timestamp))
  const config = VARIABLES[varActiva]

  const chartData = {
    labels,
    datasets: [{
      label: config.label,
      // Mapea el array de datos a los valores de la variable seleccionada
      data: datos12h.map(d => d[config.key]),
      borderColor: config.color,
      backgroundColor: `${config.color}18`, // relleno semitransparente
      borderWidth: 2,
      pointRadius: 0,          // sin puntos — línea limpia
      pointHoverRadius: 4,
      tension: 0.4,             // curva suave (0 = línea recta, 1 = muy curvo)
      fill: true,
    }]
  }

  // ── Opciones de Chart.js ──────────────────────────────────────────
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // ocultamos la leyenda (el tab la reemplaza)
      tooltip: {
        backgroundColor: '#1C2333',
        borderColor: '#30363D',
        borderWidth: 1,
        titleColor: '#8B949E',
        bodyColor: '#E6EDF3',
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        titleFont: { family: 'JetBrains Mono', size: 11 },
        callbacks: {
          // Agrega la unidad al valor en el tooltip
          label: (ctx) => ` ${ctx.parsed.y}${config.unit}`
        }
      }
    },
    scales: {
      x: {
        // Eje X: horas
        ticks: {
          color: '#484F58',
          font: { family: 'JetBrains Mono', size: 10 },
          maxRotation: 0,
          maxTicksLimit: 12,
        },
        grid: { color: '#21262D', drawBorder: false },
      },
      y: {
        // Eje Y: valores de la variable
        ticks: {
          color: '#484F58',
          font: { family: 'JetBrains Mono', size: 10 },
          padding: 8,
        },
        grid: { color: '#21262D', drawBorder: false },
        border: { dash: [4, 4] },
      }
    },
    interaction: { mode: 'index', intersect: false },
  }

  // ── Datos para las 7 tarjetas ──────────────────────────────────────
  const tarjetas = [
    // Fila 1 (4 columnas principales)
    {
      label: 'TEMPERATURA', valor: actual.temperatura, unidad: ' °C',
      delta: calcDelta(actual.temperatura, penultima.temperatura),
      unidadDelta: '°C', colorClass: 'color-temp', icono: '🌡️'
    },
    {
      label: 'HUMEDAD', valor: actual.humedad, unidad: ' %',
      delta: calcDelta(actual.humedad, penultima.humedad),
      unidadDelta: '%', colorClass: 'color-hum', icono: '💧'
    },
    {
      label: 'PRESIÓN ATM.', valor: actual.presion, unidad: ' hPa',
      delta: calcDelta(actual.presion, penultima.presion),
      unidadDelta: ' hPa', colorClass: 'color-pres', icono: '🌀'
    },
    {
      label: 'LUMINOSIDAD', valor: actual.luminosidad, unidad: ' lux',
      delta: calcDelta(actual.luminosidad, penultima.luminosidad),
      unidadDelta: ' lux', colorClass: 'color-lux', icono: '☀️'
    },
  ]

  return (
    <section>
      {/* Título de sección en mayúsculas monoespaciado */}
      <h2 className="dash-section-title">Lectura en Tiempo Real</h2>

      {/* ── Grilla de 4 tarjetas ── */}
      <div className="dash-metrics-grid">
        {tarjetas.map(t => (
          <MetricCard key={t.label} {...t} />
        ))}
      </div>

      {/* ── Panel del gráfico de las últimas 24h ── */}
      <div className="dash-chart-panel">
        <div className="dash-chart-header">
          <span className="dash-chart-title">Últimas 24 Horas</span>

          {/* Tabs para cambiar la variable graficada */}
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

        {/* Canvas de Chart.js envuelto para controlar altura */}
        <div className="dash-chart-wrapper">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </section>
  )
}
