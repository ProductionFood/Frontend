import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { VentaCliente } from '../../models/pedido.model';

/**
 * Barras horizontales de ventas por cliente (HU-25). Muestra los 5 mayores;
 * el ancho de cada barra es su participación en la venta del período.
 */
@Component({
  selector: 'app-ventas-cliente-chart',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './ventas-cliente-chart.component.html',
  styleUrl: './ventas-cliente-chart.component.scss'
})
export class VentasClienteChartComponent {
  readonly datos = input.required<VentaCliente[]>();

  readonly principales = computed(() => this.datos().slice(0, 5));

  ancho(porcentaje: number): number {
    return Math.max(2, Math.min(100, porcentaje));
  }
}
