// =============================================================
// History.jsx — Ruta "/history"
// Muestra: 4 gráficos de línea (temperatura, humedad, presión, lux)
//          con selector Día / Semana / Año,
//          + tabla con las últimas 12 lecturas horarias
// =============================================================

import { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Datos mock: 12h = día, 7d = semana, 12m = año
import { datos12h, datos7d, datos12m, formatHora, formatFecha } from '../data/mockData'
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

  // ── Selección de datos y etiquetas según el período ──────────────
  // Cuando Flask esté listo, acá harías un fetch diferente por período
  const { datos, labels } = (() => {
    if (periodo === '7d') {
      return {
        datos: datos7d,
        labels: datos7d.map(d => formatFecha(d.timestamp))
      }
    }
    if (periodo === '12m') {
      return {
        datos: datos12m,
        labels: datos12m.map(d => d.label) // "Ene", "Feb", etc.
      }
    }
    // Por defecto: últimas 12h (un punto por hora)
    return {
      datos: datos12h,
      labels: datos12h.map(d => formatHora(d.timestamp))
    }
  })()

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
      {/* Siempre muestra datos12h independientemente del período */}
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
            {[...datos12h].reverse().map((reg, i) => (
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
