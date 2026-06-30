// =============================================================
// Proyecto.jsx — Ruta "/proyecto"
// Explica la arquitectura del sistema con tarjetas de flujo vertical
// y una sección de Entradas / Procesos / Salidas al final
// =============================================================

import './Proyecto.css'

// ── Datos de los pasos del flujo (se renderizan como tarjetas) ────
// Cada paso representa una capa de la arquitectura ESP32 → Flask → React
const PASOS = [
  {
    num: 1,
    iconClass: 'icon-sensor',
    titleClass: 'title-sensor',
    icono: '📡',
    titulo: 'Sensores',
    desc: 'Captura de datos del entorno: temperatura, humedad, presión, luminosidad, viento',
  },
  {
    num: 2,
    iconClass: 'icon-esp32',
    titleClass: 'title-esp32',
    icono: '🔧',
    titulo: 'ESP32',
    desc: 'Microcontrolador: lee sensores, convierte señales analógicas a digitales y envía por WiFi',
  },
  {
    num: 3,
    iconClass: 'icon-flask',
    titleClass: 'title-flask',
    icono: '🖥️',
    titulo: 'API Flask',
    desc: 'Backend Python: recibe datos vía HTTP/REST, valida y procesa lecturas antes de almacenar',
  },
  {
    num: 4,
    iconClass: 'icon-db',
    titleClass: 'title-db',
    icono: '🗄️',
    titulo: 'Base de Datos',
    desc: 'Almacenamiento persistente: guarda series temporales históricas para análisis futuro',
  },
  {
    num: 5,
    iconClass: 'icon-react',
    titleClass: 'title-react',
    icono: '🌐',
    titulo: 'Frontend React',
    desc: 'Interfaz web: consulta la API, renderiza gráficos en tiempo real y muestra alertas',
  },
  {
    num: 6,
    iconClass: 'icon-user',
    titleClass: 'title-user',
    icono: '🖥',
    titulo: 'Usuario',
    desc: 'Visualiza datos, configura alertas y toma decisiones basadas en la información meteorológica',
  },
]

// ── Datos de la sección EPyS (Entradas / Procesos / Salidas) ─────
const ENTRADAS = [
  'Sensor de temperatura (DHT22)',
  'Sensor de humedad (DHT22)',
  'Sensor de presión (BMP280)',
  'Sensor de luminosidad (BH1750)',
  'Sensor de viento (anemómetro)',
  'Sensor de lluvia',
  'Índice UV (VEML6070)',
]

const PROCESOS = [
  'Lectura periódica de sensores',
  'Conversión analógico-digital',
  'Validación de rangos',
  'Transmisión WiFi (HTTP/REST)',
  'Recepción en API Flask',
  'Almacenamiento en BD',
  'Generación de alertas',
  'Cálculo de promedios',
]

const SALIDAS = [
  'Datos en tiempo real',
  'Gráficos históricos',
  'Tabla de registros',
  'Alertas y notificaciones',
  'Reportes exportables',
  'API pública de datos',
]

// ── Componente principal ──────────────────────────────────────────
export default function Proyecto() {
  return (
    <section>
      {/* Título y descripción general */}
      <div className="proyecto-header">
        <p className="proyecto-main-title">Arquitectura del Sistema</p>
        <p className="proyecto-subtitle">
          Flujo de datos desde los sensores hasta la visualización en el navegador del usuario.
        </p>
      </div>

      {/* ── Flujo vertical de tarjetas numeradas ── */}
      <div className="flow-container">
        {PASOS.map((paso, i) => (
          // Fragment para agrupar tarjeta + flecha sin div extra
          <div key={paso.num} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Tarjeta del paso */}
            <div className="flow-card">
              {/* Ícono con fondo coloreado */}
              <div className={`flow-card-icon ${paso.iconClass}`}>
                {paso.icono}
              </div>

              {/* Título y descripción */}
              <div className="flow-card-body">
                <p className={`flow-card-title ${paso.titleClass}`}>{paso.titulo}</p>
                <p className="flow-card-desc">{paso.desc}</p>
              </div>

              {/* Número de paso */}
              <span className="flow-card-num">{paso.num}</span>
            </div>

            {/* Flecha entre pasos (no después del último) */}
            {i < PASOS.length - 1 && <div className="flow-arrow" />}
          </div>
        ))}
      </div>

      {/* ── Sección Entradas / Procesos / Salidas ── */}
      <div className="eps-grid">
        {/* Columna: Entradas */}
        <div className="eps-card">
          <p className="eps-title eps-title-entradas">Entradas</p>
          <ul className="eps-list">
            {ENTRADAS.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>

        {/* Columna: Procesos */}
        <div className="eps-card">
          <p className="eps-title eps-title-procesos">Procesos</p>
          <ul className="eps-list">
            {PROCESOS.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>

        {/* Columna: Salidas */}
        <div className="eps-card">
          <p className="eps-title eps-title-salidas">Salidas</p>
          <ul className="eps-list">
            {SALIDAS.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}
