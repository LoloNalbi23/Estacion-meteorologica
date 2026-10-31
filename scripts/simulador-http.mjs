// simulador-http.mjs — Simula el ESP32: manda una lectura por POST a la ruta
// de Flask (/api/lecturas), igual que lo hará el sensor real.
//
// Uso:  npm run simulador-http -- 1     (una lectura por minuto)
//       npm run simulador-http          (una lectura cada 5 minutos)
//
// Variables del .env que usa:
//   API_URL=https://misaelzanetti.pythonanywhere.com/api/lecturas
//   API_KEY_SENSOR=la_misma_clave_que_tiene_el_servidor

const URL = process.env.API_URL
const API_KEY = process.env.API_KEY_SENSOR

if (!URL || !API_KEY) {
  console.error('Faltan variables en el .env: API_URL y/o API_KEY_SENSOR')
  process.exit(1)
}

// Estado actual: los valores cambian de a poco, como en la realidad
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

  const hora = new Date().toLocaleTimeString()

  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        temperatura: Number(estado.temperatura.toFixed(1)),
        humedad: Number(estado.humedad.toFixed(1)),
        presion: Number(estado.presion.toFixed(1)),
        luminosidad: Math.round(estado.luminosidad),
      }),
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
