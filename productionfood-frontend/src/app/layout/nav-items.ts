import { RolNombre } from '../features/usuario/models/usuario.model';

export interface NavItem {
  /** Ruta relativa dentro de /app */
  ruta: string;
  titulo: string;
  /** Nombre del glifo Material Symbols */
  icono: string;
  /** Historia de usuario que lo implementará */
  hu?: string;
  descripcion: string;
  /**
   * Roles que ven este item (03-MATRIZ-ROLES.md §3).
   * Sin `roles` es visible para todos. Solo cosmético: la autorización real
   * vive en el backend con `@PreAuthorize`.
   */
  roles?: RolNombre[];
}

export interface NavGrupo {
  titulo: string;
  items: NavItem[];
}

/**
 * Módulos con implementación real (tienen componente propio en vez de la
 * página "en construcción"). El sidebar enlaza directo a estas rutas; a los
 * pendientes, a `/app/en-construccion/:ruta` para que el ítem quede activo.
 */
export const MODULOS_REALES = [
  'dashboard',
  'usuarios',
  'bitacora',
  'clientes',
  'proveedores',
  'unidades-medida',
  'materias-primas'
];

export const NAV_GRUPOS: NavGrupo[] = [
  {
    titulo: 'Operación',
    items: [
      {
        ruta: 'produccion',
        titulo: 'Producción',
        icono: 'factory',
        hu: 'HU-20 a HU-23',
        descripcion:
          'Plan de producción, sus productos y el consumo de materia prima.',
        roles: ['ADMIN', 'PRODUCCION', 'CONSULTA']
      },
      {
        ruta: 'lotes-producto',
        titulo: 'Lotes de producto terminado',
        icono: 'inventory_2',
        hu: 'HU-19',
        descripcion:
          'Registro de lotes de producto terminado generados en la producción.',
        roles: ['ADMIN', 'PRODUCCION', 'VENTAS', 'CONSULTA']
      },
      {
        ruta: 'recetas',
        titulo: 'Recetas',
        icono: 'menu_book',
        hu: 'HU-12',
        descripcion: 'Fórmulas de producción por producto y sus insumos.',
        roles: ['ADMIN', 'PRODUCCION', 'CONSULTA']
      },
      {
        ruta: 'productos',
        titulo: 'Productos',
        icono: 'bakery_dining',
        hu: 'HU-11',
        descripcion: 'Catálogo de productos del sistema.',
        roles: ['ADMIN', 'PRODUCCION', 'VENTAS', 'CONSULTA']
      }
    ]
  },
  {
    titulo: 'Inventario',
    items: [
      {
        ruta: 'inventario',
        titulo: 'Inventario de materias primas',
        icono: 'warehouse',
        hu: 'HU-10',
        descripcion: 'Consulta de existencias disponibles por materia prima.',
        roles: ['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA']
      },
      {
        ruta: 'materias-primas',
        titulo: 'Materias primas',
        icono: 'grain',
        hu: 'HU-08',
        descripcion: 'Gestión de materias primas y sus mínimos de stock.',
        roles: ['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA']
      },
      {
        ruta: 'lotes-materia-prima',
        titulo: 'Lotes de materia prima',
        icono: 'science',
        hu: 'HU-09',
        descripcion: 'Recepción de lotes y control de vencimientos.',
        roles: ['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA']
      },
      {
        ruta: 'unidades-medida',
        titulo: 'Unidades de medida',
        icono: 'straighten',
        hu: 'HU-07',
        descripcion: 'Catálogo de unidades de medida del sistema.'
      }
    ]
  },
  {
    titulo: 'Comercial',
    items: [
      {
        ruta: 'pedidos',
        titulo: 'Pedidos',
        icono: 'shopping_cart',
        hu: 'HU-16 y HU-17',
        descripcion: 'Creación de pedidos y gestión de sus productos.',
        roles: ['ADMIN', 'PRODUCCION', 'VENTAS', 'CONSULTA']
      },
      {
        ruta: 'clientes',
        titulo: 'Clientes',
        icono: 'people',
        hu: 'HU-05',
        descripcion: 'Gestión de clientes.',
        roles: ['ADMIN', 'PRODUCCION', 'VENTAS', 'CONSULTA']
      },
      {
        ruta: 'compras',
        titulo: 'Compras',
        icono: 'shopping_bag',
        hu: 'HU-13 a HU-15',
        descripcion: 'Registro de compras, su detalle y recepción.',
        roles: ['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA']
      },
      {
        ruta: 'proveedores',
        titulo: 'Proveedores',
        icono: 'local_shipping',
        hu: 'HU-06',
        descripcion: 'Gestión de proveedores.',
        roles: ['ADMIN', 'COMPRAS', 'CONSULTA']
      },
      {
        ruta: 'devoluciones',
        titulo: 'Devoluciones',
        icono: 'assignment_return',
        hu: 'HU-18',
        descripcion: 'Registro y aprobación de devoluciones de clientes.',
        roles: ['ADMIN', 'VENTAS', 'CONSULTA']
      }
    ]
  },
  {
    titulo: 'Administración',
    items: [
      {
        ruta: 'usuarios',
        titulo: 'Usuarios',
        icono: 'group',
        hu: 'HU-02',
        descripcion: 'Gestión de usuarios y roles.',
        roles: ['ADMIN']
      },
      {
        ruta: 'bitacora',
        titulo: 'Bitácora',
        icono: 'history',
        hu: 'HU-04',
        descripcion: 'Registro de auditoría de las acciones del sistema.',
        roles: ['ADMIN']
      },
      {
        ruta: 'reportes',
        titulo: 'Reportes',
        icono: 'assessment',
        hu: 'HU-25 a HU-27',
        descripcion:
          'Consulta de pedidos, eficiencia de producción y alertas de stock.'
      }
    ]
  }
];
