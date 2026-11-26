// temas.js — Lista de estéticas y utilidades sin React.
// Los valores visuales viven en temas.css; acá solo se elige cuál aplicar.

export const TEMAS = [
  { id: 'original', nombre: 'Original', descripcion: 'Panel oscuro tipo sala de control' },
  { id: 'papel', nombre: 'Papel', descripcion: 'Papel de registro, como un termohigrógrafo' },
  { id: 'cielo', nombre: 'Cielo', descripcion: 'Cielo en vivo: el color sigue a la temperatura' },
]

const CLAVE_GUARDADO = 'estacion.tema'
const TEMA_POR_DEFECTO = 'original'
const esTemaValido = (id) => TEMAS.some((t) => t.id === id)

// El navegador puede bloquear localStorage (modo privado, cookies
// deshabilitadas): en ese caso se usa el tema por defecto sin romper nada.
export function leerTemaGuardado() {
  try {
    const id = localStorage.getItem(CLAVE_GUARDADO)
    return esTemaValido(id) ? id : TEMA_POR_DEFECTO
  } catch {
    return TEMA_POR_DEFECTO
  }
}

export function guardarTema(id) {
  try {
    localStorage.setItem(CLAVE_GUARDADO, id)
  } catch {
    // Sin almacenamiento disponible: el tema dura solo esta visita.
  }
}

// Temperatura (°C) → tono HSL del tema Cielo.
// Frío azul, templado verde agua, cálido ámbar, muy caluroso coral.
const ESCALA_TONO = [
  [-5, 220],
  [8, 200],
  [16, 170],
  [22, 60],
  [27, 36],
  [35, 12],
]
export const TONO_SIN_DATO = 205

// El último tono se recuerda para que, al recargar, la página arranque con
// el color de la última lectura y no salte desde el azul mientras carga.
const CLAVE_TONO = 'estacion.cieloTono'

export function leerTonoGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE_TONO)
    const tono = Number(guardado)
    return guardado !== null && Number.isFinite(tono) ? tono : TONO_SIN_DATO
  } catch {
    return TONO_SIN_DATO
  }
}

export function guardarTono(tono) {
  try {
    localStorage.setItem(CLAVE_TONO, String(tono))
  } catch {
    // Sin almacenamiento: la próxima carga arranca con el tono por defecto.
  }
}

export function tonoCielo(temperatura) {
  if (temperatura == null || !Number.isFinite(temperatura)) return TONO_SIN_DATO
  const [primero] = ESCALA_TONO
  const ultimo = ESCALA_TONO[ESCALA_TONO.length - 1]
  if (temperatura <= primero[0]) return primero[1]
  if (temperatura >= ultimo[0]) return ultimo[1]
  for (let i = 1; i < ESCALA_TONO.length; i++) {
    const [t1, h1] = ESCALA_TONO[i]
    if (temperatura <= t1) {
      const [t0, h0] = ESCALA_TONO[i - 1]
      return Math.round(h0 + ((temperatura - t0) / (t1 - t0)) * (h1 - h0))
    }
  }
  return TONO_SIN_DATO
}

// Chart.js dibuja en un <canvas> y no entiende var(--...): se leen los
// valores ya resueltos del tema activo.
export function leerColoresGrafico(elemento = document.documentElement) {
  const estilo = getComputedStyle(elemento)
  const v = (nombre) => estilo.getPropertyValue(nombre).trim()
  return {
    variables: {
      temperatura: v('--c-temp'),
      humedad: v('--c-hum'),
      velocidad_viento: v('--c-wind'),
      co_concentracion: v('--c-co'),
      presion: v('--c-pres'),
    },
    grilla: v('--chart-grid'),
    ejes: v('--chart-tick'),
    tooltipFondo: v('--tooltip-bg'),
    tooltipBorde: v('--tooltip-border'),
    tooltipTitulo: v('--tooltip-title'),
    tooltipTexto: v('--tooltip-body'),
    fuente: v('--font-data'),
  }
}
