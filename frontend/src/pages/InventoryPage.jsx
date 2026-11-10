import React from 'react';
import ActionButton from '../components/ActionButton.jsx';
import DataTable from '../components/DataTable.jsx';
import FormModal from '../components/FormModal.jsx';
import { date, money } from '../services/api.js';

const SEARCH_PAGES = new Set([
  'Materiales',
  'Movimientos',
  'Proveedores',
  'Órdenes de compra',
  'Alertas',
  'Historial y trazabilidad',
]);

export default function InventoryPage({
  page,
  data,
  original,
  query,
  setQuery,
  setModal,
  setEditing,
  modal,
  editing,
  closeModal,
  submit,
  onDelete,
  onTrace,
  traceRows,
}) {
  const isTracePage = page === 'Historial y trazabilidad';
  const visibleRows = isTracePage && traceRows
    ? traceRows
    : Array.isArray(data)
      ? data.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))
      : [];

  return (
    <>
      <section className="panel listing">
        <div className="listtools">
          {SEARCH_PAGES.has(page) && (
            <label className="search">
              ⌕ <input
                placeholder="Buscar por nombre, código o referencia…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
          {isTracePage && Array.isArray(original) && (
            <select
              className="select"
              onChange={(event) => event.target.value && onTrace(event.target.value)}
              defaultValue=""
            >
              <option value="">Selecciona un material para ver su historial</option>
              {original.map((material) => (
                <option value={material.id} key={material.id}>
                  {material.name} ({material.code})
                </option>
              ))}
            </select>
          )}
        </div>

        {page === 'Materiales' && (
          <DataTable
            headers={['CÓDIGO', 'MATERIAL', 'CATEGORÍA', 'STOCK ACTUAL', 'SEGURIDAD', 'PUNTO REORDEN', 'PLAZO']}
            rows={visibleRows.map((item) => [
              <b>{item.code}</b>,
              <><b>{item.name}</b><small>{item.unit}</small></>,
              item.category,
              item.stock + ' ' + item.unit,
              item.safety_stock + ' ' + item.unit,
              item.reorder_point + ' ' + item.unit,
              item.lead_time_days + ' días',
            ])}
            actions={visibleRows.map((item) => (
              <>
                <button className="rowaction" onClick={() => { setEditing(item); setModal('material'); }}>Editar</button>
                <button className="rowaction dangertext" onClick={() => onDelete(item.id)}>Archivar</button>
              </>
            ))}
            empty="No hay materiales. Registra el primero para iniciar."
          />
        )}

        {page === 'Inventario por ubicación' && (
          <DataTable
            headers={['UBICACIÓN', 'OBRA', 'CÓDIGO', 'MATERIAL', 'EXISTENCIAS', 'PUNTO DE REORDEN']}
            rows={visibleRows.map((item) => [
              <b>{item.location_name}</b>,
              item.site_name || '—',
              item.code,
              item.material_name,
              item.stock + ' ' + item.unit,
              item.reorder_point + ' ' + item.unit,
            ])}
            empty="No hay ubicaciones ni materiales para mostrar."
          />
        )}

        {page === 'Movimientos' && (
          <DataTable
            headers={['FECHA', 'TIPO', 'MATERIAL', 'CANTIDAD', 'UBICACIÓN', 'USUARIO', 'DOCUMENTO']}
            rows={visibleRows.map((item) => [
              date(item.movement_date),
              <span className="badge neutral">{item.movement_type}</span>,
              item.material_name,
              item.quantity + ' ' + item.unit,
              item.location_name,
              item.user_name,
              item.reference_document,
            ])}
            empty="No hay movimientos registrados."
          />
        )}

        {page === 'Proveedores' && (
          <DataTable
            headers={['PROVEEDOR', 'IDENTIFICACIÓN', 'CONTACTO', 'CORREO', 'TELÉFONO']}
            rows={visibleRows.map((item) => [
              <b>{item.name}</b>,
              item.tax_id || '—',
              item.contact_name || '—',
              item.email || '—',
              item.phone || '—',
            ])}
            empty="No hay proveedores registrados."
          />
        )}

        {page === 'Órdenes de compra' && (
          <>
            <DataTable
              headers={['NÚMERO', 'FECHA', 'PROVEEDOR', 'ARTÍCULOS', 'TOTAL', 'ESTADO']}
              rows={visibleRows.map((item) => [
                <b>{item.order_number}</b>,
                date(item.order_date),
                item.supplier_name,
                item.item_count,
                money(item.total),
                <span className="badge neutral">{item.status}</span>,
              ])}
              empty="No hay órdenes registradas."
            />
            <div className="duplist">
              {(original?.duplicates || []).map((item, index) => (
                <div className="dup" key={item.order_a_id + '-' + item.order_b_id + '-' + index}>
                  <div className="warnicon">!</div>
                  <div>
                    <b>{item.order_a} y {item.order_b}: posible duplicado</b>
                    <p>{item.supplier_name} · {item.material_name} · {item.qty_a} / {item.qty_b} unidades</p>
                    <small>Coincidencia dentro de la regla configurada ({item.days_apart} días).</small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {page === 'Alertas' && (
          <DataTable
            headers={['MATERIAL', 'STOCK ACTUAL', 'PUNTO DE REORDEN', 'FALTANTE', 'PLAZO']}
            rows={visibleRows.map((item) => [
              <><b>{item.name}</b><small>{item.code}</small></>,
              item.stock + ' ' + item.unit,
              item.reorder_point + ' ' + item.unit,
              <span className="badge red">{item.shortage} {item.unit}</span>,
              item.lead_time_days + ' días',
            ])}
            empty="Todo el inventario está sobre su punto de reorden."
          />
        )}

        {isTracePage && traceRows && (
          <DataTable
            headers={['FECHA', 'TIPO', 'CANTIDAD', 'UBICACIÓN', 'ORIGEN', 'USUARIO', 'DOCUMENTO / OC']}
            rows={traceRows.map((item) => [
              date(item.movement_date),
              item.movement_type,
              item.quantity + ' ' + item.unit,
              item.location_name,
              item.source_location_name || '—',
              item.user_name,
              item.order_number || item.reference_document,
            ])}
            empty="No hay movimientos para este material."
          />
        )}
      </section>

      {modal && (
        <FormModal
          kind={modal}
          editing={editing}
          close={closeModal}
          submit={submit}
        />
      )}
    </>
  );
}
