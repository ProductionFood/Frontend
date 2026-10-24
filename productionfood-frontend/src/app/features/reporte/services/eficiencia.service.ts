import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  DesviacionMateriaPrima,
  FiltroEficiencia,
  ReporteEficiencia
} from '../models/eficiencia.model';

/**
 * Reporte de eficiencia de producción (HU-26). Solo lectura; los cálculos y
 * los promedios viven en el backend.
 */
@Injectable({ providedIn: 'root' })
export class EficienciaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/reportes/eficiencia`;

  reporte(filtro: FiltroEficiencia): Observable<ReporteEficiencia> {
    return this.http.get<ReporteEficiencia>(this.url, {
      params: this.params(filtro)
    });
  }

  desviacionMateriasPrimas(
    filtro: FiltroEficiencia
  ): Observable<DesviacionMateriaPrima[]> {
    return this.http.get<DesviacionMateriaPrima[]>(
      `${this.url}/materias-primas`,
      { params: this.params(filtro) }
    );
  }

  private params(filtro: FiltroEficiencia): HttpParams {
    let params = new HttpParams();

    if (filtro.fechaInicio) {
      params = params.set('fechaInicio', filtro.fechaInicio);
    }
    if (filtro.fechaFin) {
      params = params.set('fechaFin', filtro.fechaFin);
    }

    return params;
  }
}
