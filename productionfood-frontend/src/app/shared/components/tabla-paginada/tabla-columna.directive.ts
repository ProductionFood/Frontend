import { Directive, TemplateRef, input } from '@angular/core';

/**
 * Marca un `<ng-template>` como la plantilla de celda de una columna de la
 * tabla paginada.
 *
 * Uso desde la pantalla que consume `app-tabla-paginada`:
 *
 * ```html
 * <ng-template appTablaColumna="rol" let-usuario>
 *   <span class="chip">{{ usuario.rol.nombre }}</span>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[appTablaColumna]',
  standalone: true
})
export class TablaColumnaDirective {
  readonly columna = input.required<string>({ alias: 'appTablaColumna' });

  constructor(readonly template: TemplateRef<unknown>) {}
}
