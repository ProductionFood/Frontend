import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { ResumenPedidos } from '../../models/pedido.model';

/**
 * Tarjetas del resumen de ventas (HU-25). Muestra bruto, devoluciones y neto
 * juntos (R-04): el porcentaje de devolución es un indicador de calidad que se
 * pierde si solo se informa la venta neta.
 */
@Component({
  selector: 'app-resumen-ventas-cards',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './resumen-ventas-cards.component.html',
  styleUrl: './resumen-ventas-cards.component.scss'
})
export class ResumenVentasCardsComponent {
  readonly resumen = input.required<ResumenPedidos>();

  readonly porcentajeDevoluciones = computed(() => {
    const resumen = this.resumen();

    return resumen.ventaBruta > 0
      ? (resumen.devoluciones / resumen.ventaBruta) * 100
      : 0;
  });

  readonly tieneDevoluciones = computed(() => this.resumen().devoluciones > 0);
}
