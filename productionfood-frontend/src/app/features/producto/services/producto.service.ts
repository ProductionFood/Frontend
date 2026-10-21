import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import {
  ActualizarProductoDto,
  CrearProductoDto,
  Producto,
  ProductoFiltro
} from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/productos`;

  listar(filtro: ProductoFiltro): Observable<PageResponse<Producto>> {
    let params = new HttpParams()
      .set('page', filtro.page)
      .set('size', filtro.size);

    if (filtro.busqueda) params = params.set('busqueda', filtro.busqueda);
    if (filtro.activo !== undefined) params = params.set('activo', filtro.activo);
    if (filtro.sinReceta !== undefined) params = params.set('sinReceta', filtro.sinReceta);
    if (filtro.sort) params = params.set('sort', filtro.sort);

    return this.http.get<PageResponse<Producto>>(this.url, { params });
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.url}/${id}`);
  }

  crear(dto: CrearProductoDto): Observable<Producto> {
    return this.http.post<Producto>(this.url, dto);
  }

  actualizar(id: number, dto: ActualizarProductoDto): Observable<Producto> {
    return this.http.put<Producto>(`${this.url}/${id}`, dto);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Producto> {
    return this.http.patch<Producto>(`${this.url}/${id}/estado`, { activo });
  }
}
