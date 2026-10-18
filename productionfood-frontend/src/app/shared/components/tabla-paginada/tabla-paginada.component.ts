import {
  Component,
  TemplateRef,
  computed,
  contentChildren,
  input,
  output
} from '@angular/core';

import { NgTemplateOutlet } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { TablaColumnaDirective } from './tabla-columna.directive';

export interface ColumnaTabla {
  /** Identificador de la columna (sirve también como campo de orden). */
  id: string;
  /** Texto de la cabecera. */
  titulo: string;
  /** Si es `false`, la columna no se puede ordenar. Por defecto sí. */
  ordenable?: boolean;
  /** Clase opcional para las celdas de la columna. */
  clase?: string;
}

/**
 * Tabla genérica con orden y paginación (server-side) sobre `MatTable`.
 *
 * Es la base de los listados del proyecto: la pantalla que la usa aporta las
 * columnas, los datos de la página actual, el total y, opcionalmente, una
 * plantilla por columna para celdas con chips, avatares o acciones.
 */
@Component({
  selector: 'app-tabla-paginada',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './tabla-paginada.component.html',
  styleUrl: './tabla-paginada.component.scss'
})
export class TablaPaginadaComponent<T> {
  readonly columnas = input.required<ColumnaTabla[]>();
  readonly datos = input.required<T[]>();
  readonly total = input(0);
  readonly page = input(0);
  readonly size = input(20);
  readonly opcionesTamano = input<number[]>([5, 10, 20, 50]);
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  readonly mensajeVacio = input('No hay registros para mostrar.');
  /** Si es `false`, no se muestra el paginador (catálogos cortos). */
  readonly paginado = input(true);

  readonly cambiarPagina = output<PageEvent>();
  readonly cambiarOrden = output<Sort>();
  readonly reintentar = output<void>();

  private readonly plantillas = contentChildren(TablaColumnaDirective);

  readonly columnasIds = computed(() => this.columnas().map(col => col.id));

  plantilla(id: string): TemplateRef<unknown> | null {
    return (
      this.plantillas().find(
        plantilla => plantilla.columna() === id
      )?.template ?? null
    );
  }
}
