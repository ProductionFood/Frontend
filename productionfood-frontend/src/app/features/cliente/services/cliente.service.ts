import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import {
  ActualizarClienteDto,
  Cliente,
  ClienteFiltro,
  CrearClienteDto
} from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/clientes`;

  listar(filtro: ClienteFiltro): Observable<PageResponse<Cliente>> {
    let params = new HttpParams()
      .set('page', filtro.page)
      .set('size', filtro.size);

    if (filtro.busqueda) params = params.set('busqueda', filtro.busqueda);
    if (filtro.activo !== undefined) params = params.set('activo', filtro.activo);
    if (filtro.sort) params = params.set('sort', filtro.sort);

    return this.http.get<PageResponse<Cliente>>(this.url, { params });
  }

  obtener(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.url}/${id}`);
  }

  crear(dto: CrearClienteDto): Observable<Cliente> {
    return this.http.post<Cliente>(this.url, dto);
  }

  actualizar(id: number, dto: ActualizarClienteDto): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.url}/${id}`, dto);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.url}/${id}/estado`, { activo });
  }
}
