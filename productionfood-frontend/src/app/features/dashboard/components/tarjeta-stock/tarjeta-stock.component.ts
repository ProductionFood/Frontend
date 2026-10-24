import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { ResumenStockBajo } from '../../models/dashboard.model';

/**
 * Tarjeta de materias primas bajo mínimo o agotadas (CA-03). Responde a
 * "¿qué hay que comprar?" y enlaza al registro de compras (HU-13).
 */
@Component({
  selector: 'app-tarjeta-stock',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './tarjeta-stock.component.html',
  styleUrl: './tarjeta-stock.component.scss'
})
export class TarjetaStockComponent {
  readonly datos = input<ResumenStockBajo | null>(null);
  readonly cargando = input(false);
  readonly error = input(false);
  readonly reintentar = output<void>();

  readonly itemsVisibles = computed(() => (this.datos()?.items ?? []).slice(0, 4));
}
