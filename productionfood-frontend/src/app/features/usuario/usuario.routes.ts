import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { UsuarioListaComponent } from './pages/usuario-lista/usuario-lista.component';
import { UsuarioFormularioComponent } from './pages/usuario-formulario/usuario-formulario.component';
import { UsuarioEditorComponent } from './pages/usuario-editor/usuario-editor.component';

export const USUARIO_ROUTES: Routes = [
  {
    path: '',
    component: UsuarioListaComponent,
    canActivate: [rolGuard(['ADMIN'])]
  },
  {
    path: 'nuevo',
    component: UsuarioFormularioComponent,
    canActivate: [rolGuard(['ADMIN'])]
  },
  {
    path: 'editar/:id',
    component: UsuarioEditorComponent,
    canActivate: [rolGuard(['ADMIN'])]
  }
];
