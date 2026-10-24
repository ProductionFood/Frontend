import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { ItemPorVencer, ResumenPorVencer } from '../../models/dashboard.model';

/**
 * Tarjeta de lotes por vencer (CA-05). Es la primera por urgencia: los lotes
 * vencidos con stock son los que hay que retirar hoy (R-03).
 */
@Component({
  selector: 'app-tarjeta-vencimientos',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './tarjeta-vencimientos.component.html',
  styleUrl: './tarjeta-vencimientos.component.scss'
})
export class TarjetaVencimientosComponent {
  readonly datos = input<ResumenPorVencer | null>(null);
  readonly cargando = input(false);
  readonly error = input(false);
  readonly reintentar = output<void>();

  readonly itemsVisibles = computed(() => (this.datos()?.items ?? []).slice(0, 4));

  etiquetaVencimiento(item: ItemPorVencer): string {
    const dias = item.diasParaVencer;

    if (dias < 0) {
      return 'VENCIDO';
    }

    if (dias === 0) {
      return 'VENCE HOY';
    }

    return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  }
}
