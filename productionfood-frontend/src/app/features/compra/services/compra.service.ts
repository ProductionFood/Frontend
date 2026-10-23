import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import {
  ActualizarCompraDto,
  Compra,
  CompraFiltro,
  CrearCompraDto,
  EstadoCompra,
  RecepcionResultado
} from '../models/compra.model';

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/compras`;

  listar(filtro: CompraFiltro): Observable<PageResponse<Compra>> {
    let params = new HttpParams()
      .set('page', filtro.page)
      .set('size', filtro.size);

    if (filtro.idProveedor !== undefined) {
      params = params.set('idProveedor', filtro.idProveedor);
    }
    if (filtro.estado) {
      params = params.set('estado', filtro.estado);
    }
    if (filtro.fechaInicio) {
      params = params.set('fechaInicio', filtro.fechaInicio);
    }
    if (filtro.fechaFin) {
      params = params.set('fechaFin', filtro.fechaFin);
    }
    if (filtro.sort) {
      params = params.set('sort', filtro.sort);
    }

    return this.http.get<PageResponse<Compra>>(this.url, { params });
  }

  /** Devuelve la compra con su `detalle` (incluye `stockActual` por línea). */
  obtener(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${this.url}/${id}`);
  }

  crear(dto: CrearCompraDto): Observable<Compra> {
    return this.http.post<Compra>(this.url, dto);
  }

  actualizar(id: number, dto: ActualizarCompraDto): Observable<Compra> {
    return this.http.put<Compra>(`${this.url}/${id}`, dto);
  }

  /**
   * Cambia el estado (HU-13 §2). Recibir (`RECIBIDA`) es el punto de entrada
   * de stock: en una única transacción suma cada línea del detalle y devuelve
   * los movimientos generados (R-01).
   */
  cambiarEstado(
    id: number,
    estado: EstadoCompra
  ): Observable<RecepcionResultado> {
    return this.http.patch<RecepcionResultado>(`${this.url}/${id}/estado`, {
      estado
    });
  }
}
