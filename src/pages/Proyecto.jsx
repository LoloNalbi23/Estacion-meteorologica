// =============================================================
// Proyecto.jsx — Ruta "/proyecto"
// Explica la arquitectura del sistema con tarjetas de flujo vertical
// y una sección de Entradas / Procesos / Salidas al final
// =============================================================

import './Proyecto.css'

// ── Datos de los pasos del flujo (se renderizan como tarjetas) ────
// Cada paso representa una capa del recorrido: sensores → ESP32 → Firebase → web
const PASOS = [
  {
    num: 1,
    iconClass: 'icon-sensor',
    titleClass: 'title-sensor',
    icono: '📡',
    titulo: 'Sensores',
    desc: 'Miden temperatura y humedad relativa (DHT22), viento (anemómetro) y CO (MQ-7); la presión (BME280) es opcional',
  },
  {
    num: 2,
    iconClass: 'icon-esp32',
    titleClass: 'title-esp32',
    icono: '🔧',
    titulo: 'ESP32',
    desc: 'Toma las mediciones cada 5 minutos y las envía por WiFi; si un sensor no responde, envía solo los valores disponibles',
  },
  {
    num: 3,
    iconClass: 'icon-flask',
    titleClass: 'title-flask',
    icono: '🖥️',
    titulo: 'Servidor receptor',
    desc: 'Recibe las lecturas del ESP32, descarta valores fuera de rango y las guarda en Firebase con la hora del servidor',
  },
  {
    num: 4,
    iconClass: 'icon-db',
    titleClass: 'title-db',
    icono: '🗄️',
    titulo: 'Firebase',
    desc: 'Firestore guarda cada lectura como parte del historial; los campos que faltan quedan sin dato',
  },
  {
    num: 5,
    iconClass: 'icon-react',
    titleClass: 'title-react',
    icono: '🌐',
    titulo: 'Página web',
    desc: 'Lee Firebase directamente: el Dashboard y las alertas se actualizan solos cuando llega una lectura, y el historial arma los promedios',
  },
  {
    num: 6,
    iconClass: 'icon-user',
    titleClass: 'title-user',
    icono: '🖥',
    titulo: 'Usuario',
    desc: 'Visualiza las mediciones disponibles, los gráficos históricos y las alertas configuradas',
  },
]

// ── Datos de la sección EPyS (Entradas / Procesos / Salidas) ─────
const ENTRADAS = [
  'Temperatura y humedad (DHT22)',
  'Anemómetro: velocidad enviada en km/h tras calibrar su salida',
  'Monóxido de carbono (MQ-7, ppm; no mide CO₂)',
  'Presión atmosférica opcional (BME280, hPa)',
]

const PROCESOS = [
  'Lectura de los sensores cada 5 minutos',
  'Calibración según el sensor instalado',
  'Envío por WiFi de los campos que tengan medición',
  'Validación de rangos en el servidor receptor',
  'Almacenamiento en Firebase Firestore',
  'Comparación con los umbrales de alerta',
  'Cálculo de promedios diarios y mensuales',
]

const SALIDAS = [
  'Datos en tiempo real',
  'Gráficos históricos',
  'Tabla de registros',
  'Alertas por umbrales',
  'Lecturas parciales cuando falta un sensor',
]

// ── Componente principal ──────────────────────────────────────────
export default function Proyecto() {
  return (
    <section>
      {/* Título y descripción general */}
      <div className="proyecto-header">
        <p className="proyecto-main-title">Arquitectura del sistema</p>
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
