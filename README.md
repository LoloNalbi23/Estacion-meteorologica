# 🌦️ Estación Meteorológica

Dashboard web para monitorear temperatura, humedad, presión y luminosidad, con historial, alertas por umbrales y una página que explica la arquitectura del proyecto.

> **Estado:** en desarrollo. Hoy el frontend consume APIs meteorológicas públicas; el backend (Flask) y la base de datos están en el roadmap.

## ✨ Funcionalidades

- **Dashboard:** lectura actual de temperatura, humedad, presión y luminosidad.
- **Historial:** gráficos por día (24 h), semana (7 días) y año (12 meses) con Chart.js.
- **Alertas:** avisos cuando una variable supera los umbrales configurados.
- **Proyecto:** explicación de la arquitectura ESP32 → Flask → React.

## 🧰 Tecnologías

- [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Chart.js](https://www.chartjs.org/) con `react-chartjs-2`
- Planificado: Flask (Python) + MariaDB + ESP32

## 📡 Origen de los datos

| Dato | Fuente |
|---|---|
| Temperatura, humedad y presión actuales | [OpenWeatherMap](https://openweathermap.org/api) |
| Luminosidad actual | [Open-Meteo](https://open-meteo.com/) (radiación solar convertida a lux, aproximada) |
| Historial de 7 días | Open-Meteo Forecast API (`past_days=7`) |
| Historial de 12 meses | Open-Meteo Archive API (ERA5) |
| Historial de 24 h | Simulado (caminata aleatoria guardada en `localStorage`) |
| Umbrales de alerta | Definidos en `src/data/mockData.js` |

> ⚠️ La luminosidad en lux es una **estimación** a partir de radiación solar (`W/m² × 120`), no una medición de un sensor.

## 🚀 Instalación y uso

### Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- Una API key gratuita de [OpenWeatherMap](https://openweathermap.org/api)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/LoloNalbi23/Estacion-meteorologica.git
cd Estacion-meteorologica

# 2. Instalar dependencias
npm install

# 3. Configurar la API key
cp .env.example .env
# editar .env y pegar tu key

# 4. Iniciar en modo desarrollo
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173).

### Variables de entorno

Crear un archivo `.env` en la raíz (no se sube a Git):

```env
VITE_OWM_KEY=tu_api_key_de_openweathermap
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualiza el build |

## 📁 Estructura

```
Estacion-meteorologica/
├── src/
│   ├── components/   # Navbar
│   ├── data/         # Apiweather.js (APIs) y mockData.js (umbrales y datos de prueba)
│   ├── pages/        # Dashboard, History, Alertas, Proyecto
│   ├── App.jsx
│   └── main.jsx
├── routes/           # Rutas del futuro backend Flask (aún vacías)
├── index.html
├── vite.config.js
└── package.json
```

## 🗺️ Roadmap

- [ ] Backend Flask con endpoints `/api/actual` y `/api/historial`
- [ ] Base de datos MariaDB con tablas `umbrales`, `lecturas` y `alertas`
- [ ] Integración del ESP32 con sensores reales
- [ ] Reemplazar el historial de 24 h simulado por datos reales
- [ ] Mover la API key al backend

## 📄 Licencia

Distribuido bajo licencia [MIT](LICENSE).