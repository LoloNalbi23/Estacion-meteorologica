// =============================================================
// History.jsx — Ruta "/history"
// Muestra gráficos de temperatura, humedad, viento, CO y presión opcional
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

import { formatHora, formatFecha, radioPuntoAislado, opcionesGrafico } from '../data/formato'
import { getHistorial24h, getHistorialSemana, getHistorialAnio } from '../data/firebaseService'
import { useTema } from '../temas/TemaContext'
import Aviso from '../components/Aviso'
import './History.css'

// Registro de módulos Chart.js (solo necesario una vez en la app,
// pero lo dejamos aquí por claridad)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

// ── Configuración de variables históricas ────────────────────────
// Cada entrada define qué variable graficar; el color sale del tema activo
const GRAFICOS = [
  { key: 'temperatura', label: 'Temperatura', unit: '°C' },
  { key: 'humedad', label: 'Humedad', unit: '%' },
  { key: 'velocidad_viento', label: 'Velocidad del viento', unit: ' km/h' },
  { key: 'co_concentracion', label: 'CO (monóxido de carbono)', unit: ' ppm' },
  { key: 'presion', label: 'Presión (opcional)', unit: ' hPa' },
]

const CLASE_COLUMNA = {
  temperatura: 'temp',
  humedad: 'hum',
  velocidad_viento: 'wind',
  co_concentracion: 'co',
  presion: 'pres',
}

// ── Mensajes ──────────────────────────────────────────────────────
const MSG_VACIO = {
  '1d': 'No llegaron lecturas de la estación en las últimas 24 horas. Cuando el ESP32 envíe datos, van a aparecer acá.',
  '7d': 'La estación no envió lecturas en los últimos 7 días.',
  '12m': 'La estación no envió lecturas en los últimos 12 meses.',
}

const MSG_ERROR =
  'No se pudo consultar la base de datos. Abrí la consola del navegador (F12) para ver el detalle. ' +
  'Si el error menciona un índice, tocá el link que trae para crearlo, esperá unos minutos y recargá.'

// Cuántos puntos tendría el gráfico si hubiera datos de todo el período
const ESPERADOS = {
  '7d': { cantidad: 7, unidad: 'días' },
  '12m': { cantidad: 12, unidad: 'meses' },
}

// ── Sub-componente: un panel con un único gráfico ─────────────────
function ChartPanel({ config, labels, datos }) {
  const { coloresGrafico } = useTema()
  const color = coloresGrafico.variables[config.key]

  // Construye el objeto de datos que espera Chart.js
  const chartData = {
    labels,
    datasets: [{
      label: config.label,
      data: datos.map(d => d[config.key]),
      borderColor: color,
      backgroundColor: `${color}15`,
      borderWidth: 2,
      pointRadius: radioPuntoAislado,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: true,
    }]
  }

  return (
    <div className="history-chart-panel">
      <p className="history-chart-label">{config.label}</p>
      <div className="history-chart-wrapper">
        <Line data={chartData} options={opcionesGrafico(coloresGrafico, config.unit, { tamTicks: 9, maxTicks: 8 })} />
      </div>
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
  const graficosVisibles = GRAFICOS.filter(
    cfg => datos.some(d => d[cfg.key] != null)
  )
  const columnasTabla = GRAFICOS.filter(
    cfg => historial24h?.some(reg => reg[cfg.key] != null)
  )

  const labels = (() => {
    if (periodo === '7d') return datos.map(d => formatFecha(d.timestamp))
    if (periodo === '12m') return datos.map(d => d.label) // "Ene", "Feb", etc.
    return datos.map(d => formatHora(d.timestamp))        // últimas 24 h
  })()

  // Si hay datos pero de menos días/meses de los esperados, se avisa
  const esperado = ESPERADOS[periodo]
  const esParcial = esperado && datos.length > 0 && datos.length < esperado.cantidad

  // Título dinámico según período
  const tituloSeccion = {
    '1d': 'Datos históricos — últimas 24 h',
    '7d': 'Datos históricos — última semana',
    '12m': 'Datos históricos — último año',
  }[periodo]

  // ── Cuerpo según el estado: error, cargando, vacío o con datos ───
  let cuerpo
  if (error) {
    cuerpo = <Aviso tipo="error">{error}</Aviso>
  } else if (cargandoActual) {
    cuerpo = <Aviso>Cargando el historial de la estación…</Aviso>
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
        {graficosVisibles.length > 0
          ? <div className="history-charts-grid">
              {graficosVisibles.map(cfg => (
                <ChartPanel
                  key={cfg.key}
                  config={cfg}
                  labels={labels}
                  datos={datos}
                />
              ))}
            </div>
          : <Aviso tipo="aviso">Hay registros en este período, pero no contienen mediciones disponibles para graficar.</Aviso>}
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
            { key: '1d', label: 'Día' },
            { key: '7d', label: 'Semana' },
            { key: '12m', label: 'Año' },
          ].map(p => (
            <button
              key={p.key}
              type="button"
              aria-pressed={periodo === p.key}
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
            <p className="history-table-title">Tabla de registros</p>

            <table className="reg-table">
              <thead>
                <tr>
                  <th className="th-hora">Hora</th>
                  {columnasTabla.map(cfg => (
                    <th key={cfg.key} className={`th-${CLASE_COLUMNA[cfg.key]}`}>
                      {cfg.key === 'temperatura' ? 'Temp (°C)'
                        : cfg.key === 'humedad' ? 'Humedad (%)'
                          : cfg.key === 'velocidad_viento' ? 'Viento (km/h)'
                            : cfg.key === 'co_concentracion' ? 'CO (ppm)' : 'Presión (hPa)'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Últimas 12 lecturas, la más reciente arriba */}
                {[...historial24h].slice(-12).reverse().map((reg, i) => (
                  <tr key={i}>
                    <td className="td-hora">{formatHora(reg.timestamp)}</td>
                    {columnasTabla.map(cfg => (
                      <td key={cfg.key} className={`td-${CLASE_COLUMNA[cfg.key]}`}>
                        {reg[cfg.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {columnasTabla.some(cfg => cfg.key === 'presion') && <p className="history-table-note">Presión medida por el BME280 (opcional).</p>}
          </div>
        )}
    </section>
  )
}
