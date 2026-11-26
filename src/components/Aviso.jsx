// Aviso.jsx — Cartel de estado compartido (cargando / aviso / error).
// tipo: 'info' (por defecto) | 'aviso' | 'error'. Estilos en index.css.

export default function Aviso({ tipo = 'info', children }) {
  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
