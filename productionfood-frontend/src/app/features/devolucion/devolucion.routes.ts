import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { DevolucionListaComponent } from './pages/devolucion-lista/devolucion-lista.component';
import { DevolucionFormularioComponent } from './pages/devolucion-formulario/devolucion-formulario.component';
export const DEVOLUCION_ROUTES: Routes = [
  {path:'',component:DevolucionListaComponent,canActivate:[rolGuard(['ADMIN','VENTAS','CONSULTA'])]},
  {path:'nueva',component:DevolucionFormularioComponent,canActivate:[rolGuard(['ADMIN','VENTAS','CONSULTA'])]}
];
