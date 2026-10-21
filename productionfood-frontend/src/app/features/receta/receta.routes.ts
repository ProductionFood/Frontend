import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { RecetaListaComponent } from './pages/receta-lista/receta-lista.component';
import { RecetaFormularioComponent } from './pages/receta-formulario/receta-formulario.component';

const ROLES_LECTURA = ['ADMIN', 'PRODUCCION', 'CONSULTA'] as const;
const ROLES_ESCRITURA = ['ADMIN', 'PRODUCCION'] as const;

export const RECETA_ROUTES: Routes = [
  { path: '', component: RecetaListaComponent, canActivate: [rolGuard([...ROLES_LECTURA])] },
  { path: 'nueva', component: RecetaFormularioComponent, canActivate: [rolGuard([...ROLES_ESCRITURA])] },
  { path: ':id', component: RecetaFormularioComponent, canActivate: [rolGuard([...ROLES_LECTURA])] }
];
