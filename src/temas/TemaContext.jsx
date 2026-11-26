// TemaContext.jsx — Estética activa de la app.
//
// Aplica el tema en <html data-tema="...">, actualiza el tono del tema
// Cielo con la temperatura de la última lectura y entrega a los gráficos
// los colores ya resueltos (Chart.js no puede leer variables CSS).

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { useEstacion } from '../contexto/EstacionContext'
import { guardarTema, guardarTono, leerColoresGrafico, leerTemaGuardado, leerTonoGuardado, tonoCielo } from './temas'

const TemaContext = createContext(null)

export function TemaProvider({ children }) {
  const { lectura } = useEstacion()
  const [tema, setTemaActual] = useState(leerTemaGuardado)
  const [coloresGrafico, setColoresGrafico] = useState(() => leerColoresGrafico())
  const [fuentesCargadas, setFuentesCargadas] = useState(false)

  // Mientras carga la primera lectura se usa el último tono conocido.
  const [tonoInicial] = useState(leerTonoGuardado)
  const tono = lectura === undefined ? tonoInicial : tonoCielo(lectura?.temperatura)

  // Antes de pintar: aplicar tema y tono, y releer los colores resueltos.
  useLayoutEffect(() => {
    const raiz = document.documentElement
    raiz.dataset.tema = tema
    raiz.style.setProperty('--cielo-h', String(tono))
    setColoresGrafico(leerColoresGrafico(raiz))
  }, [tema, tono, fuentesCargadas])

  useEffect(() => {
    if (lectura !== undefined) guardarTono(tono)
  }, [lectura, tono])

  // Los gráficos se dibujan con la fuente disponible en ese momento; cuando
  // terminan de cargar las fuentes del tema, se vuelven a dibujar.
  useEffect(() => {
    let activo = true
    document.fonts?.ready.then(() => {
      if (activo) setFuentesCargadas(true)
    })
    return () => {
      activo = false
    }
  }, [])

  const setTema = useCallback((id) => {
    setTemaActual(id)
    guardarTema(id)
  }, [])

  return (
    <TemaContext.Provider value={{ tema, setTema, coloresGrafico }}>
      {children}
    </TemaContext.Provider>
  )
}

export const useTema = () => useContext(TemaContext)
