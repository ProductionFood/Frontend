import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { EstadoPlan } from '../../../produccion/models/plan-produccion.model';
import { ResumenProduccionHoy } from '../../models/dashboard.model';

interface EstadoChip {
  clave: EstadoPlan;
  etiqueta: string;
  clase: string;
}

/** Tarjeta de planes de producción del día (CA-04). */
@Component({
  selector: 'app-tarjeta-produccion',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './tarjeta-produccion.component.html',
  styleUrl: './tarjeta-produccion.component.scss'
})
export class TarjetaProduccionComponent {
  readonly datos = input<ResumenProduccionHoy | null>(null);
  readonly cargando = input(false);
  readonly error = input(false);
  readonly reintentar = output<void>();

  readonly estados: readonly EstadoChip[] = [
    { clave: 'PLANIFICADO', etiqueta: 'planificado', clase: 'planificado' },
    { clave: 'EN_PROCESO', etiqueta: 'en proceso', clase: 'en-proceso' },
    { clave: 'COMPLETADO', etiqueta: 'completado', clase: 'completado' }
  ];

  cantidadEstado(clave: EstadoPlan): number {
    return this.datos()?.porEstado?.[clave] ?? 0;
  }
}
