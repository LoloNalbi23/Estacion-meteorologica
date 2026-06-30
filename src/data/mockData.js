// =============================================================
// mockData.js — Datos simulados que reemplazarán a la API Flask
// Cuando conectes Flask, estos arrays vendrán de fetch('/api/datos')
// =============================================================

// ── Genera una fecha/hora pasada restando `horasAtras` a ahora ──────────────
const horasAtras = (n) => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
};

// ── Valor con ruido aleatorio pequeño para simular sensor real ───────────────
const ruido = (base, amplitud) =>
  parseFloat((base + (Math.random() - 0.5) * amplitud * 2).toFixed(1));

// ── DATOS DE LAS ÚLTIMAS 12 HORAS (1 registro por hora) ─────────────────────
// Estructura: { timestamp, temperatura, humedad, presion, luminosidad }
// Flask devolverá exactamente este formato desde la BD
export const datos12h = Array.from({ length: 12 }, (_, i) => ({
  timestamp: horasAtras(11 - i),
  temperatura: ruido(24, 3),    // °C — rango normal interior ~20-28
  humedad: ruido(58, 8),        // %  — rango normal ~40-70
  presion: ruido(1013, 5),      // hPa — nivel del mar ~1010-1020
  luminosidad: ruido(450, 200), // lux — varía mucho según hora del día
}));

// ── DATOS DE LOS ÚLTIMOS 7 DÍAS (1 registro por día, promedio diario) ───────
export const datos7d = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    timestamp: d,
    temperatura: ruido(23, 4),
    humedad: ruido(60, 10),
    presion: ruido(1013, 8),
    luminosidad: ruido(400, 150),
  };
});

// ── DATOS DEL ÚLTIMO AÑO (1 registro por mes, promedio mensual) ─────────────
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export const datos12m = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (11 - i));
  return {
    timestamp: d,
    label: MESES[d.getMonth()],
    temperatura: ruido(20, 6),
    humedad: ruido(58, 12),
    presion: ruido(1013, 10),
    luminosidad: ruido(380, 180),
  };
});

// ── LECTURA ACTUAL (último registro en tiempo real) ──────────────────────────
// Flask lo expondrá en GET /api/actual
export const lecturaActual = {
  timestamp: new Date(),
  temperatura: datos12h[datos12h.length - 1].temperatura,
  humedad: datos12h[datos12h.length - 1].humedad,
  presion: datos12h[datos12h.length - 1].presion,
  luminosidad: datos12h[datos12h.length - 1].luminosidad,
};

// ── UMBRALES DE ALERTA (hardcodeados — luego podrían venir de config Flask) ──
// Si el valor supera el umbral, se genera una alerta en /alertas
export const UMBRALES = {
  temperatura: { min: 10, max: 35, unidad: '°C', label: 'Temperatura' },
  humedad:     { min: 30, max: 80, unidad: '%',  label: 'Humedad' },
  presion:     { min: 990, max: 1030, unidad: 'hPa', label: 'Presión' },
  luminosidad: { min: 0,  max: 800,  unidad: ' lux', label: 'Luminosidad' },
};

// ── Helper: formatea un Date a "HH:MM" ──────────────────────────────────────
export const formatHora = (date) =>
  date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

// ── Helper: formatea un Date a "DD/MM" ──────────────────────────────────────
export const formatFecha = (date) =>
  date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
