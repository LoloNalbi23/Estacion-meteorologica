// simulador-http.mjs — Simula el ESP32: manda una lectura por POST a la ruta
// de Flask (/api/lecturas), igual que lo hará el sensor real.
//
// Uso:  npm run simulador-http -- 1     (una lectura por minuto)
//       npm run simulador-http          (una lectura cada 5 minutos)
//
// Variables del .env que usa:
//   API_URL=https://estacionmeteorologica.pythonanywhere.com/api/lecturas
//   API_KEY_SENSOR=la_misma_clave_que_tiene_el_servidor




if (!URL || !API_KEY) {
  console.error('Faltan variables en el .env: API_URL y/o API_KEY_SENSOR')
  process.exit(1)
}

const minutos = Number(process.argv[2]) || 5          // cada cuánto se ENVÍA una lectura
const segundosGet = Number(process.argv[3]) || 10     // cada cuánto se CONSULTA (GET)

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
}

// Estado actual: los valores cambian de a poco, como en la realidad
const estado = { temperatura: 24, humedad: 58, presion: 1013, luminosidad: 450 }

const mover = (valor, paso, min, max) => {
  const nuevo = valor + (Math.random() - 0.5) * paso * 2
  return Math.min(max, Math.max(min, nuevo))
}

// ---------- POST ----------
async function enviarLectura() {
  estado.temperatura = mover(estado.temperatura, 0.8, 5, 42)
  estado.humedad = mover(estado.humedad, 2, 20, 95)
  estado.presion = mover(estado.presion, 0.6, 990, 1035)
  estado.luminosidad = mover(estado.luminosidad, 60, 0, 1200)

  const hora = new Date().toLocaleTimeString()

  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        temperatura: Number(estado.temperatura.toFixed(1)),
        humedad: Number(estado.humedad.toFixed(1)),
        presion: Number(estado.presion.toFixed(1)),
        luminosidad: Math.round(estado.luminosidad),
      }),
    })

    if (res.status === 201) {
      console.log(`[POST] Lectura guardada (201) a las ${hora}`)
      await consultarUltima() // apenas se guarda, la traigo y la muestro
    } else {
      // Si el servidor rechaza la lectura, muestra por qué
      console.error(`[POST] Error ${res.status} a las ${hora}:`, await res.text())
    }
  } catch (e) {
    console.error(`[POST] No se pudo conectar con el servidor (${hora}):`, e.message)
  }
}

// ---------- GET ----------
let ultimaVista = null // para mostrar solo lecturas nuevas

async function consultarUltima() {
  const hora = new Date().toLocaleTimeString()

  try {
    const res = await fetch(URL, { method: 'GET', headers })

    if (!res.ok) {
      console.error(`[GET] Error ${res.status} a las ${hora}:`, await res.text())
      return
    }

    const data = await res.json()

    // Acepta un array directo o un objeto tipo { lecturas: [...] } / { data: [...] }
    const lista = Array.isArray(data) ? data : data.lecturas ?? data.data ?? []
    if (lista.length === 0) {
      console.log(`[GET] Todavía no hay lecturas (${hora})`)
      return
    }

    // Tomo la más reciente según timestamp (si no hay, uso la última del array)
    const ultima = lista.reduce((a, b) =>
      new Date(b.timestamp ?? 0) > new Date(a.timestamp ?? 0) ? b : a
    )

    const clave = ultima.id ?? ultima.timestamp ?? JSON.stringify(ultima)
    if (clave === ultimaVista) return // no hay nada nuevo
    ultimaVista = clave

    console.log(
      `[GET] Lectura nueva → ` +
        `temp: ${ultima.temperatura}°C | hum: ${ultima.humedad}% | ` +
        `pres: ${ultima.presion} hPa | luz: ${ultima.luminosidad} lx` +
        (ultima.timestamp ? ` | ${new Date(ultima.timestamp).toLocaleString()}` : '')
    )
  } catch (e) {
    console.error(`[GET] No se pudo conectar con el servidor (${hora}):`, e.message)
  }
}

// ---------- Arranque ----------
await enviarLectura()
setInterval(enviarLectura, minutos * 60 * 1000)
setInterval(consultarUltima, segundosGet * 1000)

console.log(
  `POST cada ${minutos} min y GET cada ${segundosGet} s a ${URL}. Ctrl + C para frenar.`
)