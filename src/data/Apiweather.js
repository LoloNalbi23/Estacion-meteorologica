// weatherApi.js — Capa de datos externa

const API_KEY = '074f4e3a7bf8eb9439eccc6ae57e395b'
const LAT = -31.4135
const LON = -64.1811

// Conversión aproximada de radiación solar (W/m²) a luminosidad (lux).
// Ningún servicio meteorológico público mide lux directamente (no es
// una variable meteorológica estándar) — este mismo factor se usa más
// abajo para Semana y Año, así que "hoy" queda consistente con esos.
const LUX_POR_WATT = 120

// ── Luminosidad actual, aproximada desde radiación solar real ───────
// OpenWeatherMap (usado abajo para temp/humedad/presión) no da
// luminosidad en su plan gratuito, así que la sacamos de Open-Meteo
// (gratis, sin key), pidiendo la radiación solar "current".
async function getLuminosidadActual() {
    try {
        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${LAT}&longitude=${LON}` +
            `&current=shortwave_radiation&timezone=auto`
        const res = await fetch(url)
        if (!res.ok) return null
        const json = await res.json()
        const radiacion = json?.current?.shortwave_radiation
        if (typeof radiacion !== 'number') return null
        // De noche la radiación real es 0 → 0 lux, es correcto, no un error
        return Math.round(Math.max(0, radiacion * LUX_POR_WATT))
    } catch {
        return null // si falla, mejor null (se ve como "—") que inventar un número
    }
}

export async function getLecturaActual() {
    const [res, luminosidad] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${API_KEY}`),
        getLuminosidadActual(),
    ])
    const data = await res.json()

    return {
        temperatura: data.main.temp,
        humedad: data.main.humidity,
        presion: data.main.pressure,
        luminosidad,
        timestamp: new Date(data.dt * 1000),
    }
}

// =============================================================
// getHistorial24h — Reemplazo temporal del historial real
// =============================================================
// TODO(Flask, Fase 3): cuando el backend persista lecturas reales en la
// base de datos, reemplazar esto por un fetch, ej: GET /api/historial?h=24
//
// Por qué existe:
// Todavía no hay BD que guarde lecturas pasadas, así que no hay forma
// honesta de mostrar "las últimas 24h reales". Simulamos un historial
// PLAUSIBLE anclado a la lectura real, usando localStorage como un
// "buffer" temporal — hace las veces de la base de datos que todavía
// no existe.
//
// Por qué localStorage y no generarlo de nuevo en cada render:
// Antes, cada vez que se montaba Dashboard o History se llamaba a
// Math.random() para las 24 horas enteras → recargar la página = otro
// historial completamente distinto. Un sensor real no se "re-tira los
// dados" solo porque vos apretaste F5. Ahora el historial se guarda,
// y solo se agrega una hora nueva cuando pasó una hora real de verdad.
const CLAVE_HISTORIAL = 'estacion_historial24h'
const HORAS_VENTANA = 24
const UNA_HORA_MS = 60 * 60 * 1000
const PASO_MAX = { temperatura: 0.4, humedad: 1.5, presion: 0.6, luminosidad: 40 }

// Redondea "hacia abajo" a la hora en punto (minutos, segundos y ms a 0).
// Este es el cambio central de la migración: antes anclábamos todo a
// new Date() tal cual, con los minutos que tuviera el reloj en ese
// instante — por eso el historial quedaba en :33, :47, etc. Ahora todo
// timestamp que entra al historial pasa por acá primero.
const redondearHora = (fecha) => {
    const d = new Date(fecha)
    d.setMinutes(0, 0, 0)
    return d
}

// Un paso de la caminata aleatoria a partir de un valor anterior
const pasoAleatorio = (valorAnterior, variable) => {
    const paso = (Math.random() - 0.5) * PASO_MAX[variable] * 2
    return parseFloat((valorAnterior + paso).toFixed(1))
}

// Genera las 24h iniciales ancladas a una lectura real (solo se usa
// la primera vez, cuando todavía no hay nada en localStorage). El
// último punto queda en la hora en punto actual (ej: si son las 14:33,
// ese registro se guarda con timestamp 14:00, valor = lectura real de
// ahora) y los anteriores retroceden de a 1h exacta: 13:00, 12:00...
function generarHistorialInicial(lecturaActual) {
    const horaActual = redondearHora(new Date())

    const construirSerie = (valorFinal, variable) => {
        const serie = new Array(HORAS_VENTANA)
        serie[HORAS_VENTANA - 1] = valorFinal
        for (let i = HORAS_VENTANA - 2; i >= 0; i--) {
            serie[i] = pasoAleatorio(serie[i + 1], variable)
        }
        return serie
    }

    const temps = construirSerie(lecturaActual.temperatura, 'temperatura')
    const humedades = construirSerie(lecturaActual.humedad, 'humedad')
    const presiones = construirSerie(lecturaActual.presion, 'presion')
    const luces = construirSerie(lecturaActual.luminosidad ?? 400, 'luminosidad')

    return Array.from({ length: HORAS_VENTANA }, (_, i) => ({
        timestamp: new Date(horaActual.getTime() - (HORAS_VENTANA - 1 - i) * UNA_HORA_MS),
        temperatura: temps[i],
        humedad: humedades[i],
        presion: presiones[i],
        luminosidad: Math.max(0, luces[i]),
    }))
}

