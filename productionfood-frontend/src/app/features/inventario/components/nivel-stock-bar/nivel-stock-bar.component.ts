import { Component, computed, input } from '@angular/core';

import { NivelAlerta } from '../../models/alerta.model';

/**
 * Barra de nivel de una alerta (HU-27): disponible / mínimo. Se llena en rojo
 * cuando la materia prima está agotada.
 */
@Component({
  selector: 'app-nivel-stock-bar',
  standalone: true,
  template: `
    <span class="pista" role="img" [attr.aria-label]="etiqueta()">
      <span
        class="relleno"
        [class.agotado]="nivel() === 'AGOTADO'"
        [style.width.%]="porcentaje()"
      ></span>
    </span>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 90px;
      }

      .pista {
        display: block;
        height: 8px;
        border-radius: 999px;
        background: var(--fondo);
        overflow: hidden;
      }

      .relleno {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: var(--naranja-500);
      }

      .relleno.agotado {
        background: var(--rojo-500);
      }
    `
  ]
})
export class NivelStockBarComponent {
  readonly disponible = input.required<number>();
  readonly minimo = input.required<number>();
  readonly nivel = input.required<NivelAlerta>();

  readonly porcentaje = computed(() => {
    const minimo = this.minimo();

    if (minimo <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (this.disponible() / minimo) * 100));
  });

  readonly etiqueta = computed(
    () => `${Math.round(this.porcentaje())} % del stock mínimo`
  );
}
