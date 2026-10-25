import { Component, DestroyRef, inject, signal } from '@angular/core';

import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { MateriaPrima } from '../../models/materia-prima.model';
import { MateriaPrimaService } from '../../services/materia-prima.service';
import { KpisCatalogoComponent } from '../../../../shared/components/kpis-catalogo/kpis-catalogo.component';
import { contarCatalogo } from '../../../../shared/utils/conteo-catalogo';
import { MateriaPrimaFormularioComponent } from '../materia-prima-formulario/materia-prima-formulario.component';

/**
 * Listado de materias primas (HU-08). Columnas reales de la tabla
 * `materias_primas` + `cantidadDisponible` del inventario. Lectura para
 * ADMIN/PRODUCCION/COMPRAS/CONSULTA; escritura solo ADMIN.
 */
@Component({
  selector: 'app-materia-prima-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    CurrencyPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TablaPaginadaComponent,
    TablaColumnaDirective,
    SiRolDirective,
    KpisCatalogoComponent
  ],
  templateUrl: './materia-prima-lista.component.html',
  styleUrl: './materia-prima-lista.component.scss'
})
export class MateriaPrimaListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly materiaPrimaService = inject(MateriaPrimaService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'nombre', titulo: 'Nombre', ordenable: true },
    { id: 'unidad', titulo: 'Unidad', ordenable: false },
    { id: 'stockMinimo', titulo: 'Stock mín.', ordenable: true },
    { id: 'disponible', titulo: 'Disponible', ordenable: false },
    { id: 'costoUnitario', titulo: 'Costo unit.', ordenable: true },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'acciones', titulo: '', ordenable: false }
  ];

  readonly filtros = this.fb.group({
    nombre: this.fb.nonNullable.control(''),
    activo: this.fb.control<boolean | null>(true)
  });

  readonly materias = signal<MateriaPrima[]>([]);
  readonly total = signal(0);
  readonly kpiTotal = signal(0);
  readonly kpiActivos = signal(0);
  readonly kpiInactivos = signal(0);
  readonly cargandoKpis = signal(true);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  private readonly ordenCampo = signal('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');

  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.peticion().pipe(
            catchError((error: HttpErrorResponse) => {
              this.materias.set([]);
              this.total.set(0);
              this.error.set(this.mensajeError(error));
              this.cargando.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(respuesta => {
        this.materias.set(respuesta.content);
        this.total.set(respuesta.totalElements);
        this.cargando.set(false);
        this.error.set(null);
      });

    this.filtros.controls.nombre.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar();
      });

    this.filtros.controls.activo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar();
      });

    this.recargar();
  }

  recargar(): void {
    this.recargar$.next();
    this.cargarKpis();
  }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);
    contarCatalogo(activo =>
      this.materiaPrimaService.listar({ page: 0, size: 1, activo })
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ total, activos, inactivos }) => {
        this.kpiTotal.set(total);
        this.kpiActivos.set(activos);
        this.kpiInactivos.set(inactivos);
        this.cargandoKpis.set(false);
      });
  }

  onPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.recargar();
  }

  onOrden(orden: Sort): void {
    this.ordenCampo.set(orden.direction ? orden.active : '');
    this.ordenDireccion.set(orden.direction);
    this.pagina.set(0);
    this.recargar();
  }

  abrirFormulario(materia?: MateriaPrima): void {
    this.dialog
      .open(MateriaPrimaFormularioComponent, {
        data: { materia },
        width: '600px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        disableClose: true
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (resultado === true) {
          this.notificacion.exito(
            materia
              ? 'Materia prima actualizada correctamente.'
              : 'Materia prima registrada correctamente.'
          );
          this.recargar();
        }
      });
  }

  cambiarEstado(materia: MateriaPrima): void {
    const activar = !materia.activo;

    const data: ConfirmarDialogData = {
      titulo: activar ? 'Activar materia prima' : 'Desactivar materia prima',
      mensaje: activar
        ? `¿Activar «${materia.nombre}»? Volverá a estar disponible para compras y recetas.`
        : `¿Desactivar «${materia.nombre}»? Dejará de usarse en recetas nuevas y no se comprará, pero su stock actual se conserva.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar
    };

    this.dialog
      .open(ConfirmarDialogComponent, {
        data,
        width: '460px',
        autoFocus: 'dialog'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (!confirmado) {
          return;
        }

        this.materiaPrimaService
          .cambiarEstado(materia.idMateriaPrima, activar)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notificacion.exito(
                activar
                  ? 'Materia prima activada.'
                  : 'Materia prima desactivada.'
              );
              this.recargar();
            },
            error: (error: HttpErrorResponse) => {
              if (error.status === 409) {
                this.notificacion.advertencia(this.mensajeError(error));
                return;
              }
              this.notificacion.error(this.mensajeError(error));
            }
          });
      });
  }

  private peticion() {
    const { nombre, activo } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const direccion = this.ordenDireccion();

    return this.materiaPrimaService.listar({
      page: this.pagina(),
      size: this.tamano(),
      nombre: nombre.trim() || undefined,
      activo: activo ?? undefined,
      sort:
        campo && (direccion === 'asc' || direccion === 'desc')
          ? `${campo},${direccion}`
          : undefined
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as { message?: string } | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cargar el listado de materias primas.';
  }
}
