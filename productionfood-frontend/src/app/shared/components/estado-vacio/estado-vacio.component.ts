import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type TonoVacio = 'neutro' | 'exito' | 'error';

/**
 * Estado vacío del sistema de diseño (guía §07b): icono, mensaje afirmativo,
 * detalle opcional y acciones proyectadas.
 */
@Component({
  selector: 'app-estado-vacio',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div [class]="'vacio vacio--' + tono()" role="status">
      <mat-icon aria-hidden="true">{{ icono() }}</mat-icon>
      <p class="vacio__mensaje">{{ mensaje() }}</p>
      @if (detalle(); as detalle) {
        <small class="vacio__detalle">{{ detalle }}</small>
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .vacio {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 44px 22px;
        text-align: center;
        color: var(--tinta-600);
      }

      .vacio mat-icon {
        width: 34px;
        height: 34px;
        font-size: 34px;
        color: var(--tinta-400);
      }

      .vacio__mensaje {
        margin: 0;
        font-size: 12.5px;
      }

      .vacio__detalle {
        font-size: 11.5px;
        color: var(--tinta-400);
      }

      .vacio--exito mat-icon {
        color: var(--verde-500);
      }

      .vacio--exito .vacio__mensaje {
        color: var(--verde-900);
        font-weight: 600;
      }

      .vacio--error mat-icon {
        color: var(--rojo-500);
      }
    `
  ]
})
export class EstadoVacioComponent {
  readonly icono = input('inbox');
  readonly mensaje = input.required<string>();
  readonly detalle = input<string | null>(null);
  readonly tono = input<TonoVacio>('neutro');
}
