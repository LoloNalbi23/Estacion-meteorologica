// firebaseService.js — Lecturas desde Firebase (Firestore) para el dashboard.
//
// Contrato: temperatura (°C), humedad (%), velocidad_viento (km/h),
// co_concentracion (ppm), presion (hPa opcional), timestamp (Date).
//
// IMPORTANTE: este archivo corre en el NAVEGADOR (Vite). No usar
// process.exit(), console.table ni nada de Node. Las funciones DEVUELVEN
// datos; mostrarlos es trabajo de las páginas.

import {
  collection, query, orderBy, limit, where,
  getDocs, onSnapshot, Timestamp,
  getAggregateFromServer, average, count,
} from 'firebase/firestore'
import { db } from '../firebase'

const UNA_HORA_MS = 60 * 60 * 1000

// Topes para cuidar la cuota gratuita: cada documento devuelto cuenta como
// una lectura. 300 alcanza para 24 h con una lectura cada 5 minutos (288).
// Si el sensor guarda más seguido, subí MAX_HISTORIAL (o guardá menos lecturas).
const MAX_DOCS = 500
const MAX_HISTORIAL = 300

const CAMPOS_MEDICION = [
  'temperatura', 'humedad', 'velocidad_viento', 'co_concentracion', 'presion',
]

// Documento de Firestore → objeto normal de JavaScript. Los campos que no
// llegaron se normalizan a null para que tarjetas, tablas y gráficos los traten
// igual que una lectura explícitamente nula. El timestamp pasa a ser Date.
const convertir = (docSnap) => {
  const d = docSnap.data()
  return {
    id: docSnap.id,
    ...d,
    ...Object.fromEntries(CAMPOS_MEDICION.map((campo) => [campo, d[campo] ?? null])),
    timestamp: d.timestamp?.toDate?.() ?? null,
  }
}

// Las N lecturas más recientes (la más nueva primero).
export async function getUltimasLecturas(n = 10) {
  const cantidad = Math.min(Math.max(1, Math.floor(Number(n)) || 10), MAX_DOCS)
  const q = query(
    collection(db, 'lecturas'),
    orderBy('timestamp', 'desc'),
    limit(cantidad)
  )
  const snap = await getDocs(q)
  return snap.docs.map(convertir)
}

// La última lectura guardada, o null si todavía no hay ninguna.
export async function getLecturaActual() {
  const [ultima] = await getUltimasLecturas(1)
  return ultima ?? null
}

// Escucha en TIEMPO REAL la última lectura: llama a callback(lectura) al
// empezar y cada vez que el sensor guarda una nueva.
// Si todavía no hay ninguna lectura guardada, llama a callback(null), para
// que la página pueda avisarlo en vez de quedarse cargando para siempre.
// Devuelve una función para dejar de escuchar (usarla al desmontar el
// componente, en el return del useEffect).
export function escucharLecturaActual(callback, onError) {
  const q = query(
    collection(db, 'lecturas'),
    orderBy('timestamp', 'desc'),
    limit(1)
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.empty ? null : convertir(snap.docs[0]))
    },
    (error) => {
      console.error('Error escuchando la lectura actual:', error)
      if (onError) onError(error)
    }
  )
}

// Lecturas de las últimas 24 horas, ordenadas de la más vieja a la más nueva
// (el orden que necesitan los gráficos).
// Se piden las más recientes y se dan vuelta: así, si hay más lecturas que
// MAX_HISTORIAL, se pierden las más viejas y nunca las nuevas.
export async function getHistorial24h() {
  const desde = Timestamp.fromMillis(Date.now() - 24 * UNA_HORA_MS)
  const q = query(
    collection(db, 'lecturas'),
    where('timestamp', '>=', desde),
    orderBy('timestamp', 'desc'),
    limit(MAX_HISTORIAL)
  )
  const snap = await getDocs(q)
  return snap.docs.map(convertir).reverse()
}

// Escucha el historial acotado a las últimas 24 h. El límite evita escuchar
// toda la colección y mantiene el mismo máximo que la consulta de historial.
// Devuelve una función para desuscribirse al desmontar la pantalla.
export function escucharHistorial24h(callback, onError) {
  const desde = Timestamp.fromMillis(Date.now() - 24 * UNA_HORA_MS)
  const q = query(
    collection(db, 'lecturas'),
    where('timestamp', '>=', desde),
    orderBy('timestamp', 'desc'),
    limit(MAX_HISTORIAL)
  )

  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(convertir).reverse()),
    (error) => {
      console.error('Error escuchando el historial de lecturas:', error)
      if (onError) onError(error)
    }
  )
}

