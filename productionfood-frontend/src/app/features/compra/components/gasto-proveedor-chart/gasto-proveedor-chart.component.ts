import { Component, computed, input } from '@angular/core';

import { CurrencyPipe, DecimalPipe } from '@angular/common';

import { GastoProveedor } from '../../models/compra.model';
import { PanelCardComponent } from '../../../../shared/components/panel-card/panel-card.component';

/**
 * Barras horizontales del gasto por proveedor (HU-15). Muestra los 5
 * proveedores de mayor a menor gasto en el período; el ancho de cada barra
 * es su participación (`porcentaje`).
 */
@Component({
  selector: 'app-gasto-proveedor-chart',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, PanelCardComponent],
  templateUrl: './gasto-proveedor-chart.component.html',
  styleUrl: './gasto-proveedor-chart.component.scss'
})
export class GastoProveedorChartComponent {
  readonly datos = input.required<GastoProveedor[]>();

  readonly principales = computed(() => this.datos().slice(0, 5));

  ancho(porcentaje: number): number {
    return Math.max(2, Math.min(100, porcentaje));
  }
}
