import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import {
  ActualizarMateriaPrimaDto,
  CrearMateriaPrimaDto,
  MateriaPrima,
  MateriaPrimaFiltro
} from '../models/materia-prima.model';

@Injectable({ providedIn: 'root' })
export class MateriaPrimaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/materias-primas`;

  listar(
    filtro: MateriaPrimaFiltro
  ): Observable<PageResponse<MateriaPrima>> {
    let params = new HttpParams()
      .set('page', filtro.page)
      .set('size', filtro.size);

    if (filtro.nombre) {
      params = params.set('nombre', filtro.nombre);
    }
    if (filtro.activo !== undefined) {
      params = params.set('activo', filtro.activo);
    }
    if (filtro.sort) {
      params = params.set('sort', filtro.sort);
    }

    return this.http.get<PageResponse<MateriaPrima>>(this.url, { params });
  }

  obtener(id: number): Observable<MateriaPrima> {
    return this.http.get<MateriaPrima>(`${this.url}/${id}`);
  }

  crear(dto: CrearMateriaPrimaDto): Observable<MateriaPrima> {
    return this.http.post<MateriaPrima>(this.url, dto);
  }

  actualizar(
    id: number,
    dto: ActualizarMateriaPrimaDto
  ): Observable<MateriaPrima> {
    return this.http.put<MateriaPrima>(`${this.url}/${id}`, dto);
  }

  cambiarEstado(id: number, activo: boolean): Observable<MateriaPrima> {
    return this.http.patch<MateriaPrima>(`${this.url}/${id}/estado`, {
      activo
    });
  }
}
