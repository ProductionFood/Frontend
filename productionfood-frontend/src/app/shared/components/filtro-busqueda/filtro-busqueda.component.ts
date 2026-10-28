import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/**
 * Campo de búsqueda reutilizable de las barras de filtros (guía §07):
 * ícono de prefijo, etiqueta, control del formulario de la página y botón
 * de limpiar visible mientras haya texto.
 *
 * Uso desde la pantalla que filtra:
 *
 * ```html
 * <section class="filtros">
 *   <app-filtro-busqueda etiqueta="Buscar por nombre" [control]="filtros.controls.busqueda" />
 *   ...
 * </section>
 * ```
 */
@Component({
  selector: 'app-filtro-busqueda',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './filtro-busqueda.component.html',
  styleUrl: './filtro-busqueda.component.scss'
})
export class FiltroBusquedaComponent {
  /** Etiqueta flotante del campo; también nombra el botón de limpiar. */
  readonly etiqueta = input.required<string>();

  /** Control reactivo de la página que recibe el texto de búsqueda. */
  readonly control = input.required<FormControl<string>>();

  /** Ícono de prefijo (Material Symbols). */
  readonly icono = input('search');

  limpiar(): void {
    this.control().setValue('');
  }
}
