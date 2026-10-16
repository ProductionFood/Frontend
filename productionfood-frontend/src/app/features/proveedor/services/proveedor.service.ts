import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import {
  ActualizarProveedorDto,
  CrearProveedorDto,
  Proveedor,
  ProveedorFiltro
} from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/proveedores`;

  listar(filtro: ProveedorFiltro): Observable<PageResponse<Proveedor>> {
    let params = new HttpParams()
      .set('page', filtro.page)
      .set('size', filtro.size);

    if (filtro.busqueda) params = params.set('busqueda', filtro.busqueda);
    if (filtro.activo !== undefined) params = params.set('activo', filtro.activo);
    if (filtro.sort) params = params.set('sort', filtro.sort);

    return this.http.get<PageResponse<Proveedor>>(this.url, { params });
  }

  obtener(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.url}/${id}`);
  }

  crear(dto: CrearProveedorDto): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.url, dto);
  }

  actualizar(id: number, dto: ActualizarProveedorDto): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.url}/${id}`, dto);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Proveedor> {
    return this.http.patch<Proveedor>(`${this.url}/${id}/estado`, { activo });
  }
}
