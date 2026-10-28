import { Directive, TemplateRef, ViewContainerRef, input, effect } from '@angular/core';

/**
 * Directiva estructural que muestra/oculta una definición de columna completa
 * (header + celdas) según una función de visibilidad evaluada para la cabecera.
 *
 * Uso en tabla-paginada.component.html:
 *
 * ```html
 * <ng-container *appColumnaVisible="col.visible; fila: null" [matColumnDef]="col.id">
 *   <th mat-header-cell *matHeaderCellDef>...</th>
 *   <td mat-cell *matCellDef="let fila">...</td>
 * </ng-container>
 * ```
 *
 * La función `visible` recibe `null` (para la cabecera) y retorna `true`
 * si la columna debe incluirse en la tabla.
 * Para visibilidad por celda, usar `*ngIf` dentro de la plantilla personalizada.
 */
@Directive({
  selector: '[appColumnaVisible]',
  standalone: true
})
export class ColumnaVisibleDirective<T> {
  /**
   * Función que determina visibilidad. Recibe `null` para la cabecera.
   * Si no se proporciona, la columna siempre es visible.
   */
  readonly appColumnaVisible = input<
    ((fila: T | null) => boolean) | undefined
  >(undefined, { alias: 'appColumnaVisible' });
  /** Fila de contexto (siempre `null` para cabecera en tabla-paginada). */
  readonly appColumnaVisibleFila = input<T | null>(null, {
    alias: 'appColumnaVisibleFila'
  });

  constructor(
    private readonly tpl: TemplateRef<{ $implicit: T | null }>,
    private readonly vcr: ViewContainerRef
  ) {
    effect(() => {
      this.vcr.clear();
      const fila = this.appColumnaVisibleFila();
      const criterio = this.appColumnaVisible();
      const visible = criterio ? criterio(fila) : true;
      if (visible) {
        this.vcr.createEmbeddedView(this.tpl, { $implicit: fila });
      }
    });
  }
}