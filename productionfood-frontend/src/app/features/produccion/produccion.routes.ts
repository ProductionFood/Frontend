import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
export const PRODUCCION_ROUTES:Routes=[
 {path:'',loadComponent:()=>import('./pages/plan-lista/plan-lista.component').then(m=>m.PlanListaComponent)},
 {path:'nuevo',canActivate:[rolGuard(['ADMIN','PRODUCCION'])],loadComponent:()=>import('./pages/plan-formulario/plan-formulario.component').then(m=>m.PlanFormularioComponent)},
 {path:':id',loadComponent:()=>import('./pages/plan-detalle/plan-detalle.component').then(m=>m.PlanDetalleComponent)}
];
