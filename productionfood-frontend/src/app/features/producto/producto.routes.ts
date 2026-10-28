import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ProductoFormularioComponent } from './pages/producto-formulario/producto-formulario.component';
import { ProductoListaComponent } from './pages/producto-lista/producto-lista.component';

export const PRODUCTO_ROUTES: Routes = [
  {
    path: '',
    component: ProductoListaComponent,
    canActivate: [rolGuard(['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'])]
  },
  {
    path: 'nuevo',
    component: ProductoFormularioComponent,
    canActivate: [rolGuard(['ADMIN'])]
  },
  {
    path: ':id/editar',
    component: ProductoFormularioComponent,
    canActivate: [rolGuard(['ADMIN'])]
  }
];
