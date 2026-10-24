import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { rolGuard } from './core/auth/rol.guard';
import { MODULOS_REALES, NAV_GRUPOS } from './layout/nav-items';

/**
 * Módulos pendientes: solo redirigen a la ruta genérica
 * `/app/en-construccion/:ruta`, que resuelve nombre, HU, descripción e icono
 * desde NAV_GRUPOS. Un único componente compartido, sin duplicar rutas.
 */
const redirectsPendientes: Routes = NAV_GRUPOS
  .flatMap(grupo => grupo.items)
  .filter(item => !MODULOS_REALES.includes(item.ruta))
  .map(item => ({
    path: item.ruta,
    redirectTo: `en-construccion/${item.ruta}`,
    pathMatch: 'full' as const
  }));

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component')
        .then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/layout.component')
        .then(m => m.LayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'usuarios',
        canActivate: [rolGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/usuario/usuario.routes')
            .then(m => m.USUARIO_ROUTES)
      },
      {
        path: 'bitacora',
        canActivate: [rolGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/bitacora/bitacora.routes')
            .then(m => m.BITACORA_ROUTES)
      },
      {
        path: 'clientes',
        canActivate: [rolGuard(['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'])],
        loadChildren: () =>
          import('./features/cliente/cliente.routes')
            .then(m => m.CLIENTE_ROUTES)
      },
      {
        path: 'proveedores',
        canActivate: [rolGuard(['ADMIN', 'COMPRAS', 'CONSULTA'])],
        loadChildren: () =>
          import('./features/proveedor/proveedor.routes')
            .then(m => m.PROVEEDOR_ROUTES)
      },
      {
        path: 'unidades-medida',
        loadChildren: () =>
          import('./features/unidad-medida/unidad-medida.routes')
            .then(m => m.UNIDAD_MEDIDA_ROUTES)
      },
      {
        path: 'materias-primas',
        canActivate: [
          rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'])
        ],
        loadChildren: () =>
          import('./features/materia-prima/materia-prima.routes')
            .then(m => m.MATERIA_PRIMA_ROUTES)
      },
      {
        path: 'productos',
        canActivate: [rolGuard(['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'])],
        loadChildren: () =>
          import('./features/producto/producto.routes')
            .then(m => m.PRODUCTO_ROUTES)
      },
      {
        path: 'recetas',
        canActivate: [rolGuard(['ADMIN', 'PRODUCCION', 'CONSULTA'])],
        loadChildren: () =>
          import('./features/receta/receta.routes')
            .then(m => m.RECETA_ROUTES)
      },
      {
        path: 'inventario',
        canActivate: [rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'])],
        loadChildren: () =>
          import('./features/inventario/inventario.routes')
            .then(m => m.INVENTARIO_ROUTES)
      },
      {
        path: 'lotes-producto',
        canActivate: [rolGuard(['ADMIN', 'PRODUCCION', 'VENTAS', 'CONSULTA'])],
        loadChildren: () => import('./features/lote/lote-producto.routes').then(m => m.LOTE_PRODUCTO_ROUTES)
      },
      {
        path: 'lotes-materia-prima',
        canActivate: [rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'])],
        loadChildren: () =>
          import('./features/lote/lote.routes').then(m => m.LOTE_ROUTES)
      },
      {
        path: 'pedidos',
        canActivate: [rolGuard(['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'])],
        loadChildren: () =>
          import('./features/pedido/pedido.routes').then(m => m.PEDIDO_ROUTES)
      },
      {
        path: 'devoluciones',
        canActivate: [rolGuard(['ADMIN', 'VENTAS', 'CONSULTA'])],
        loadChildren: () => import('./features/devolucion/devolucion.routes').then(m => m.DEVOLUCION_ROUTES)
      },
      {
        path: 'produccion',
        canActivate: [rolGuard(['ADMIN', 'PRODUCCION', 'CONSULTA'])],
        loadChildren: () => import('./features/produccion/produccion.routes').then(m => m.PRODUCCION_ROUTES)
      },
      {
        path: 'compras',
        canActivate: [rolGuard(['ADMIN', 'COMPRAS', 'PRODUCCION', 'CONSULTA'])],
        loadChildren: () =>
          import('./features/compra/compra.routes').then(m => m.COMPRA_ROUTES)
      },
      {
        // Ruta única genérica para todos los módulos pendientes.
        path: 'en-construccion/:ruta',
        loadComponent: () =>
          import('./features/en-construccion/en-construccion.component')
            .then(m => m.EnConstruccionComponent)
      },
      ...redirectsPendientes,
      {
        // Ruta desconocida dentro de /app: página genérica de construcción.
        path: '**',
        redirectTo: 'en-construccion/desconocido'
      }
    ]
  },
  {
    path: 'sin-acceso',
    loadComponent: () =>
      import('./shared/sin-acceso.component')
        .then(m => m.SinAccesoComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
