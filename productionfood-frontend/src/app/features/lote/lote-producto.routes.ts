import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
export const LOTE_PRODUCTO_ROUTES: Routes = [
  {path:'',canActivate:[rolGuard(['ADMIN','PRODUCCION','VENTAS','CONSULTA'])],loadComponent:()=>import('./pages/lote-producto-lista/lote-producto-lista.component').then(m=>m.LoteProductoListaComponent)},
  {path:'nuevo',canActivate:[rolGuard(['ADMIN','PRODUCCION','VENTAS','CONSULTA'])],loadComponent:()=>import('./pages/lote-producto-formulario-page/lote-producto-formulario-page.component').then(m=>m.LoteProductoFormularioPageComponent)},
  {path:':id/kardex',canActivate:[rolGuard(['ADMIN','PRODUCCION','VENTAS','CONSULTA'])],loadComponent:()=>import('./pages/lote-producto-kardex/lote-producto-kardex.component').then(m=>m.LoteProductoKardexComponent)}
];
