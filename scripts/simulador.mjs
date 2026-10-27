import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})
const db = getFirestore(app)

console.log('Email:', JSON.stringify(process.env.SENSOR_EMAIL), '| largo de la contraseña:', process.env.SENSOR_PASSWORD?.length)
// Iniciar sesión como el usuario "sensor"
await signInWithEmailAndPassword(
  getAuth(app),
  process.env.SENSOR_EMAIL,
  process.env.SENSOR_PASSWORD
)
console.log('Sesión iniciada como sensor')

// Estado actual: las lecturas cambian de a poco, como en la realidad
const estado = { temperatura: 24, humedad: 58, presion: 1013, luminosidad: 450 }

const mover = (valor, paso, min, max) => {
  const nuevo = valor + (Math.random() - 0.5) * paso * 2
  return Math.min(max, Math.max(min, nuevo))
}

async function enviarLectura() {
  estado.temperatura = mover(estado.temperatura, 0.8, 5, 42)
  estado.humedad = mover(estado.humedad, 2, 20, 95)
  estado.presion = mover(estado.presion, 0.6, 990, 1035)
  estado.luminosidad = mover(estado.luminosidad, 60, 0, 1200)

  await addDoc(collection(db, 'lecturas'), {
    temperatura: Number(estado.temperatura.toFixed(1)),
    humedad: Number(estado.humedad.toFixed(1)),
    presion: Number(estado.presion.toFixed(1)),
    luminosidad: Math.round(estado.luminosidad),
    timestamp: Timestamp.now(),
  })
  console.log('Lectura enviada', new Date().toLocaleTimeString())
}

// Intervalo en minutos: por defecto 5, o el número que pases al ejecutar
const minutos = Number(process.argv[2]) || 5

await enviarLectura()
setInterval(enviarLectura, minutos * 60 * 1000)
console.log(`Enviando una lectura cada ${minutos} min. Ctrl + C para frenar.`)