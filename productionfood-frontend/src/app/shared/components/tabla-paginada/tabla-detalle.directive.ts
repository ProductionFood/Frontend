import { Directive, TemplateRef } from '@angular/core';

/**
 * Marca un `<ng-template>` como el contenido de la fila desplegable de una
 * tabla paginada con `expandible = true`.
 *
 * La tabla renderiza una segunda fila bajo la fila clicada con esta plantilla;
 * el contexto implícito es la fila de datos actual.
 *
 * Uso desde la pantalla que consume `app-tabla-paginada`:
 *
 * ```html
 * <app-tabla-paginada
 *   [columnas]="columnas"
 *   [datos]="compras()"
 *   [expandible]="true"
 *   [expandida]="esExpandida"
 *   (alternarFila)="alternar($event)"
 * >
 *   ...
 *   <ng-template appTablaDetalle let-compra>
 *     <app-detalle-compra-tabla [idCompra]="compra.idCompra" />
 *   </ng-template>
 * </app-tabla-paginada>
 * ```
 */
@Directive({
  selector: '[appTablaDetalle]',
  standalone: true
})
export class TablaDetalleDirective {
  constructor(readonly template: TemplateRef<unknown>) {}
}
