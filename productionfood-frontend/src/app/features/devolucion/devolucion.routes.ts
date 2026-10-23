import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { DevolucionListaComponent } from './pages/devolucion-lista/devolucion-lista.component';
export const DEVOLUCION_ROUTES: Routes = [{path:'',component:DevolucionListaComponent,canActivate:[rolGuard(['ADMIN','VENTAS','CONSULTA'])]}];
