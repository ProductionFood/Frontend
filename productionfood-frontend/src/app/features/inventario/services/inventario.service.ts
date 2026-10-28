import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { CrearMovimientoInventarioDto, InventarioMateriaPrima, KardexInventario, MovimientoInventario } from '../models/inventario.model';

export interface InventarioFiltro {
  page: number;
  size: number;
  idMateriaPrima?: number;
  soloStockBajo?: boolean;
  incluirInactivas?: boolean;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/inventario`;

  listar(filtro: InventarioFiltro): Observable<PageResponse<InventarioMateriaPrima>> {
    let params = new HttpParams().set('page', filtro.page).set('size', filtro.size);
    if (filtro.idMateriaPrima !== undefined) params = params.set('idMateriaPrima', filtro.idMateriaPrima);
    if (filtro.soloStockBajo !== undefined) params = params.set('soloStockBajo', filtro.soloStockBajo);
    if (filtro.incluirInactivas !== undefined) params = params.set('incluirInactivas', filtro.incluirInactivas);
    if (filtro.sort) params = params.set('sort', filtro.sort);
    return this.http.get<PageResponse<InventarioMateriaPrima>>(this.url, { params });
  }

  movimientos(idMateriaPrima: number, desde?: string, hasta?: string): Observable<PageResponse<MovimientoInventario> | KardexInventario | MovimientoInventario[]> {
    let params = new HttpParams().set('page', 0).set('size', 100);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<PageResponse<MovimientoInventario> | KardexInventario | MovimientoInventario[]>(`${this.url}/${idMateriaPrima}/movimientos`, { params });
  }

  crearMovimiento(dto: CrearMovimientoInventarioDto): Observable<MovimientoInventario> {
    return this.http.post<MovimientoInventario>(`${this.url}/movimientos`, dto);
  }
}
