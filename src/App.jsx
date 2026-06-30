// =============================================================
// App.jsx — Raíz de la aplicación
// Define las 4 rutas con React Router v6 y renderiza el Navbar
// =============================================================

import { Routes, Route } from 'react-router-dom'
import Navbar    from './components/Navbar'
import Dashboard from './pages/Dashboard'
import History   from './pages/History'
import Proyecto  from './pages/Proyecto'
import Alertas   from './pages/Alertas'

export default function App() {
  return (
    <div className="app-shell">
      {/* Navbar visible en todas las rutas */}
      <Navbar />

      {/* Área de contenido: cambia según la ruta activa */}
      <main className="page-content">
        <Routes>
          {/* Ruta 1: Dashboard — ruta raíz "/" */}
          <Route path="/"         element={<Dashboard />} />

          {/* Ruta 2: Histórico — gráficos + tabla */}
          <Route path="/history"  element={<History />} />

          {/* Ruta 3: Proyecto — flujo del sistema */}
          <Route path="/proyecto" element={<Proyecto />} />

          {/* Ruta 4: Alertas — alertas activas + umbrales */}
          <Route path="/alertas"  element={<Alertas />} />
        </Routes>
      </main>
    </div>
  )
}
