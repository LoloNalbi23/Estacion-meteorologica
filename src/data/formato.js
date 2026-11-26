// Formateadores y ayudas de gráficos compartidas por las pantallas.
// Todos los datos visibles salen de Firestore (lecturas de los sensores).

// Hora en formato 24 h ("14:05"), como se usa en Argentina.
export const formatHora = (date) =>
  date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export const formatFecha = (date) =>
  date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })

// Nombres legibles de cada campo del contrato de lecturas.
export const NOMBRE_CAMPO = {
  temperatura: 'temperatura',
  humedad: 'humedad',
  velocidad_viento: 'viento',
  co_concentracion: 'CO',
  presion: 'presión',
}

// Radio de punto para Chart.js: las líneas se dibujan sin puntos, pero un
// valor sin vecinos (una sola lectura, o una rodeada de huecos) no forma
// ninguna línea y quedaría invisible. En ese caso se dibuja el punto.
export function radioPuntoAislado(ctx) {
  const datos = ctx.dataset?.data
  const i = ctx.dataIndex
  if (!datos || i == null || datos[i] == null) return 0
  return datos[i - 1] == null && datos[i + 1] == null ? 3 : 0
}

// Opciones de Chart.js compartidas por el Dashboard y el Histórico.
// `colores` sale de useTema().coloresGrafico, así los ejes, la grilla y el
// tooltip cambian con la estética elegida.
export function opcionesGrafico(colores, unidad, { tamTicks = 10, maxTicks = 12 } = {}) {
  const fuente = (size) => ({ family: colores.fuente, size })
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colores.tooltipFondo,
        borderColor: colores.tooltipBorde,
        borderWidth: 1,
        titleColor: colores.tooltipTitulo,
        bodyColor: colores.tooltipTexto,
        bodyFont: fuente(12),
        titleFont: fuente(11),
        callbacks: { label: (ctx) => ` ${ctx.parsed.y}${unidad}` },
      },
    },
    scales: {
      x: {
        ticks: { color: colores.ejes, font: fuente(tamTicks), maxRotation: 0, maxTicksLimit: maxTicks },
        grid: { color: colores.grilla },
      },
      y: {
        ticks: { color: colores.ejes, font: fuente(tamTicks), padding: 8 },
        grid: { color: colores.grilla },
        border: { dash: [4, 4] },
      },
    },
    interaction: { mode: 'index', intersect: false },
  }
}
