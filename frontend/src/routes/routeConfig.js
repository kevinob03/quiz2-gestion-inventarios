export const APP_ROUTES = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: '⌂',
    subtitle: 'Un resumen claro de materiales, existencias y actividad reciente.',
    endpoint: '/dashboard',
  },
  {
    label: 'Materiales',
    path: '/materials',
    icon: '▦',
    subtitle: 'Catálogo de insumos y parámetros de reposición.',
    endpoint: '/materials',
    action: ['+ Nuevo material', 'material'],
  },
  {
    label: 'Inventario por ubicación',
    path: '/inventory',
    icon: '⌖',
    subtitle: 'Existencias actuales en bodegas y obras.',
    endpoint: '/inventory',
    action: ['+ Nueva ubicación', 'ubicacion'],
  },
  {
    label: 'Movimientos',
    path: '/movements',
    icon: '⇄',
    subtitle: 'Registro auditable de entradas, salidas, traslados y ajustes.',
    endpoint: '/movements',
    action: ['+ Registrar movimiento', 'movimiento'],
  },
  {
    label: 'Proveedores',
    path: '/suppliers',
    icon: '♙',
    subtitle: 'Directorio de proveedores registrados.',
    endpoint: '/suppliers',
    action: ['+ Nuevo proveedor', 'proveedor'],
  },
  {
    label: 'Órdenes de compra',
    path: '/orders',
    icon: '▤',
    subtitle: 'Compras y artículos asociados a cada proveedor.',
    endpoint: '/orders',
    action: ['+ Nueva orden', 'orden'],
  },
  {
    label: 'Alertas',
    path: '/alerts',
    icon: '⚑',
    subtitle: 'Materiales que alcanzaron su punto de reorden.',
    endpoint: '/alerts/reorder',
  },
  {
    label: 'Historial y trazabilidad',
    path: '/history',
    icon: '◷',
    subtitle: 'Rastrea el origen y recorrido de cada existencia.',
    endpoint: '/materials',
  },
];

export function getRouteFromHash(hash = window.location.hash) {
  const path = hash.replace(/^#/, '') || '/dashboard';
  return APP_ROUTES.find((route) => route.path === path) || APP_ROUTES[0];
}
