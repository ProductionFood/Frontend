import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  shareReplay,
  tap,
  throwError
} from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ActualizarUnidadDto,
  CrearUnidadDto,
  UnidadMedida
} from '../models/unidad-medida.model';

/**
 * Catálogo de unidades de medida (HU-07).
 *
 * `listar()` se cachea con `shareReplay(1)` porque lo consumen los
 * desplegables de materias primas (HU-08), productos (HU-11) y recetas
 * (HU-12). Tras crear o editar se invalida la caché para que la unidad nueva
 * aparezca en esos formularios sin recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class UnidadMedidaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/unidades-medida`;

  private cache$: Observable<UnidadMedida[]> | null = null;

  listar(): Observable<UnidadMedida[]> {
    if (this.cache$) {
      return this.cache$;
    }

    const peticion$ = this.http.get<UnidadMedida[]>(this.url).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError(error => {
        this.cache$ = null;
        return throwError(() => error);
      })
    );

    this.cache$ = peticion$;
    return peticion$;
  }

  invalidarCache(): void {
    this.cache$ = null;
  }

  obtener(id: number): Observable<UnidadMedida> {
    return this.http.get<UnidadMedida>(`${this.url}/${id}`);
  }

  crear(dto: CrearUnidadDto): Observable<UnidadMedida> {
    return this.http
      .post<UnidadMedida>(this.url, dto)
      .pipe(tap(() => this.invalidarCache()));
  }

  /**
   * R-04: cambiar la abreviatura de una unidad en uso exige confirmación
   * explícita. El backend lo recibe como `?confirmar=true`, según el
   * contrato documentado ("parámetro confirmar=true").
   */
  actualizar(
    id: number,
    dto: ActualizarUnidadDto,
    confirmar = false
  ): Observable<UnidadMedida> {
    const params = confirmar
      ? new HttpParams().set('confirmar', true)
      : undefined;

    return this.http
      .put<UnidadMedida>(`${this.url}/${id}`, dto, { params })
      .pipe(tap(() => this.invalidarCache()));
  }
}
