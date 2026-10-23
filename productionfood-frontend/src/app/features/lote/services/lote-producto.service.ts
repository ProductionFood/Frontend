import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { Producto } from '../../producto/models/producto.model';
import { CrearLoteProductoDto, LoteProducto, MovimientoLoteProducto, ResultadoLoteProducto } from '../models/lote-producto.model';
@Injectable({ providedIn: 'root' })
export class LoteProductoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/lotes-producto`;
  listar(f: { page: number; size: number; idProducto?: number; soloConStock?: boolean; incluirVencidos?: boolean; proximos?: boolean; sort?: string }) {
    let params = new HttpParams().set('page', f.page).set('size', f.size);
    if (f.idProducto !== undefined) params = params.set('idProducto', f.idProducto);
    if (f.soloConStock !== undefined) params = params.set('soloConStock', f.soloConStock);
    if (f.incluirVencidos !== undefined) params = params.set('incluirVencidos', f.incluirVencidos);
    if (f.proximos !== undefined) params = params.set('proximos', f.proximos);
    if (f.sort) params = params.set('sort', f.sort);
    return this.http.get<PageResponse<LoteProducto>>(this.url, { params });
  }
  obtener(id: number) { return this.http.get<LoteProducto>(`${this.url}/${id}`); }
  crear(dto: CrearLoteProductoDto) { return this.http.post<ResultadoLoteProducto>(this.url, dto); }
  kardex(id: number) { return this.http.get<MovimientoLoteProducto[]>(`${this.url}/${id}/kardex`); }
  productos() { return this.http.get<PageResponse<Producto>>(`${environment.apiUrl}/productos`, {params: {page: 0, size: 500, activo: true}}); }
}
