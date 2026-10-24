import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AlertasStockResponse,
  ResumenAlertas,
  SugerenciaCompra
} from '../models/alerta.model';

/**
 * Alertas de stock (HU-27). `AGOTADO` y `BAJO` se calculan en la vista de V2;
 * aquí solo se consultan y se presentan ordenados por urgencia.
 */
@Injectable({ providedIn: 'root' })
export class AlertaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/inventario/alertas`;

  alertas(incluirInactivas = false): Observable<AlertasStockResponse> {
    return this.http.get<AlertasStockResponse>(this.url, {
      params: new HttpParams().set('incluirInactivas', incluirInactivas)
    });
  }

  /** Conteo ligero para el indicador global de la barra superior. */
  resumen(): Observable<ResumenAlertas> {
    return this.http.get<ResumenAlertas>(`${this.url}/resumen`);
  }

  sugerenciaCompra(): Observable<SugerenciaCompra[]> {
    return this.http.get<SugerenciaCompra[]>(`${this.url}/sugerencia-compra`);
  }
}
