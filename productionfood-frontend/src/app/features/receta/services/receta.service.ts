import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { CrearRecetaDto, Receta, RecetaFiltro } from '../models/receta.model';

@Injectable({ providedIn: 'root' })
export class RecetaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/recetas`;

  listar(filtro: RecetaFiltro): Observable<PageResponse<Receta>> {
    let params = new HttpParams().set('page', filtro.page).set('size', filtro.size);
    if (filtro.busqueda) params = params.set('busqueda', filtro.busqueda);
    if (filtro.activa !== undefined) params = params.set('activa', filtro.activa);
    if (filtro.sort) params = params.set('sort', filtro.sort);
    return this.http.get<PageResponse<Receta>>(this.url, { params });
  }

  obtener(id: number): Observable<Receta> {
    return this.http.get<Receta>(`${this.url}/${id}`);
  }

  crear(dto: CrearRecetaDto): Observable<Receta> {
    return this.http.post<Receta>(this.url, dto);
  }

  actualizar(id: number, dto: CrearRecetaDto): Observable<Receta> {
    return this.http.put<Receta>(`${this.url}/${id}`, dto);
  }

  cambiarEstado(id: number, activa: boolean): Observable<Receta> {
    return this.http.patch<Receta>(`${this.url}/${id}/estado`, { activa });
  }
}
