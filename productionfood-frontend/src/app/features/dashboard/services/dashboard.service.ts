import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { AuthService } from '../../../core/auth/auth.service';
import { ProductoService } from '../../producto/services/producto.service';
import { MateriaPrimaService } from '../../materia-prima/services/materia-prima.service';
import { RecetaService } from '../../receta/services/receta.service';
import { PlanProduccionService } from '../../produccion/services/plan-produccion.service';
import { FiltroPlan, PlanProduccion } from '../../produccion/models/plan-produccion.model';
import { InventarioService } from '../../inventario/services/inventario.service';
import {
  ConteosDashboard,
  DashboardResumen,
  ResumenPorVencer
} from '../models/dashboard.model';

const ROLES_PLANES = ['ADMIN', 'PRODUCCION', 'CONSULTA'];

/**
 * Resumen operativo del día (HU-24). Es de solo lectura y sin caché (R-04):
 * cada apertura debe consultar datos frescos.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly productos = inject(ProductoService);
  private readonly materias = inject(MateriaPrimaService);
  private readonly recetas = inject(RecetaService);
  private readonly planesService = inject(PlanProduccionService);
  private readonly inventario = inject(InventarioService);
  private readonly url = `${environment.apiUrl}/dashboard`;

  /** Las cinco tarjetas en una sola consulta agregada. */
  resumen(): Observable<DashboardResumen> {
    return this.http.get<DashboardResumen>(this.url);
  }

  /** Conteos de catálogos con permisos por rol (una consulta ligera cada uno). */
  conteos(): Observable<ConteosDashboard> {
    const puede = (...roles: string[]) => this.tieneRol(roles);
    const contar = (peticion: Observable<PageResponse<unknown>>) =>
      peticion.pipe(map(respuesta => respuesta.totalElements), catchError(() => of(null)));

    return forkJoin({
      productos: puede('ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA')
        ? contar(this.productos.listar({ page: 0, size: 1 }))
        : of(null),
      materiasPrimas: puede('ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA')
        ? contar(this.materias.listar({ page: 0, size: 1 }))
        : of(null),
      recetas: puede('ADMIN', 'PRODUCCION', 'CONSULTA')
        ? contar(this.recetas.listar({ page: 0, size: 1 }))
        : of(null),
      planes: puede('ADMIN', 'PRODUCCION', 'CONSULTA')
        ? contar(this.planesService.listar({ page: 0, size: 1 }))
        : of(null),
      inventario: puede('ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA')
        ? contar(this.inventario.listar({ page: 0, size: 1 }))
        : of(null)
    });
  }

  /**
   * Planes de producción para el gráfico y la tabla. Reutiliza el listado de
   * planes; los roles sin acceso a producción reciben una lista vacía en
   * lugar de un 403.
   */
  planes(filtro: Omit<FiltroPlan, 'page'>): Observable<PlanProduccion[]> {
    if (!this.tieneRol(ROLES_PLANES)) {
      return of([]);
    }

    return this.planesService.listar({ page: 0, ...filtro }).pipe(
      map(respuesta => respuesta.content),
      catchError(() => of([]))
    );
  }

  /**
   * Detalle de lotes por vencer. El horizonte es configurable para que otros
   * módulos lo reutilicen (diseno.md §4); por defecto, 7 días (CA-05).
   */
  vencimientos(dias = 7): Observable<ResumenPorVencer> {
    return this.http.get<ResumenPorVencer>(`${this.url}/vencimientos`, {
      params: new HttpParams().set('diasVencimiento', dias)
    });
  }

  private tieneRol(roles: string[]): boolean {
    const rol = this.auth.rol();
    return rol !== null && roles.includes(rol);
  }
}
