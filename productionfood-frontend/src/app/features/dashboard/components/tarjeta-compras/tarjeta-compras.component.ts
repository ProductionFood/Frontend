import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { ResumenComprasPendientes } from '../../models/dashboard.model';

/**
 * Tarjeta de compras pendientes (CA-02). Sin filtro de fecha: la antigüedad
 * de la más vieja es justamente la señal de acción (R-02).
 */
@Component({
  selector: 'app-tarjeta-compras',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './tarjeta-compras.component.html',
  styleUrl: './tarjeta-compras.component.scss'
})
export class TarjetaComprasComponent {
  readonly datos = input<ResumenComprasPendientes | null>(null);
  readonly cargando = input(false);
  readonly error = input(false);
  readonly reintentar = output<void>();
}
