import { useCallback, useEffect, useState } from 'react';
import ActionButton from './components/ActionButton.jsx';
import InventoryAssistant from './components/InventoryAssistant.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import { ErrorNotice, SuccessNotice } from './components/Notice.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { APP_ROUTES, getRouteFromHash } from './routes/routeConfig.js';
import { request } from './services/api.js';

export default function App() {
  const [page, setPage] = useState(() => getRouteFromHash().label);
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const [apiStatus, setApiStatus] = useState(false);
  const [traceRows, setTraceRows] = useState(null);

  const load = useCallback(async () => {
    const route = APP_ROUTES.find((item) => item.label === page) || APP_ROUTES[0];
    try {
      const [pageData, health] = await Promise.all([
        request(route.endpoint),
        request('/health'),
      ]);
      if (page === 'Órdenes de compra') {
        pageData.duplicates = await request('/orders/possible-duplicates');
      }
      setData(pageData);
      setTraceRows(null);
      setApiStatus(health.ok);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
      setApiStatus(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const syncPage = () => setPage(getRouteFromHash().label);
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  const navigate = (route) => {
    setQuery('');
    setPage(route.label);
    if (window.location.hash !== '#' + route.path) window.location.hash = route.path;
  };

  const submit = async (path, method, body, message) => {
    try {
      await request(path, { method, body: JSON.stringify(body) });
      setModal('');
      setEditing(null);
      setSuccess(message);
      setError('');
      await load();
      window.setTimeout(() => setSuccess(''), 4000);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteMaterial = async (id) => {
    const confirmed = window.confirm(
      '¿Archivar este material? Si tiene movimientos, el sistema conservará su historial y rechazará la acción.',
    );
    if (!confirmed) return;
    try {
      await request('/materials/' + id, { method: 'DELETE' });
      setSuccess('Material archivado.');
      setError('');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const traceMaterial = async (id) => {
    try {
      setTraceRows(await request('/materials/' + id + '/trace'));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const activeRoute = APP_ROUTES.find((route) => route.label === page) || APP_ROUTES[0];
  const visibleData = Array.isArray(data)
    ? data.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))
    : [];
  const visibleTraceRows = traceRows
    ? traceRows.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))
    : null;

  return (
    <>
      <div className="app">
        <Sidebar
          page={page}
          alertCount={data.indicators?.alerts || 0}
          onNavigate={navigate}
        />
        <main className="main">
          <Topbar page={page} apiStatus={apiStatus} />
          <div className="content">
            <div className="heading">
              <div>
                <div className="eyebrow">CONSTRUCTORA DEL VALLE S.A.</div>
                <h1>{page}</h1>
                <p>{activeRoute.subtitle}</p>
              </div>
              <ActionButton action={activeRoute.action} onClick={setModal} />
            </div>
            <ErrorNotice message={error} onRetry={load} />
            <SuccessNotice message={success} />
            <AppRoutes
              page={page}
              data={visibleData}
              original={data}
              query={query}
              setQuery={setQuery}
              setModal={setModal}
              setEditing={setEditing}
              modal={modal}
              editing={editing}
              closeModal={() => { setModal(''); setEditing(null); }}
              submit={submit}
              onDelete={deleteMaterial}
              onTrace={traceMaterial}
              traceRows={visibleTraceRows}
              go={(label) => {
                const route = APP_ROUTES.find((item) => item.label === label);
                if (route) navigate(route);
              }}
            />
          </div>
        </main>
      </div>
      <InventoryAssistant />
    </>
  );
}
