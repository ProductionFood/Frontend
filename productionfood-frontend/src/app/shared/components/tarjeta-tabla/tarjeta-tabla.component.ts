import { Component, input } from '@angular/core';

/**
 * Tarjeta contenedora de tabla (guía §07): cabecera con título y contador,
 * contenido proyectado y una ranura `[pie]` opcional.
 */
@Component({
  selector: 'app-tarjeta-tabla',
  standalone: true,
  templateUrl: './tarjeta-tabla.component.html',
  styleUrl: './tarjeta-tabla.component.scss'
})
export class TarjetaTablaComponent {
  readonly titulo = input.required<string>();
  readonly contador = input<string | number | null>(null);
}
