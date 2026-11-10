import { useEffect, useState } from 'react';
import { request } from '../services/api.js';

const TITLES = {
  material: 'Nuevo material',
  ubicacion: 'Nueva ubicación',
  movimiento: 'Registrar movimiento',
  proveedor: 'Nuevo proveedor',
  orden: 'Nueva orden de compra',
};

export default function FormModal({ kind, editing, close, submit }) {
  const [materials, setMaterials] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(editing || {});

  useEffect(() => {
    Promise.all([
      request('/materials'),
      request('/locations'),
      request('/suppliers'),
    ]).then(([materialRows, locationRows, supplierRows]) => {
      setMaterials(materialRows);
      setLocations(locationRows);
      setSuppliers(supplierRows);
    }).catch(() => {});
  }, []);

  const field = (key, label, type = 'text', required = true, options = null) => (
    <label key={key}>
      {label}
      {options ? (
        <select
          required={required}
          value={form[key] || ''}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        >
          <option value="">Selecciona…</option>
          {options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select>
      ) : (
        <input
          required={required}
          type={type}
          value={form[key] ?? ''}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        />
      )}
    </label>
  );

  const save = (event) => {
    event.preventDefault();
    if (kind === 'material') {
      submit(
        editing ? '/materials/' + editing.id : '/materials',
        editing ? 'PUT' : 'POST',
        { ...form },
        'Material guardado correctamente.',
      );
    } else if (kind === 'ubicacion') {
      submit('/locations', 'POST', form, 'Ubicación registrada.');
    } else if (kind === 'proveedor') {
      submit('/suppliers', 'POST', form, 'Proveedor registrado.');
    } else if (kind === 'movimiento') {
      submit('/movements', 'POST', { ...form, quantity: Number(form.quantity), user_id: 1 }, 'Movimiento registrado.');
    } else if (kind === 'orden') {
      submit('/orders', 'POST', {
        ...form,
        items: [{
          material_id: Number(form.material_id),
          quantity: Number(form.quantity),
          unit_price: Number(form.unit_price),
        }],
      }, 'Orden registrada.');
    }
  };

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <form className="modal" onSubmit={save}>
        <div className="modalhead">
          <div>
            <h2>{kind === 'material' && editing ? 'Editar material' : TITLES[kind]}</h2>
            <p>Completa los datos requeridos para guardar.</p>
          </div>
          <button type="button" className="close" onClick={close} aria-label="Cerrar">×</button>
        </div>
        <div className="formgrid">
          {kind === 'ubicacion' && <>
            {field('code', 'Código')}
            {field('name', 'Nombre de bodega u obra')}
            {field('location_type', 'Tipo', 'text', true, [['bodega', 'Bodega'], ['obra', 'Obra']])}
            {field('site_name', 'Nombre del proyecto', 'text', false)}
          </>}
          {kind === 'material' && <>
            {field('code', 'Código interno')}
            {field('name', 'Nombre')}
            {field('category', 'Categoría')}
            {field('unit', 'Unidad de medida')}
            {field('min_stock', 'Stock mínimo', 'number')}
            {field('max_stock', 'Stock máximo', 'number')}
            {field('avg_daily_demand', 'Demanda promedio por día', 'number')}
            {field('max_daily_demand', 'Demanda máxima por día', 'number')}
            {field('lead_time_days', 'Tiempo de entrega (días)', 'number')}
          </>}
          {kind === 'proveedor' && <>
            {field('name', 'Nombre')}
            {field('tax_id', 'Identificación tributaria', 'text', false)}
            {field('contact_name', 'Persona de contacto', 'text', false)}
            {field('email', 'Correo electrónico', 'email', false)}
            {field('phone', 'Teléfono', 'text', false)}
          </>}
          {kind === 'movimiento' && <>
            {field('movement_type', 'Tipo', 'text', true, [
              ['entrada', 'Entrada'], ['salida', 'Salida'], ['traslado', 'Traslado'], ['ajuste', 'Ajuste'],
            ])}
            {field('material_id', 'Material', 'text', true, materials.map((item) => [item.id, item.name + ' (' + item.unit + ')']))}
            {field('quantity', 'Cantidad', 'number')}
            {field('location_id', 'Ubicación destino / afectada', 'text', true, locations.map((item) => [item.id, item.name]))}
            {form.movement_type === 'traslado' && field('source_location_id', 'Ubicación de origen', 'text', true, locations.map((item) => [item.id, item.name]))}
            {field('movement_date', 'Fecha', 'date', false)}
            {field('reference_document', 'Documento de origen (OC / vale)')}
            {field('notes', 'Notas', 'text', false)}
          </>}
          {kind === 'orden' && <>
            {field('order_number', 'Número de OC')}
            {field('supplier_id', 'Proveedor', 'text', true, suppliers.map((item) => [item.id, item.name]))}
            {field('order_date', 'Fecha', 'date', false)}
            {field('material_id', 'Artículo', 'text', true, materials.map((item) => [item.id, item.name]))}
            {field('quantity', 'Cantidad', 'number')}
            {field('unit_price', 'Precio unitario (₡)', 'number')}
          </>}
        </div>
        <div className="modalfoot">
          <button type="button" className="secondary" onClick={close}>Cancelar</button>
          <button className="primary">Guardar</button>
        </div>
      </form>
    </div>
  );
}
