import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import {
  ActualizarPedidoDto,
  CrearPedidoDto,
  EstadoPedido,
  Pedido,
  PedidoFiltro,
  ProductoVendido,
  ResumenPedidos,
  ResumenPedidosFiltro,
  VentaCliente
} from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pedidos`;

  listar<T extends Pedido = Pedido>(
    filtro: PedidoFiltro
  ): Observable<PageResponse<T>> {
    let params = new HttpParams()
      .set('page', filtro.page)
      .set('size', filtro.size);

    if (filtro.idCliente !== undefined) {
      params = params.set('idCliente', filtro.idCliente);
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

    return this.http.get<PageResponse<T>>(this.url, { params });
  }

  /** Totales del período (HU-25 R-03): entregado, en curso y cancelado por separado. */
  resumen(filtro: ResumenPedidosFiltro): Observable<ResumenPedidos> {
    return this.http.get<ResumenPedidos>(`${this.url}/resumen`, {
      params: this.paramsPeriodo(filtro)
    });
  }

  /** Ventas agrupadas por cliente, de mayor a menor (HU-25). */
  ventasPorCliente(filtro: ResumenPedidosFiltro): Observable<VentaCliente[]> {
    return this.http.get<VentaCliente[]>(`${this.url}/por-cliente`, {
      params: this.paramsPeriodo(filtro)
    });
  }

  /** Ranking por unidades vendidas, no por importe (HU-25 R-07). */
  productosMasVendidos(
    filtro: ResumenPedidosFiltro
  ): Observable<ProductoVendido[]> {
    return this.http.get<ProductoVendido[]>(
      `${this.url}/productos-mas-vendidos`,
      { params: this.paramsPeriodo(filtro) }
    );
  }

  /** Devuelve el pedido con su `detalle` (incluye `lotesConsumidos` por línea). */
  obtener(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.url}/${id}`);
  }

  /** El estado inicial siempre es PENDIENTE y la fecha la pone el servidor (R-01). */
  crear(dto: CrearPedidoDto): Observable<Pedido> {
    return this.http.post<Pedido>(this.url, dto);
  }

  /** Cabecera editable solo mientras el pedido está PENDIENTE (R-05). */
  actualizar(id: number, dto: ActualizarPedidoDto): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.url}/${id}`, dto);
  }

  /**
   * Cambia el estado (R-02). Cancelar (`CANCELADO`) devuelve el stock de cada
   * línea a sus lotes de origen (R-04); el backend lo hace transaccional.
   */
  cambiarEstado(id: number, estado: EstadoPedido): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.url}/${id}/estado`, { estado });
  }

  private paramsPeriodo(filtro: ResumenPedidosFiltro): HttpParams {
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
