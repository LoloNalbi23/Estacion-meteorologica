// EstacionContext.jsx — Última lectura de la estación, compartida.
//
// Una sola escucha en tiempo real a Firestore para toda la app: la usan el
// Navbar (estado de la estación), Alertas y el tema "Cielo en vivo" (que
// toma su color de la temperatura). Así no se abre un listener por pantalla.
//
// lectura: undefined = cargando, null = no hay lecturas, objeto = la última
// error:   el error de Firestore si la escucha falló, o null

import { createContext, useContext, useEffect, useState } from 'react'
import { escucharLecturaActual } from '../data/firebaseService'

const EstacionContext = createContext({ lectura: undefined, error: null })

export function EstacionProvider({ children }) {
  const [lectura, setLectura] = useState(undefined)
  const [error, setError] = useState(null)

  useEffect(() => {
    const dejarDeEscuchar = escucharLecturaActual(
      (l) => {
        setError(null)
        setLectura(l)
      },
      (e) => setError(e)
    )
    return () => dejarDeEscuchar()
  }, [])

  return (
    <EstacionContext.Provider value={{ lectura, error }}>
      {children}
    </EstacionContext.Provider>
  )
}

export const useEstacion = () => useContext(EstacionContext)
