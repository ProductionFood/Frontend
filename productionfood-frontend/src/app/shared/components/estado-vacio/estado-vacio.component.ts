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
        color: var(--texto-suave);
      }

      .vacio mat-icon {
        width: 28px;
        height: 28px;
        font-size: 28px;
        color: var(--texto-tenue);
      }

      .vacio__mensaje {
        margin: 0;
        font-size: 12.5px;
      }

      .vacio__detalle {
        font-size: 11.5px;
        color: var(--texto-tenue);
      }

      .vacio--exito mat-icon {
        color: var(--exito-icono);
      }

      .vacio--exito .vacio__mensaje {
        color: var(--exito-texto);
        font-weight: 600;
      }

      .vacio--error mat-icon {
        color: var(--peligro-icono);
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
