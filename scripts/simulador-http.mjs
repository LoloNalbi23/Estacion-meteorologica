// simulador-http.mjs — Simula el ESP32: manda una lectura por POST a la ruta
// de Flask (/api/lecturas), igual que lo hará el sensor real.
//
// Uso:  npm run simulador-http -- 1     (una lectura por minuto)
//       npm run simulador-http          (una lectura cada 5 minutos)
//
// Variables del .env que usa:
//   API_URL=https://misaelzanetti.pythonanywhere.com/api/lecturas
//   API_KEY_SENSOR=la_misma_clave_que_tiene_el_servidor
//   SIMULAR_PRESION=true  (opcional: agrega presión ficticia del BME280)

const URL = process.env.API_URL
const API_KEY = process.env.API_KEY_SENSOR
const incluirPresion = process.env.SIMULAR_PRESION === 'true'

if (!URL || !API_KEY) {
  console.error('Faltan variables en el .env: API_URL y/o API_KEY_SENSOR')
  process.exit(1)
}

// Valores ficticios para probar el contrato; no son mediciones del MQ-7.
const estado = {
  temperatura: 24,
  humedad: 58,
  velocidad_viento: 12,
  co_concentracion: 18,
  ...(incluirPresion ? { presion: 1013 } : {}),
}

const mover = (valor, paso, min, max) => {
  const nuevo = valor + (Math.random() - 0.5) * paso * 2
  return Math.min(max, Math.max(min, nuevo))
}

async function enviarLectura() {
  estado.temperatura = mover(estado.temperatura, 0.8, 5, 42)
  estado.humedad = mover(estado.humedad, 2, 20, 95)
  estado.velocidad_viento = mover(estado.velocidad_viento, 4, 0, 120)
  estado.co_concentracion = mover(estado.co_concentracion, 3, 0, 500)
  if (incluirPresion) estado.presion = mover(estado.presion, 0.6, 990, 1035)

  const hora = new Date().toLocaleTimeString()

  try {
    const lectura = {
      temperatura: Number(estado.temperatura.toFixed(1)),
      humedad: Number(estado.humedad.toFixed(1)),
      velocidad_viento: Number(estado.velocidad_viento.toFixed(1)),
      co_concentracion: Number(estado.co_concentracion.toFixed(1)),
    }
    if (incluirPresion) lectura.presion = Number(estado.presion.toFixed(1))

    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(lectura),
    })

    if (res.status === 201) {
      console.log(`Lectura guardada (201) a las ${hora}`)
    } else {
      // Si el servidor rechaza la lectura, muestra por qué
      console.error(`Error ${res.status} a las ${hora}:`, await res.text())
    }
  } catch (e) {
    console.error(`No se pudo conectar con el servidor (${hora}):`, e.message)
  }
}

const minutos = Number(process.argv[2]) || 5

await enviarLectura()
setInterval(enviarLectura, minutos * 60 * 1000)
console.log(`Enviando una lectura cada ${minutos} min a ${URL}. Ctrl + C para frenar.`)
