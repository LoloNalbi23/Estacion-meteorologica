import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

import { formatHora, radioPuntoAislado, opcionesGrafico } from '../data/formato'
import { escucharHistorial24h } from '../data/firebaseService'
import { useTema } from '../temas/TemaContext'
import Aviso from '../components/Aviso'
import './Dashboard.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

// El color de cada línea sale del tema activo (useTema().coloresGrafico).
const VARIABLES = {
  temperatura: { label: 'Temperatura', unit: '°C',   key: 'temperatura' },
  humedad:     { label: 'Humedad',     unit: '%',    key: 'humedad'     },
  velocidad_viento: { label: 'Viento', unit: ' km/h', key: 'velocidad_viento' },
  co_concentracion: { label: 'CO', unit: ' ppm', key: 'co_concentracion' },
  presion:     { label: 'Presión (opcional)', unit: ' hPa', key: 'presion' },
}

function calcDelta(actual, anterior, decimales = 1) {
  const diff = parseFloat((actual - anterior).toFixed(decimales))
  const tipo = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
  const signo = diff > 0 ? '+' : ''
  return { texto: `${signo}${diff}`, tipo }
}

// Delta seguro: si no hay con qué comparar, lo dice en vez de restar.
function calcDeltaSeguro(actual, lecturaAnterior, campo, decimales = 1) {
  if (!lecturaAnterior) {
    return { texto: 'Sin lectura anterior para comparar', tipo: 'none' }
  }
  const anterior = lecturaAnterior[campo]
  if (actual == null || anterior == null) {
    return { texto: 'La lectura anterior no trajo este dato', tipo: 'none' }
  }
  return calcDelta(actual, anterior, decimales)
}

function MetricCard({ label, valor, unidad, delta, unidadDelta, colorClass, icono }) {
  const arrow = delta.tipo === 'up' ? '↑' : delta.tipo === 'down' ? '↓' : '→'
  const deltaClass = `metric-delta delta-${delta.tipo}`
  const comparacion = delta.tipo === 'none'
    ? delta.texto
    : `${arrow} ${delta.texto}${unidadDelta} vs lectura anterior`
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
      <span className={deltaClass}>{comparacion}</span>
    </div>
  )
}

export default function Dashboard() {
  const { coloresGrafico } = useTema()
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
        console.error('Error consultando datos del Dashboard:', errorFirestore)
        setError(errorFirestore)
        setCargando(false)
      }
    )

    return () => dejarDeEscuchar()
  }, [intentoConexion])

  if (cargando) return <Aviso>Cargando las lecturas de la estación…</Aviso>
  if (error) {
    return (
      <section>
        <h2 className="dash-section-title">Lectura en tiempo real</h2>
        <Aviso tipo="error">
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
        </Aviso>
      </section>
    )
  }
  if (!lectura || historial.length === 0) {
    return (
      <Aviso tipo="aviso">
        No llegaron lecturas de la estación en las últimas 24 horas. Cuando el ESP32 envíe datos, van a aparecer acá.
      </Aviso>
    )
  }

  // El historial viene ordenado de más viejo a más nuevo; excluimos la lectura
  // actual para comparar las tarjetas con la lectura anterior.
  const penultima = historial.length > 1 ? historial[historial.length - 2] : null
  const variablesDisponibles = Object.entries(VARIABLES)
    .filter(([, variable]) => historial.some(d => d[variable.key] != null))
  const variableActiva = variablesDisponibles.some(([key]) => key === varActiva)
    ? varActiva
    : variablesDisponibles[0]?.[0]
  const config = VARIABLES[variableActiva] ?? VARIABLES.temperatura
  const color = coloresGrafico.variables[config.key]

  const chartData = {
    labels: historial.map(d => formatHora(d.timestamp)),
    datasets: [{
      label: config.label,
      data: historial.map(d => d[config.key]),
      borderColor: color,
      backgroundColor: `${color}18`,
      borderWidth: 2,
      pointRadius: radioPuntoAislado,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: true,
    }]
  }

  const chartOptions = opcionesGrafico(coloresGrafico, config.unit)

  const tarjetas = [
    {
      label: 'Temperatura', valor: lectura.temperatura, unidad: ' °C',
      delta: calcDeltaSeguro(lectura.temperatura, penultima, 'temperatura'),
      unidadDelta: '°C', colorClass: 'color-temp', icono: '🌡️'
    },
    {
      label: 'Humedad', valor: lectura.humedad, unidad: ' %',
      delta: calcDeltaSeguro(lectura.humedad, penultima, 'humedad'),
      unidadDelta: '%', colorClass: 'color-hum', icono: '💧'
    },
    {
      label: 'Velocidad del viento', valor: lectura.velocidad_viento, unidad: ' km/h',
      delta: calcDeltaSeguro(lectura.velocidad_viento, penultima, 'velocidad_viento'),
      unidadDelta: ' km/h', colorClass: 'color-wind', icono: '🌬️'
    },
    {
      label: 'CO (monóxido de carbono)', valor: lectura.co_concentracion, unidad: ' ppm',
      delta: calcDeltaSeguro(lectura.co_concentracion, penultima, 'co_concentracion'),
      unidadDelta: ' ppm', colorClass: 'color-co', icono: '🫧'
    },
  ]
  tarjetas.push({
    label: 'Presión atmosférica', valor: lectura.presion, unidad: ' hPa',
    delta: calcDeltaSeguro(lectura.presion, penultima, 'presion'),
    unidadDelta: ' hPa', colorClass: 'color-pres', icono: '🌀'
  })
  const tarjetasDisponibles = tarjetas.filter(t => t.valor != null)

  return (
    <section>
      <h2 className="dash-section-title">Lectura en tiempo real</h2>
      <div className="dash-metrics-grid">
        {tarjetasDisponibles.length > 0
          ? tarjetasDisponibles.map(t => <MetricCard key={t.label} {...t} />)
          : <Aviso tipo="aviso">La última lectura no contiene mediciones disponibles.</Aviso>}
      </div>
      <div className="dash-chart-panel">
        <div className="dash-chart-header">
          <span className="dash-chart-title">Últimas 24 horas</span>
          <div className="chart-tabs">
            {variablesDisponibles.map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                aria-pressed={variableActiva === key}
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
            : <Aviso tipo="aviso">No hay variables con datos para graficar.</Aviso>}
        </div>
      </div>
    </section>
  )
}
