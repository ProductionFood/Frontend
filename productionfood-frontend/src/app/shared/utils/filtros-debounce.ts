import { FormGroup } from '@angular/forms';
import { Observable, debounce, map, of, timer } from 'rxjs';

/** Espera estándar de los buscadores de listados. */
export const DEBOUNCE_BUSQUEDA_MS = 350;

/**
 * Cambios de un formulario de filtros con debounce solo para el texto de
 * búsqueda: mientras se escribe se espera a que el usuario pause, pero los
 * checkbox y selects del mismo formulario aplican al instante.
 */
export function cambiosDeFiltros<T>(
  filtros: FormGroup,
  campo = 'busqueda',
  espera = DEBOUNCE_BUSQUEDA_MS
): Observable<T> {
  let anterior: unknown = filtros.get(campo)?.value;

  return filtros.valueChanges.pipe(
    debounce(valor => {
      const escribiendo = valor?.[campo] !== anterior;
      anterior = valor?.[campo];
      return escribiendo ? timer(espera) : of(0);
    }),
    map(valor => valor as T)
  );
}
