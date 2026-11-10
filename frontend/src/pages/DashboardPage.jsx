import React from 'react';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';
import { date } from '../services/api.js';

export default function DashboardPage({ data = {}, go }) {
  const indicators = data.indicators || {};
  return (
    <>
      <section className="stats">
        <StatCard icon="▦" label="Materiales activos" value={indicators.materials ?? '—'} foot="En el catálogo" />
        <StatCard icon="⌖" label="Ubicaciones" value={indicators.locations ?? '—'} foot="Bodegas y obras" />
        <StatCard icon="⚑" label="Por reponer" value={indicators.alerts ?? '—'} foot="Debajo del punto de reorden" alert />
        <StatCard icon="↔" label="Compras sospechosas" value={indicators.duplicateOrders ?? '—'} foot="Revisar antes de aprobar" />
      </section>

      <div className="dashgrid">
        <section className="panel">
          <div className="panelhead">
            <div><h2>Requieren atención</h2><p>Stock actual por debajo del punto de reorden</p></div>
            <button className="textbutton" onClick={() => go('Alertas')}>Ver alertas →</button>
          </div>
          {data.lowStock?.length ? (
            <div className="tablewrap">
              <table>
                <thead><tr><th>MATERIAL</th><th>STOCK ACTUAL</th><th>PUNTO DE REORDEN</th><th>ESTADO</th></tr></thead>
                <tbody>
                  {data.lowStock.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td><b>{item.name}</b><small>{item.code}</small></td>
                      <td>{item.stock} {item.unit}</td>
                      <td>{item.reorder_point} {item.unit}</td>
                      <td><span className="badge red">Reponer</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState text="No hay materiales bajo el punto de reorden." />}
        </section>

        <section className="panel">
          <div className="panelhead">
            <div><h2>Posibles órdenes duplicadas</h2><p>Coincidencias por proveedor, artículo, cantidad y fecha</p></div>
            <button className="textbutton" onClick={() => go('Órdenes de compra')}>Ver compras →</button>
          </div>
          {data.duplicates?.length ? data.duplicates.map((item, index) => (
            <div className="dup" key={item.order_a_id + '-' + item.order_b_id + '-' + index}>
              <div className="warnicon">!</div>
              <div>
                <b>{item.order_a} · {item.order_b}</b>
                <p>{item.supplier_name} · {item.material_name}</p>
                <small>Mismo artículo y proveedor · {item.days_apart} días</small>
              </div>
            </div>
          )) : <EmptyState text="No se detectaron coincidencias sospechosas." />}
        </section>
      </div>

      <section className="panel recent">
        <div className="panelhead">
          <div><h2>Movimientos recientes</h2><p>Últimos registros de inventario</p></div>
          <button className="textbutton" onClick={() => go('Movimientos')}>Ver movimientos →</button>
        </div>
        {data.movements?.length ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>FECHA</th><th>MATERIAL</th><th>TIPO</th><th>CANTIDAD</th><th>UBICACIÓN</th><th>DOCUMENTO</th></tr></thead>
              <tbody>
                {data.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{date(movement.movement_date)}</td>
                    <td><b>{movement.material_name}</b></td>
                    <td><span className="badge neutral">{movement.movement_type}</span></td>
                    <td>{movement.quantity}</td>
                    <td>{movement.location_name}</td>
                    <td>{movement.reference_document}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState text="Aún no hay movimientos registrados." />}
      </section>
    </>
  );
}
