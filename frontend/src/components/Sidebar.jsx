import { APP_ROUTES } from '../routes/routeConfig.js';

export default function Sidebar({ page, alertCount, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandmark">DV</div>
        <div><b>DEL VALLE</b><small>CONTROL DE INVENTARIO</small></div>
      </div>
      <div className="workspace"><span className="dot" />Operaciones · Costa Rica</div>
      <div className="navlabel">GESTIÓN</div>
      <nav>
        {APP_ROUTES.map((route) => (
          <button
            key={route.path}
            className={page === route.label ? 'active' : ''}
            onClick={() => onNavigate(route)}
          >
            <span className="navicon">{route.icon}</span>
            {route.label}
            {route.label === 'Alertas' && alertCount > 0 && <em>{alertCount}</em>}
          </button>
        ))}
      </nav>
      <div className="sidebottom">
        <div className="avatar">DV</div>
        <div><b>Equipo de operaciones</b><small>Constructora Del Valle S.A.</small></div>
        <span className="more">···</span>
      </div>
    </aside>
  );
}
