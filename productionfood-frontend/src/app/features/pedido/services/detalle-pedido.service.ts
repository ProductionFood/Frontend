import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Pedido } from '../models/pedido.model';
import { StockProducto, AgregarDetallePedidoDto, ActualizarDetallePedidoDto } from '../models/detalle-pedido.model';
@Injectable({providedIn:'root'})
export class DetallePedidoService {
 private readonly http = inject(HttpClient);
 private url(id: number) { return `${environment.apiUrl}/pedidos/${id}/detalles`; }
 stock(id: number) { return this.http.get<StockProducto>(`${environment.apiUrl}/productos/${id}/stock`); }
 agregar(id: number, dto: AgregarDetallePedidoDto) { return this.http.post<Pedido>(this.url(id), dto); }
 actualizar(id: number, detalle: number, dto: ActualizarDetallePedidoDto) { return this.http.put<Pedido>(`${this.url(id)}/${detalle}`,dto); }
 eliminar(id: number, detalle: number) { return this.http.delete<void>(`${this.url(id)}/${detalle}`); }
}
