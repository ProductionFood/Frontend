import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { PageResponse } from '../models/page-response.model';

export interface ConteoCatalogo {
  total: number;
  activos: number;
  inactivos: number;
}

/**
 * Conteos de un catálogo con tres consultas ligeras (size=1): total, activos
 * e inactivos. Si una falla, ese conteo vale 0 y la pantalla sigue.
 */
export function contarCatalogo(
  listar: (activo: boolean | undefined) => Observable<PageResponse<unknown>>
): Observable<ConteoCatalogo> {
  const contar = (activo?: boolean) =>
    listar(activo).pipe(
      map(respuesta => respuesta.totalElements),
      catchError(() => of(0))
    );

  return forkJoin({
    total: contar(),
    activos: contar(true),
    inactivos: contar(false)
  });
}
