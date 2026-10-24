import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

import { ProductoVendido } from '../../models/pedido.model';

/**
 * Ranking de productos más vendidos (HU-25 R-07). Se ordena por unidades,
 * no por importe: son dos preguntas distintas y ambas columnas se exponen.
 */
@Component({
  selector: 'app-productos-vendidos-tabla',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, MatTableModule],
  templateUrl: './productos-vendidos-tabla.component.html',
  styleUrl: './productos-vendidos-tabla.component.scss'
})
export class ProductosVendidosTablaComponent {
  readonly datos = input.required<ProductoVendido[]>();

  readonly columnas = ['producto', 'unidadesVendidas', 'importe', 'pedidos'];
}
