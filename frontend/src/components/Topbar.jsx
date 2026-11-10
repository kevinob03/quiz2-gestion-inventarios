export default function Topbar({ page, apiStatus }) {
  return (
    <header className="topbar">
      <div className="crumb">Operaciones <span>/</span> <b>{page}</b></div>
      <div className="topright">
        <span className={'connection ' + (apiStatus ? '' : 'offline')}>
          <i /> {apiStatus ? 'API conectada' : 'API desconectada'}
        </span>
        <span className="today">
          {new Date().toLocaleDateString('es-CR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <div className="avatar small">DV</div>
      </div>
    </header>
  );
}
