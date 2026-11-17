# 🌦️ Estación Meteorológica

Dashboard web para monitorear temperatura, humedad relativa, velocidad del viento y concentración de monóxido de carbono, con historial y alertas por umbrales. La presión atmosférica del BME280 es opcional.

> **Estado:** en desarrollo. El ESP32/simulador envía lecturas a Flask; Flask las valida y guarda en Firestore. El frontend consulta Firestore.

## ✨ Funcionalidades

- **Dashboard:** lectura actual de temperatura, humedad, viento y CO; presión opcional.
- **Historial:** gráficos por día (24 h), semana (7 días) y año (12 meses) con Chart.js.
- **Alertas:** avisos cuando una variable supera los umbrales configurados.
- **Proyecto:** explicación de la arquitectura ESP32 → Flask → React.

## 🧰 Tecnologías

- [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Chart.js](https://www.chartjs.org/) con `react-chartjs-2`
- Flask (Python) + Firebase/Firestore + ESP32

## 📡 Contrato de lecturas

`POST /api/lecturas` recibe estos campos obligatorios:

| Campo | Unidad | Sensor / significado |
|---|---|---|
| `temperatura` | °C | DHT22 |
| `humedad` | % relativa | DHT22 |
| `velocidad_viento` | km/h | Anemómetro; el ESP32 envía la velocidad ya convertida |
| `co_concentracion` | ppm | CO medido por MQ-7; no representa CO₂ ni un índice general de calidad del aire |

`presion` (hPa) es opcional y se usa cuando se incorpora el BME280. Flask asigna `timestamp` en UTC al recibir cada lectura. Los límites de viento son una validación amplia de plausibilidad; deben ajustarse cuando se conozcan el anemómetro y su calibración. La lectura de CO todavía no tiene un umbral de alerta configurado. El simulador omite presión por defecto; para simular también el BME280, usar `SIMULAR_PRESION=true` en `.env`.

Ejemplo del cuerpo enviado por el ESP32 (se puede omitir `presion`):

```json
{
  "temperatura": 24.3,
  "humedad": 58.2,
  "velocidad_viento": 12.5,
  "co_concentracion": 18.0,
  "presion": 1013.2
}
```

`co_concentracion` debe ser una estimación calibrada en ppm; no se debe enviar directamente el valor crudo del ADC del MQ-7 con esa unidad.

## 🚀 Instalación y uso

### Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- Credenciales de Firebase para el frontend y Flask

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/LoloNalbi23/Estacion-meteorologica.git
cd Estacion-meteorologica

# 2. Instalar dependencias
npm install

# 3. Configurar las variables de entorno de Firebase y Flask
cp .env.example .env
# completar las variables necesarias; FIREBASE_CREDENTIALS apunta a la clave Admin

# 4. Iniciar en modo desarrollo
npm run dev
```

Abrir la URL local que indique Vite (normalmente `http://localhost:5173`).

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualiza el build |
| `npm run simulador` | Envía lecturas ficticias a `API_URL` cada 5 minutos |
| `npm run simulador-http -- 1` | Envía lecturas ficticias cada 1 minuto |

## 📁 Estructura

```
Estacion-meteorologica/
├── src/
│   ├── components/   # Navbar
│   ├── data/         # firebaseService.js (Firestore) y mockData.js (datos de prueba)
│   ├── pages/        # Dashboard, History, Alertas, Proyecto
│   ├── App.jsx
│   └── main.jsx
├── routes/           # Rutas Flask, incluida la recepción de lecturas
├── index.html
├── vite.config.js
└── package.json
```

## 🗺️ Roadmap

- [ ] Integración del ESP32 con sensores reales
- [ ] Calibrar la conversión del anemómetro a km/h
- [ ] Calibrar el MQ-7 para estimar CO en ppm y definir su umbral de alerta
- [ ] Incorporar el BME280 como fuente opcional de presión

## 📄 Licencia

Distribuido bajo licencia [MIT](LICENSE).
