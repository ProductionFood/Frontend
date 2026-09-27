import { Routes } from '@angular/router';

import { UsuarioFormularioComponent } from './pages/usuario-formulario/usuario-formulario.component';

export const USUARIO_ROUTES: Routes = [
  {
    path: 'nuevo',
    component: UsuarioFormularioComponent
  }
];