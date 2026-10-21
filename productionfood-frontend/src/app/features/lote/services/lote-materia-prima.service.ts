import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { MateriaPrima } from '../../materia-prima/models/materia-prima.model';
import { CrearLoteMateriaPrimaDto, LoteMateriaPrima, ResultadoRegistroLote } from '../models/lote.model';

@Injectable({ providedIn: 'root' })
export class LoteMateriaPrimaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/lotes-materia-prima`;

  listar(filtro: { page: number; size: number; idMateriaPrima?: number; soloVencidos?: boolean; vencenEn7Dias?: boolean }): Observable<PageResponse<LoteMateriaPrima>> {
    let params = new HttpParams().set('page', filtro.page).set('size', filtro.size);
    if (filtro.idMateriaPrima !== undefined) params = params.set('idMateriaPrima', filtro.idMateriaPrima);
    if (filtro.soloVencidos) params = params.set('soloVencidos', true);
    if (filtro.vencenEn7Dias) params = params.set('vencenEn7Dias', true);
    return this.http.get<PageResponse<LoteMateriaPrima>>(this.url, { params });
  }

  crear(dto: CrearLoteMateriaPrimaDto): Observable<ResultadoRegistroLote> {
    return this.http.post<ResultadoRegistroLote>(this.url, dto);
  }

  materiasPrimas(): Observable<PageResponse<MateriaPrima>> {
    return this.http.get<PageResponse<MateriaPrima>>(`${environment.apiUrl}/materias-primas`, { params: { page: 0, size: 200, activo: true } });
  }
}
