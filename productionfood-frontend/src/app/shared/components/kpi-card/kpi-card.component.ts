import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type TonoKpi = 'verde' | 'azul' | 'naranja' | 'rojo' | 'morado';

/**
 * Tarjeta KPI del sistema de diseño (guía §05): etiqueta, cifra display e
 * icono tintado. El detalle se proyecta debajo de la cifra.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss'
})
export class KpiCardComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string | number>();
  readonly icono = input<string | null>(null);
  readonly tono = input<TonoKpi>('verde');
  /** Color de la cifra cuando el valor comunica un estado. */
  readonly tonoValor = input<TonoKpi | null>(null);
}
