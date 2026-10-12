import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';

import {
  ActualizarUsuarioDto,
  CrearUsuarioDto,
  Usuario,
  UsuarioFiltro
} from '../models/usuario.model';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/usuarios`;

  crear(dto: CrearUsuarioDto): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, dto);
  }

  listar(filtro: UsuarioFiltro): Observable<PageResponse<Usuario>> {
    let params = new HttpParams()
      .set('page', filtro.page)
      .set('size', filtro.size);

    if (filtro.busqueda) {
      params = params.set('busqueda', filtro.busqueda);
    }
    if (filtro.idRol !== undefined) {
      params = params.set('idRol', filtro.idRol);
    }
    if (filtro.activo !== undefined) {
      params = params.set('activo', filtro.activo);
    }
    if (filtro.sort) {
      params = params.set('sort', filtro.sort);
    }

    return this.http.get<PageResponse<Usuario>>(this.url, { params });
  }

  obtener(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  actualizar(id: number, dto: ActualizarUsuarioDto): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, dto);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.url}/${id}/estado`, { activo });
  }
}