// ── Promedios por período (semana y año) ──────────────────────────
//
// Se calculan EN EL SERVIDOR de Firestore con consultas de agregación:
// no se descargan las lecturas, solo llega el promedio. Eso cuesta muy pocas
// lecturas de la cuota gratuita (Firestore cobra 1 lectura por cada 1.000
// registros revisados).
//
// Cada variable se promedia de forma independiente con las lecturas que
// tienen un valor numérico para ese campo. Si falta una variable, su promedio
// queda null y el gráfico muestra un hueco; eso no descarta las demás. Un
// día o mes se omite solo si no tiene documentos.
//
// La primera vez, Firestore puede pedir crear un ÍNDICE COMPUESTO: el error
// que aparece en la consola del navegador (F12) trae un link. Hay que
// tocarlo, crear el índice, esperar unos minutos y recargar.

const redondear = (n, decimales) => Number(n.toFixed(decimales))

// Promedio independiente por variable entre 'inicio' (incluido) y 'fin'
// (excluido). Devuelve null solo si no hay documentos en el rango.
async function promediarRango(inicio, fin) {
  const q = query(
    collection(db, 'lecturas'),
    where('timestamp', '>=', Timestamp.fromDate(inicio)),
    where('timestamp', '<', Timestamp.fromDate(fin))
  )
  const snap = await getAggregateFromServer(q, {
    muestras: count(),
    temperatura: average('temperatura'),
    humedad: average('humedad'),
    velocidad_viento: average('velocidad_viento'),
    co_concentracion: average('co_concentracion'),
    presion: average('presion'),
  })
  const d = snap.data()
  if (!d.muestras) return null

  const promedioDe = (valor, decimales = 1) =>
    valor == null ? null : redondear(valor, decimales)

  const promedio = {
    muestras: d.muestras,
    temperatura: promedioDe(d.temperatura),
    humedad: promedioDe(d.humedad),
    velocidad_viento: promedioDe(d.velocidad_viento),
    co_concentracion: promedioDe(d.co_concentracion),
  }
  if (d.presion != null) promedio.presion = promedioDe(d.presion)
  return promedio
}

// Un punto por día de los últimos 7 días (hoy incluido), del más viejo al
// más nuevo. Los días sin lecturas no aparecen.
// Cada punto contiene el contrato de medición y `muestras`; `presion` puede faltar.
export async function getHistorialSemana() {
  const hoy = new Date()
  const rangos = []
  for (let i = 6; i >= 0; i--) {
    rangos.push({
      inicio: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i),
      fin: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i + 1),
    })
  }
  const resultados = await Promise.all(
    rangos.map((r) => promediarRango(r.inicio, r.fin))
  )
  return resultados
    .map((res, i) => (res ? { timestamp: rangos[i].inicio, ...res } : null))
    .filter(Boolean)
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Un punto por mes de los últimos 12 meses (el actual incluido), del más
// viejo al más nuevo. Los meses sin lecturas no aparecen; `presion` es opcional.
export async function getHistorialAnio() {
  const hoy = new Date()
  const rangos = []
  for (let i = 11; i >= 0; i--) {
    rangos.push({
      inicio: new Date(hoy.getFullYear(), hoy.getMonth() - i, 1),
      fin: new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1),
    })
  }
  const resultados = await Promise.all(
    rangos.map((r) => promediarRango(r.inicio, r.fin))
  )
  return resultados
    .map((res, i) =>
      res
        ? {
            timestamp: rangos[i].inicio,
            label: MESES[rangos[i].inicio.getMonth()],
            ...res,
          }
        : null
    )
    .filter(Boolean)
}

// Umbrales configurados, como objeto { temperatura: { min, max }, ... }
// (el ID de cada documento es el nombre de la variable).
// Los documentos de 'umbrales' NO tienen timestamp, por eso no se usa
// orderBy ni convertir() acá.
export async function getUmbrales() {
  const snap = await getDocs(collection(db, 'umbrales'))
  const umbrales = {}
  snap.forEach((d) => {
    umbrales[d.id] = d.data()
  })
  return umbrales
}

// Las N alertas más recientes (la más nueva primero).
// OJO: hoy las reglas de Firestore no permiten leer 'alertas' y nada las
// crea todavía. Para que esta función ande hay que agregar la regla de
// lectura y generar las alertas (por ejemplo, desde la ruta Flask).
export async function getAlertas(n = 20) {
  const cantidad = Math.min(Math.max(1, Math.floor(Number(n)) || 20), MAX_DOCS)
  const q = query(
    collection(db, 'alertas'),
    orderBy('timestamp', 'desc'),
    limit(cantidad)
  )
  const snap = await getDocs(q)
  return snap.docs.map(convertir)
}
