// Formateadores compartidos por las pantallas. Los datos visibles salen de
// Firestore; este archivo ya no contiene muestras que puedan confundirse con
// lecturas reales ni funciones de una API futura.

export const formatHora = (date) =>
  date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

export const formatFecha = (date) =>
  date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
