import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import {
  BitacoraFiltro,
  BitacoraRegistro
} from '../models/bitacora.model';

@Injectable({
  providedIn: 'root'
})
export class BitacoraService {

  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/bitacora`;

  listar(filtro: BitacoraFiltro): Observable<PageResponse<BitacoraRegistro>> {
    let params = new HttpParams()
      .set('page', filtro.page)
      .set('size', filtro.size);

    if (filtro.idUsuario !== undefined) {
      params = params.set('idUsuario', filtro.idUsuario);
    }
    if (filtro.tabla) {
      params = params.set('tabla', filtro.tabla);
    }
    if (filtro.accion) {
      params = params.set('accion', filtro.accion);
    }
    if (filtro.fechaInicio) {
      params = params.set('fechaInicio', filtro.fechaInicio);
    }
    if (filtro.fechaFin) {
      params = params.set('fechaFin', filtro.fechaFin);
    }

    return this.http.get<PageResponse<BitacoraRegistro>>(this.url, { params });
  }

  listarAcciones(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/acciones`);
  }
}
