# Estación Meteorológica

Aplicación para visualizar mediciones de una estación meteorológica. El ESP32 envía lecturas a Flask; Flask valida y guarda los valores recibidos en Firebase Firestore. React consulta Firestore directamente para mostrar el Dashboard, el historial y las alertas.

La aplicación no consulta APIs meteorológicas externas.

**En producción:** [estacionmeteorologica.pythonanywhere.com](https://estacionmeteorologica.pythonanywhere.com)

## Componentes

- **ESP32 y sensores:** envían cada 5 minutos las mediciones que estén disponibles.
- **API Flask:** recibe lecturas en `POST /api/lecturas`, valida sus valores y las guarda en Firestore.
- **Firebase Firestore:** almacena las lecturas con la fecha asignada por el servidor.
- **Frontend React:** escucha los últimos datos en el Dashboard y Alertas; consulta los períodos del Historial y muestra errores o estados vacíos si no puede cargar datos.
- **Simulador HTTP:** permite probar el envío a Flask sin el hardware. Sus valores son ficticios.

## Variables y contrato de lecturas

Un documento puede incluir cualquier combinación de estas mediciones. Un campo se puede omitir o enviar como `null` cuando no haya lectura. Se guarda solamente cuando trae un valor numérico válido, y cada documento debe contener al menos una medición.

| Campo | Unidad | Sensor / significado |
|---|---|---|
| `temperatura` | °C | DHT22 |
| `humedad` | % relativa | DHT22 |
| `velocidad_viento` | km/h | Anemómetro; el valor debe llegar ya convertido |
| `co_concentracion` | ppm | CO medido por MQ-7; no representa CO₂ ni un índice de calidad del aire |
| `presion` | hPa | BME280, opcional |

Ejemplo con algunas variables ausentes:

```json
{
  "temperatura": 24.3,
  "humedad": null,
  "velocidad_viento": 12.5,
  "co_concentracion": null
}
```

`timestamp` lo asigna Flask en UTC. No se deben enviar valores ficticios para reemplazar mediciones faltantes, ni el valor crudo del ADC del MQ-7 como si fueran ppm: la concentración de CO requiere calibración.

Flask aplica rangos amplios para descartar datos inválidos: temperatura `-40..85 °C`, humedad `0..100 %`, viento `0..500 km/h`, CO `0..500 ppm` y presión `300..1100 hPa`. Estos límites de validación no son los umbrales de alerta.

## Alertas configuradas

La interfaz compara las mediciones disponibles con estos límites. Si una variable no llegó, se muestra como **SIN DATO** y no se evalúa.

| Variable | Rango configurado |
|---|---:|
| Temperatura | 5–35 °C |
| Humedad relativa | 10–75 % |
| Velocidad del viento | hasta 50 km/h |
| CO (MQ-7) | 0–10 ppm |
| Presión (BME280) | 1010–1020 hPa |

La lectura de CO del MQ-7 no sustituye una alarma certificada de monóxido de carbono.

## Rutas Flask

| Método y ruta | Función |
|---|---|
| `GET /api/estado` | Comprueba que Flask esté activo |
| `POST /api/lecturas` | Valida una lectura y la guarda en Firestore; requiere `X-API-Key` |

No hay rutas GET de lecturas: el frontend usa el SDK de Firebase para leer Firestore directamente. El simulador también solo envía por POST, por eso no hace falta añadir rutas GET para lectura actual o historial.

## Configuración y ejecución

### Requisitos

- Node.js 18 o superior para la aplicación; el simulador usa `--env-file` y requiere Node.js 20.6 o superior.
- Python y las dependencias de `requirements.txt` para Flask.
- Un proyecto Firebase con Firestore y una clave de cuenta de servicio para Flask.

### Frontend

```bash
npm install
cp .env.example .env
```

Completar en `.env` las variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` y `VITE_FIREBASE_APP_ID`. Luego iniciar:

```bash
npm run dev
```

Para generar los archivos que Flask sirve en producción:

```bash
npm run build
```

### Flask

Instalar las dependencias Python y completar en `.env`:

- `FIREBASE_CREDENTIALS`: ruta a la clave JSON de Firebase Admin.
- `API_KEY_SENSOR`: clave que debe enviar el ESP32 o el simulador en el encabezado `X-API-Key`.

Iniciar Flask desde la carpeta del proyecto:

```bash
python app.py
```

El servidor local escucha en el puerto `5000`. Para recibir datos desde fuera de la computadora, Flask debe estar desplegado en una URL accesible por el ESP32.

Flask rechaza con `401` las lecturas sin la clave correcta, con `400` las que traen valores inválidos o fuera de rango y con `413` los cuerpos de más de 4 KB.

### Tests

Los tests de `POST /api/lecturas` no necesitan Firebase: reemplazan la base por una en memoria.

```bash
pip install -r requirements-dev.txt
pytest
```

### Actualizar el sitio publicado

El sitio corre en PythonAnywhere y sirve los archivos de `dist/` que están en el repositorio. Después de subir cambios a `main` (con `dist/` regenerada con `npm run build`):

1. Abrir una consola Bash en PythonAnywhere y, en la carpeta del proyecto, ejecutar `git pull`.
2. En la pestaña **Web**, tocar **Reload**.
3. Comprobar que [`/api/estado`](https://estacionmeteorologica.pythonanywhere.com/api/estado) responda `{"estado": "ok"}`.

### Simulador

Configurar en `.env` la URL completa del endpoint, por ejemplo `API_URL=https://tu-servidor/api/lecturas`, y el mismo `API_KEY_SENSOR` que valida Flask. Ejecutar:

```bash
npm run simulador       # envía inmediatamente y luego cada 5 minutos
npm run simulador -- 1  # cada 1 minuto
```

Por defecto omite presión. Para incluir una presión ficticia, configurar `SIMULAR_PRESION=true`. Los datos del simulador no son mediciones de los sensores reales. Flask los guarda en el mismo Firebase que usa la estación (aunque el servidor sea local), así que se ven en la web mezclados con las lecturas reales; el simulador lo advierte al arrancar.

### Datos aleatorios directamente en Firestore

`scripts/datos_random.py` llena la base con un historial ficticio de una sola vez, escribiendo en Firestore con la clave de administrador (no pasa por Flask). Sirve para probar el Dashboard con datos y para que el Historial de 24 h, 7 días y 12 meses tenga puntos.

```bash
python scripts/datos_random.py                      # 288 lecturas en las últimas 24 h
python scripts/datos_random.py -n 1000 -d 7         # 1000 lecturas en 7 días
python scripts/datos_random.py -n 300 -d 365        # repartidas en el último año
python scripts/datos_random.py --sin-presion        # sin el campo presion
python scripts/datos_random.py --semilla 42         # misma corrida, mismos valores
```

Genera valores plausibles con un ciclo diario de temperatura y humedad, ráfagas de viento y picos ocasionales de CO. **No son mediciones reales** y no reemplazan al simulador cuando se quiere probar el POST a Flask.

### Índices de Firestore (opcional pero recomendado)

El Historial de semana/año promedia con consultas de agregación. Firestore exige **índices compuestos** para eso; están definidos en `firestore.indexes.json`. Si faltan, la app lo detecta y calcula los promedios en el navegador, así que el Historial funciona igual, pero gasta más lecturas de la cuota gratuita.

Para crearlos con Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

También se pueden crear desde el link que Firestore muestra en la consola del navegador (F12) al faltar un índice. La creación tarda unos minutos.

## Estéticas

El selector **Estética** del encabezado cambia el aspecto de toda la aplicación y se recuerda en el navegador:

| Estética | Idea |
|---|---|
| Original | Panel oscuro tipo sala de control |
| Papel | Papel de registro de un termohigrógrafo: cuadrícula, tinta violeta para temperatura y roja para humedad |
| Cielo | El color de la página sigue a la temperatura medida (azul con frío, ámbar y coral con calor) y la lectura principal aparece en grande |

Los colores y fuentes de cada estética están en `src/temas/temas.css`. Para agregar una nueva, sumar un bloque `[data-tema="..."]` con las mismas variables y registrarla en `TEMAS` (`src/temas/temas.js`).

## Estructura principal

```text
src/                 Frontend React y consultas a Firestore
src/temas/           Estéticas (variables CSS) y selector de tema
src/contexto/        Última lectura compartida en tiempo real
routes/lecturas.py   Recepción y validación Flask de lecturas
app.py               Inicialización de Firebase y servidor Flask
scripts/simulador.mjs Simulador de POST HTTP
scripts/datos_random.py Carga de lecturas ficticias en Firestore
firmware/             Base de firmware ESP32
requirements.txt      Dependencias Python
tests/                Tests de la recepción de lecturas (pytest)
firestore.indexes.json Índices compuestos para los promedios del Historial
```

## Pendiente de hardware

- Completar y probar el firmware con el modelo real de ESP32 y el cableado elegido.
- Definir la calibración del anemómetro para convertir sus pulsos a km/h.
- Definir el circuito de calefacción y calibración del MQ-7 para estimar CO en ppm.
- Incorporar el BME280 si se decide medir presión.

## Licencia

Distribuido bajo licencia [MIT](LICENSE).
