import { useEffect, useState } from 'react'
import supabase from './supabaseClient.js'

function Lecturas() {
  const [lecturas, setLecturas] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('lecturas')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10)

      if (error) setError(error.message)
      else setLecturas(data)
    }
    cargar()
  }, [])

  if (error) return <p>Error: {error}</p>

  return (
    <ul>
      {lecturas.map((l) => (
        <li key={l.id}>
          {new Date(l.timestamp).toLocaleString('es-AR')} — {l.temperatura} °C, {l.humedad} %
        </li>
      ))}
    </ul>
  )
}

export default Lecturas