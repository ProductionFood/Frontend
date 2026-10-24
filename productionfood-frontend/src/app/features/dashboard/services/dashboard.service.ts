import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { DashboardResumen, ResumenPorVencer } from '../models/dashboard.model';

/**
 * Resumen operativo del día (HU-24). Es de solo lectura y sin caché (R-04):
 * cada apertura debe consultar datos frescos.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/dashboard`;

  /** Las cinco tarjetas en una sola consulta agregada. */
  resumen(): Observable<DashboardResumen> {
    return this.http.get<DashboardResumen>(this.url);
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
}
