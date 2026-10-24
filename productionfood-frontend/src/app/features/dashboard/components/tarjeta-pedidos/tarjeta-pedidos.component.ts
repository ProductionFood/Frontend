import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { EstadoPedido } from '../../../pedido/models/pedido.model';
import { ResumenPedidosHoy } from '../../models/dashboard.model';

interface EstadoChip {
  clave: EstadoPedido;
  etiqueta: string;
  clase: string;
}

/** Tarjeta de pedidos del día (CA-01): cantidad, venta total y desglose. */
@Component({
  selector: 'app-tarjeta-pedidos',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './tarjeta-pedidos.component.html',
  styleUrl: './tarjeta-pedidos.component.scss'
})
export class TarjetaPedidosComponent {
  readonly datos = input<ResumenPedidosHoy | null>(null);
  readonly cargando = input(false);
  readonly error = input(false);
  readonly reintentar = output<void>();

  readonly estados: readonly EstadoChip[] = [
    { clave: 'PENDIENTE', etiqueta: 'pendientes', clase: 'pendiente' },
    { clave: 'EN_PREPARACION', etiqueta: 'en preparación', clase: 'en-preparacion' },
    { clave: 'ENTREGADO', etiqueta: 'entregados', clase: 'entregado' },
    { clave: 'CANCELADO', etiqueta: 'cancelados', clase: 'cancelado' }
  ];

  cantidadEstado(clave: EstadoPedido): number {
    return this.datos()?.porEstado?.[clave] ?? 0;
  }
}
