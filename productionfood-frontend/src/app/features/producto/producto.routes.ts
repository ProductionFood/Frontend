import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ProductoListaComponent } from './pages/producto-lista/producto-lista.component';

export const PRODUCTO_ROUTES: Routes = [
  {
    path: '',
    component: ProductoListaComponent,
    canActivate: [rolGuard(['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'])]
  }
];