function cargarHistorialGuardado() {
    try {
        const crudo = localStorage.getItem(CLAVE_HISTORIAL)
        if (!crudo) return null
        // Los timestamps se guardan como string ISO — hay que revivirlos a Date
        return JSON.parse(crudo).map(reg => ({ ...reg, timestamp: new Date(reg.timestamp) }))
    } catch {
        return null
    }
}

function guardarHistorial(historial) {
    try {
        localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial))
    } catch {
        // localStorage lleno o deshabilitado (ej: modo incógnito) — no es
        // grave, simplemente no persiste entre recargas
    }
}

// ── Función pública: siempre devuelve un array de 24 registros ──────────────
export async function getHistorial24h() {
    const guardado = cargarHistorialGuardado()

    // Primera vez que corre la app en este navegador: no hay nada guardado.
    if (!guardado || guardado.length === 0) {
        const lectura = await getLecturaActual()
        const historial = generarHistorialInicial(lectura)
        guardarHistorial(historial)
        return historial
    }

    // Antes preguntábamos "¿pasaron 3.600.000 ms desde el último registro?"
    // (duración). Ahora preguntamos "¿la hora en punto de ahora es distinta
    // a la del último registro guardado?" (cruce de frontera). Como ambos
    // timestamps ya están redondeados, la resta sigue siendo en ms — pero
    // conceptualmente dejó de medir "cuánto tiempo pasó" para medir
    // "cuántas fronteras de hora se cruzaron", que es lo que de verdad
    // nos importa para decidir si el gráfico tiene que moverse.
    const ultimoRegistro = guardado[guardado.length - 1]
    const horaActual = redondearHora(new Date())
    const horasAPropagar = Math.min(
        Math.round((horaActual.getTime() - ultimoRegistro.timestamp.getTime()) / UNA_HORA_MS),
        HORAS_VENTANA // por si la pestaña estuvo cerrada varios días
    )

    // Seguimos dentro de la misma hora en punto que el último registro:
    // no hay ninguna frontera nueva que cruzar, así que no se toca nada
    // — ni un Math.random() de más solo por recargar la página.
    if (horasAPropagar <= 0) return guardado

    const lecturaFresca = await getLecturaActual()
    let historial = guardado
    let anterior = ultimoRegistro

    for (let i = 0; i < horasAPropagar; i++) {
        const esElUltimoPaso = i === horasAPropagar - 1
        anterior = {
            timestamp: new Date(anterior.timestamp.getTime() + UNA_HORA_MS),
            // El paso más reciente se ancla a la lectura real de ahora mismo;
            // los pasos "intermedios" (si estuviste offline más de 1h) son
            // caminata aleatoria pura, para no inventar lecturas reales falsas.
            temperatura: esElUltimoPaso ? lecturaFresca.temperatura : pasoAleatorio(anterior.temperatura, 'temperatura'),
            humedad: esElUltimoPaso ? lecturaFresca.humedad : pasoAleatorio(anterior.humedad, 'humedad'),
            presion: esElUltimoPaso ? lecturaFresca.presion : pasoAleatorio(anterior.presion, 'presion'),
            luminosidad: Math.max(0, esElUltimoPaso
                ? (lecturaFresca.luminosidad ?? anterior.luminosidad)
                : pasoAleatorio(anterior.luminosidad, 'luminosidad')),
        }
        historial = [...historial, anterior]
    }

    historial = historial.slice(-HORAS_VENTANA) // ventana rodante de 24h
    guardarHistorial(historial)
    return historial
}

// =============================================================
// getHistorialSemana / getHistorialAnio — Historial real (Open-Meteo)
// =============================================================
// OpenWeatherMap free tier no da historial (solo la lectura actual), así
// que para Semana y Año usamos Open-Meteo: es gratis, no pide API key,
// tiene CORS habilitado para pegarle directo desde el navegador, y sí
// guarda historial real de años.
//
// - Semana → Forecast API con `past_days=7`: son los últimos 7 días
//   reales (esta API no tiene demora, a diferencia de la de archivo).
// - Año    → Archive API (reanálisis ERA5): tiene historial de años,
//   pero tarda unos días en consolidarse, así que cortamos 6 días
//   antes de hoy para no pedir datos que todavía no están listos.
//
// Ninguna API meteorológica pública mide luminosidad en lux (no es una
// variable meteorológica estándar). Lo que sí miden es radiación solar
// (shortwave_radiation, en W/m²), y la convertimos a lux con el mismo
// factor (LUX_POR_WATT) definido arriba junto a getLuminosidadActual.

