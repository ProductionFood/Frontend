import { Component, input } from '@angular/core';

import { CurrencyPipe } from '@angular/common';

import { ResumenCompras } from '../../models/compra.model';

/**
 * Tarjetas de resumen del período (HU-15). El gasto ejecutado (recibidas) y
 * el comprometido (pendientes) van por separado (R-04): fundirlos daría una
 * cifra que no corresponde ni a lo pagado ni a lo comprometido.
 */
@Component({
  selector: 'app-resumen-compras-cards',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './resumen-compras-cards.component.html',
  styleUrl: './resumen-compras-cards.component.scss'
})
export class ResumenComprasCardsComponent {
  readonly resumen = input.required<ResumenCompras>();

  totalCompras(): number {
    const r = this.resumen();
    return r.recibidas.cantidad + r.pendientes.cantidad + r.canceladas.cantidad;
  }
}
