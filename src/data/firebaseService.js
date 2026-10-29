// firebaseService.js — Lecturas desde Firebase (Firestore) para el dashboard.
//
// Devuelve los datos con la misma forma que antes entregaba Apiweather.js:
//   { temperatura, humedad, presion, luminosidad, timestamp: Date }
// Así las páginas solo tienen que cambiar el import.
//
// IMPORTANTE: este archivo corre en el NAVEGADOR (Vite). No usar
// process.exit(), console.table ni nada de Node. Las funciones DEVUELVEN
// datos; mostrarlos es trabajo de las páginas.

import {
  collection, query, orderBy, limit, where,
  getDocs, onSnapshot, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const UNA_HORA_MS = 60 * 60 * 1000

// Topes para cuidar la cuota gratuita: cada documento devuelto cuenta como
// una lectura. 300 alcanza para 24 h con una lectura cada 5 minutos (288).
// Si el sensor guarda más seguido, subí MAX_HISTORIAL (o guardá menos lecturas).
const MAX_DOCS = 500
const MAX_HISTORIAL = 300

// Documento de Firestore → objeto normal de JavaScript.
// El timestamp de Firestore pasa a ser un Date común.
const convertir = (docSnap) => {
  const d = docSnap.data()
  return { id: docSnap.id, ...d, timestamp: d.timestamp?.toDate?.() ?? null }
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
      if (!snap.empty) callback(convertir(snap.docs[0]))
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