import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ActualizarDetalleCompraDto,
  AgregarDetalleCompraDto,
  DetalleCompraListaResponse,
  DetalleCompraResponse
} from '../models/detalle-compra.model';

/**
 * Endpoints de detalle de compra (HU-14). El backend valida la cabecera
 * (compra existente y `PENDIENTE`, R-01) y la unicidad de materia prima
 * (R-02); el total de la respuesta siempre viene calculado por el servidor
 * (R-03).
 */
@Injectable({ providedIn: 'root' })
export class DetalleCompraService {
  private readonly http = inject(HttpClient);

  private base(idCompra: number): string {
    return `${environment.apiUrl}/compras/${idCompra}/detalles`;
  }

  listar(idCompra: number): Observable<DetalleCompraListaResponse> {
    return this.http.get<DetalleCompraListaResponse>(this.base(idCompra));
  }

  agregar(
    idCompra: number,
    dto: AgregarDetalleCompraDto
  ): Observable<DetalleCompraResponse> {
    return this.http.post<DetalleCompraResponse>(this.base(idCompra), dto);
  }

  actualizar(
    idCompra: number,
    idDetalleCompra: number,
    dto: ActualizarDetalleCompraDto
  ): Observable<DetalleCompraResponse> {
    return this.http.put<DetalleCompraResponse>(
      `${this.base(idCompra)}/${idDetalleCompra}`,
      dto
    );
  }

  eliminar(idCompra: number, idDetalleCompra: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base(idCompra)}/${idDetalleCompra}`
    );
  }
}