const CLAVE_SEMANA = 'estacion_historial_semana'
const CLAVE_ANIO = 'estacion_historial_anio'
const VIGENCIA_SEMANA_MS = 3 * UNA_HORA_MS
const VIGENCIA_ANIO_MS = 24 * UNA_HORA_MS

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const promedio = (lista) => {
    const validos = lista.filter(v => typeof v === 'number' && !Number.isNaN(v))
    if (!validos.length) return null
    return validos.reduce((a, b) => a + b, 0) / validos.length
}

const redondear1 = (n) => (n === null ? null : parseFloat(n.toFixed(1)))

// Agrupa el bloque `hourly` que devuelve Open-Meteo (arrays paralelos
// time[], temperature_2m[], etc.) en "cubetas" según obtenerClave(fecha),
// y promedia cada variable dentro de cada cubeta. Se usa tanto para
// agrupar por día (semana) como por mes (año) — mismo mecanismo.
function agruparYPromediar(hourly, obtenerClave) {
    const cubetas = new Map()
    hourly.time.forEach((iso, i) => {
        // Open-Meteo con timezone=auto devuelve hora local sin sufijo de
        // huso horario, así que new Date() la interpreta como hora local
        // del navegador — correcto acá porque el usuario también está en
        // Córdoba.
        const fecha = new Date(iso)
        const clave = obtenerClave(fecha)
        if (!cubetas.has(clave)) {
            cubetas.set(clave, { fecha, temperatura: [], humedad: [], presion: [], radiacion: [] })
        }
        const c = cubetas.get(clave)
        c.temperatura.push(hourly.temperature_2m[i])
        c.humedad.push(hourly.relative_humidity_2m[i])
        c.presion.push(hourly.surface_pressure[i])
        c.radiacion.push(hourly.shortwave_radiation[i])
    })

    return Array.from(cubetas.values()).map(c => ({
        timestamp: c.fecha,
        temperatura: redondear1(promedio(c.temperatura)),
        humedad: redondear1(promedio(c.humedad)),
        presion: redondear1(promedio(c.presion)),
        luminosidad: Math.round(Math.max(0, (promedio(c.radiacion) ?? 0) * LUX_POR_WATT)),
    }))
}

function cargarCache(clave, vigenciaMs) {
    try {
        const crudo = localStorage.getItem(clave)
        if (!crudo) return null
        const { guardadoEn, datos } = JSON.parse(crudo)
        if (Date.now() - guardadoEn > vigenciaMs) return null
        return datos.map(d => ({ ...d, timestamp: new Date(d.timestamp) }))
    } catch {
        return null
    }
}

function guardarCache(clave, datos) {
    try {
        localStorage.setItem(clave, JSON.stringify({ guardadoEn: Date.now(), datos }))
    } catch {
        // localStorage lleno/deshabilitado — no rompe la app, solo no cachea
    }
}

// ── Últimos 7 días reales, un punto por día ──────────────────────────
export async function getHistorialSemana() {
    const cache = cargarCache(CLAVE_SEMANA, VIGENCIA_SEMANA_MS)
    if (cache) return cache

    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&hourly=temperature_2m,relative_humidity_2m,surface_pressure,shortwave_radiation` +
        `&past_days=7&forecast_days=0&timezone=auto`

    const res = await fetch(url)
    if (!res.ok) throw new Error('No se pudo obtener el historial semanal')
    const json = await res.json()

    const clavePorDia = (fecha) => `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`

    const porDia = agruparYPromediar(json.hourly, clavePorDia)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-7)

    guardarCache(CLAVE_SEMANA, porDia)
    return porDia
}

// ── Últimos 12 meses reales, un punto por mes ────────────────────────
export async function getHistorialAnio() {
    const cache = cargarCache(CLAVE_ANIO, VIGENCIA_ANIO_MS)
    if (cache) return cache

    const hoy = new Date()
    const fin = new Date(hoy)
    fin.setDate(fin.getDate() - 6) // margen de consolidación del archivo ERA5
    const inicio = new Date(fin)
    inicio.setFullYear(inicio.getFullYear() - 1)
    inicio.setDate(inicio.getDate() + 1)

    const fmt = (d) => d.toISOString().slice(0, 10)

    const url =
        `https://archive-api.open-meteo.com/v1/archive` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&start_date=${fmt(inicio)}&end_date=${fmt(fin)}` +
        `&hourly=temperature_2m,relative_humidity_2m,surface_pressure,shortwave_radiation` +
        `&timezone=auto`

    const res = await fetch(url)
    if (!res.ok) throw new Error('No se pudo obtener el historial anual')
    const json = await res.json()

    const claveMes = (fecha) => `${fecha.getFullYear()}-${fecha.getMonth()}`

    const porMes = agruparYPromediar(json.hourly, claveMes)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(d => ({ ...d, label: MESES_ES[d.timestamp.getMonth()] }))

    guardarCache(CLAVE_ANIO, porMes)
    return porMes
}