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
        background: var(--superficie-suave);
        color: var(--texto-suave);
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
        background: var(--aviso-fondo);
        color: var(--aviso-texto);
      }

      .badge--proceso {
        background: var(--info-fondo);
        color: var(--info-texto);
      }

      .badge--completado {
        background: var(--exito-fondo);
        color: var(--exito-texto);
      }

      .badge--peligro {
        background: var(--peligro-fondo);
        color: var(--peligro-texto);
      }
    `
  ]
})
export class EstadoBadgeComponent {
  readonly texto = input.required<string>();
  readonly tono = input<TonoBadge>('neutro');
  readonly punto = input(true);
}
