import {
  Component,
  TemplateRef,
  computed,
  contentChild,
  contentChildren,
  input,
  output
} from '@angular/core';

import { NgTemplateOutlet } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { SkeletonComponent } from '../skeleton/skeleton.component';
import { TablaColumnaDirective } from './tabla-columna.directive';
import { TablaDetalleDirective } from './tabla-detalle.directive';
import { ColumnaVisibleDirective } from './columna-visible.directive';

export interface ColumnaTabla<T = unknown> {
  /** Identificador de la columna (sirve también como campo de orden). */
  id: string;
  /** Texto de la cabecera. */
  titulo: string;
  /** Si es `false`, la columna no se puede ordenar. Por defecto sí. */
  ordenable?: boolean;
  /** Clase opcional para las celdas de la columna. */
  clase?: string;
  /**
   * Función opcional para mostrar/ocultar la columna dinámicamente.
   * Recibe la fila actual (o `null` para la cabecera) y retorna `true` si se renderiza.
   */
  visible?: (fila: T | null) => boolean;
  /** Roles permitidos para ver esta columna (requiere *siRol en la plantilla del consumidor). */
  roles?: string[];
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
    SkeletonComponent,
    MatButtonModule,
    MatIconModule,
    ColumnaVisibleDirective
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
  /** Muestra los botones de primera y última página en el paginador. */
  readonly primeraUltima = input(false);
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  readonly mensajeVacio = input('No hay registros para mostrar.');
  /** Si es `false`, no se muestra el paginador (catálogos cortos). */
  readonly paginado = input(true);

  /**
   * Si es `true`, añade una columna de expansión a la izquierda y una fila
   * de detalle desplegable debajo de cada fila clicada (R-06).
   *
   * Requiere proyectar un `<ng-template appTablaDetalle>`. Por defecto es
   * `false`, por lo que las tablas simples no se ven afectadas.
   */
  readonly expandible = input(false);

  /** Indica si la fila actual está expandida. Se evalúa por fila. */
  readonly expandida = input<(fila: T) => boolean>(() => false);

  readonly cambiarPagina = output<PageEvent>();
  readonly cambiarOrden = output<Sort>();
  readonly reintentar = output<void>();
  /** Emitido al hacer clic en la fila o en su botón de expansión. */
  readonly alternarFila = output<T>();

  private readonly plantillas = contentChildren(TablaColumnaDirective);
  private readonly plantillaDetalleSignal = contentChild(TablaDetalleDirective);

  readonly columnasIds = computed(() => {
    const ids = this.columnas()
      .filter(col => this.columnaVisibleEnCabecera(col))
      .map(col => col.id);

    return this.expandible() ? ['expand', ...ids] : ids;
  });

  /** Plantilla de la fila de detalle, si se proyectó. */
  readonly detalleDisponible = computed(() => this.plantillaDetalleSignal() != null);

  /** Verifica si una columna es visible en la cabecera (fila = null). */
  private columnaVisibleEnCabecera(col: ColumnaTabla<T>): boolean {
    if (!col.visible) return true;
    return col.visible(null);
  }

  plantilla(id: string): TemplateRef<unknown> | null {
    return (
      this.plantillas().find(
        plantilla => plantilla.columna() === id
      )?.template ?? null
    );
  }

  /** Plantilla de la fila de detalle (requiere `expandible`). */
  plantillaDetalle(): TemplateRef<unknown> | null {
    return this.plantillaDetalleSignal()?.template ?? null;
  }

  /** `true` si la fila está expandida según la función del consumidor. */
  esExpandida(fila: T): boolean {
    if (!this.expandible()) {
      return false;
    }

    return this.expandida()(fila);
  }

  /** Alterna la expansión de la fila (clic en fila o en el chevron). */
  alternar(fila: T): void {
    if (this.expandible()) {
      this.alternarFila.emit(fila);
    }
  }
}
