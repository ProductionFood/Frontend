import { Component, input } from '@angular/core';

export type TonoBadge =
  | 'neutro'
  | 'pendiente'
  | 'proceso'
  | 'completado'
  | 'peligro';

/**
 * Badge de estado del sistema de diseño: punto + texto, nunca solo color
 * (guía §05 y §13). El color viene del tono semántico, no del estado de negocio.
 */
@Component({
  selector: 'app-estado-badge',
  standalone: true,
  template: `
    <span [class]="'badge badge--' + tono()">
      @if (punto()) {
        <span class="badge__punto" aria-hidden="true"></span>
      }
      {{ texto() }}
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 999px;
        background: var(--fondo);
        color: var(--tinta-600);
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }

      .badge__punto {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      .badge--pendiente {
        background: var(--naranja-100);
        color: #92610b;
      }

      .badge--proceso {
        background: var(--azul-100);
        color: #1d4ed8;
      }

      .badge--completado {
        background: var(--verde-100);
        color: var(--verde-700);
      }

      .badge--peligro {
        background: var(--rojo-100);
        color: #b02a2e;
      }
    `
  ]
})
export class EstadoBadgeComponent {
  readonly texto = input.required<string>();
  readonly tono = input<TonoBadge>('neutro');
  readonly punto = input(true);
}
