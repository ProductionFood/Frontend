import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { DashboardResumen } from '../features/dashboard/models/dashboard.model';
import { DashboardService } from '../features/dashboard/services/dashboard.service';
import { DevolucionService } from '../features/devolucion/services/devolucion.service';

export type TonoContador = 'normal' | 'aviso' | 'peligro';

export interface ContadorNav {
  valor: number;
  tono: TonoContador;
  /** Texto para lectores de pantalla y tooltip: "3 compras pendientes". */
  descripcion: string;
}

/** Contadores por ruta del sidebar; solo se incluyen los mayores que cero. */
export type ContadoresNav = Record<string, ContadorNav>;

const ROLES_DEVOLUCIONES = ['ADMIN', 'VENTAS', 'CONSULTA'];

/**
 * Pendientes que el sidebar muestra junto a cada módulo. Reutiliza el
 * resumen agregado del dashboard (una sola consulta) y suma el conteo de
 * devoluciones por aprobar. Si algo falla, el sidebar simplemente queda sin
 * contadores.
 */
@Injectable({ providedIn: 'root' })
export class ContadoresNavService {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  private readonly devoluciones = inject(DevolucionService);

  cargar(): Observable<ContadoresNav> {
    const rol = this.auth.rol();
    const devoluciones$ =
      rol && ROLES_DEVOLUCIONES.includes(rol)
        ? this.devoluciones.listar({ page: 0, size: 1, estado: 'PENDIENTE' }).pipe(
            map(respuesta => respuesta.totalElements),
            catchError(() => of(0))
          )
        : of(0);

    return forkJoin({
      resumen: this.dashboard.resumen().pipe(catchError(() => of(null))),
      devoluciones: devoluciones$
    }).pipe(map(({ resumen, devoluciones }) => this.armar(resumen, devoluciones)));
  }

  private armar(resumen: DashboardResumen | null, devoluciones: number): ContadoresNav {
    const contadores: ContadoresNav = {};
    const agregar = (ruta: string, valor: number | undefined, tono: TonoContador, descripcion: string) => {
      if (valor && valor > 0) contadores[ruta] = { valor, tono, descripcion: `${valor} ${descripcion}` };
    };

    if (resumen) {
      agregar('pedidos', resumen.pedidosHoy?.cantidad, 'normal', 'pedidos para hoy');
      agregar('produccion', resumen.produccionHoy?.cantidad, 'normal', 'planes para hoy');
      agregar(
        'compras',
        resumen.comprasPendientes?.cantidad,
        (resumen.comprasPendientes?.masAntigua?.diasPendiente ?? 0) > 7 ? 'aviso' : 'normal',
        'compras pendientes'
      );
      agregar(
        'inventario',
        resumen.stockBajo?.cantidad,
        (resumen.stockBajo?.agotadas ?? 0) > 0 ? 'peligro' : 'aviso',
        'materias primas con stock bajo'
      );
      agregar(
        'lotes-producto',
        resumen.porVencer?.cantidad,
        (resumen.porVencer?.vencidos ?? 0) > 0 ? 'peligro' : 'aviso',
        'lotes por vencer o vencidos'
      );
    }

    agregar('devoluciones', devoluciones, 'aviso', 'devoluciones por aprobar');
    return contadores;
  }
}
