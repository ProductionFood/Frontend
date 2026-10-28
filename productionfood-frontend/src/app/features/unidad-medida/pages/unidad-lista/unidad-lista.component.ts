import { Component, DestroyRef, inject, signal } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Sort } from '@angular/material/sort';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { UnidadMedida } from '../../models/unidad-medida.model';
import { UnidadMedidaService } from '../../services/unidad-medida.service';

/**
 * Catálogo de unidades de medida (HU-07). Sin paginador (R-01) y sin acción
 * de eliminar (R-03). La lectura está abierta a todos los roles; los botones
 * de escritura se ocultan con `*siRol="['ADMIN']"`.
 */
@Component({
  selector: 'app-unidad-lista',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TablaPaginadaComponent,
    TablaColumnaDirective,
    SiRolDirective
  ],
  templateUrl: './unidad-lista.component.html',
  styleUrl: './unidad-lista.component.scss'
})
export class UnidadListaComponent {
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'nombre', titulo: 'Nombre', ordenable: true },
    { id: 'abreviatura', titulo: 'Abreviatura', ordenable: true },
    { id: 'uso', titulo: 'En uso', ordenable: false },
    { id: 'acciones', titulo: '', ordenable: false }
  ];

  readonly unidades = signal<UnidadMedida[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.recargar();
  }

  recargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.unidadService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: unidades => {
          this.unidades.set(unidades);
          this.cargando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.unidades.set([]);
          this.cargando.set(false);
          this.error.set(this.mensajeError(error));
        }
      });
  }

  /** El catálogo no se pagina: el orden se aplica sobre la lista completa. */
  onOrden(orden: Sort): void {
    if (!orden.direction) {
      return;
    }

    const campo = orden.active === 'abreviatura' ? 'abreviatura' : 'nombre';
    const factor = orden.direction === 'asc' ? 1 : -1;

    const ordenadas = [...this.unidades()].sort(
      (a, b) =>
        a[campo].localeCompare(b[campo], 'es', { sensitivity: 'base' }) *
        factor
    );

    this.unidades.set(ordenadas);
  }

  nueva(): void {
    void this.router.navigate(['/app/unidades-medida/nueva']);
  }

  abrir(unidad: UnidadMedida): void {
    void this.router.navigate(['/app/unidades-medida', unidad.idUnidad]);
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as { message?: string } | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cargar el catálogo de unidades.';
  }
}
