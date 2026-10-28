import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ProductoListaComponent } from './pages/producto-lista/producto-lista.component';
import { ProductoFormularioPageComponent } from './pages/producto-formulario-page/producto-formulario-page.component';

export const PRODUCTO_ROUTES: Routes = [
  {
    path: '',
    component: ProductoListaComponent,
    canActivate: [rolGuard(['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'])]
  },
  {
    path: 'nuevo',
    component: ProductoFormularioPageComponent,
    canActivate: [rolGuard(['ADMIN'])]
  },
  {
    path: ':id/editar',
    component: ProductoFormularioPageComponent,
    canActivate: [rolGuard(['ADMIN'])]
  }
];
